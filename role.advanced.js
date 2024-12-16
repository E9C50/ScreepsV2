const roomUtils = require("utils.room");
const creepsUtils = require("utils.creeps");
const roleBase = require("role.base");
const settings = require("base.settings");

var roleAdvanced = {
    remoteHarvester: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns[0];
            const harvesters = _.filter(Game.creeps, (creep) => creep.room.name == room.name && creep.memory.role == 'harvester');
            const bodyConfigs = settings.bodyConfigs.remoteHarvester;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, harvesters.length == 0);
            creepMemory.working = false;
            creepMemory.room = room.name;

            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
            // 调整工作模式
            if (!creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
                creep.memory.working = true;
            }
            if (creep.memory.working && creep.store.getFreeCapacity() == 0) {
                creep.memory.working = false;
            }

            if (creep.memory.working) {
                this.source(creep);
            } else {
                this.target(creep);
            }
        },
        source: function (creep) {
            if (creepsUtils.pickupDroppedResource(creep, false)) {
                return;
            }
            const target = Game.getObjectById(creep.memory.sourceTarget);
            if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(Game.getObjectById(creep.memory.sourceTarget));
            }
        },
        target: function (creep) {
            if (creep.room.name != creep.memory.room) {
                creep.moveTo(new RoomPosition(25, 25, creep.memory.room));
                return;
            }

            var targets = [creep.room.storage]
            if (creep.room.memory.sideLinks) {
                targets = targets.concat(creep.room.memory.sideLinks.map(sideLinkId => Game.getObjectById(sideLinkId)));
            }
            const target = targets.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep))[0];
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        }
    },
    miner: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns[0];
            const bodyConfigs = settings.bodyConfigs.remoteHarvester;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            creepMemory.working = false;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            const mineral = room.mineral;
            const target = room.storage;
            return target.store[mineral.mineralType] <= 1000000
        },
        work: function (creep) {
            // 调整工作模式
            if (!creep.memory.working && creep.store.getUsedCapacity() == 0) {
                creep.memory.working = true;
            }
            if (creep.memory.working && creep.store.getFreeCapacity() == 0) {
                creep.memory.working = false;
            }

            if (creep.memory.working) {
                this.source(creep);
            } else {
                this.target(creep);
            }
        },
        source: function (creep) {
            const target = Game.getObjectById(creep.memory.sourceTarget);
            if (!creep.pos.isNearTo(target)) {
                creep.moveTo(target);
                return;
            }
            creep.harvest(target);
        },
        target: function (creep) {
            const mineral = creep.room.mineral;
            const result = creep.transfer(creep.room.storage, mineral.mineralType);
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.storage);
            } else if (result != OK) {
                creep.say('💤');
            }
        }
    },
    manager: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns[0];
            const bodyConfigs = settings.bodyConfigs.manager;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, true);
            creepMemory.working = false;
            creepMemory.dontPullMe = true;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            return room.memory.centerLink != null;
        },
        work: function (creep) {
            const centerLink = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.room.memory.centerLink
            });
            const roomCenter = creep.room.memory.roomCenter;
            if (roomCenter && !creep.pos.isEqualTo(roomCenter.x, roomCenter.y)) {
                const roomCenterPos = new RoomPosition(roomCenter.x, roomCenter.y, roomCenter.roomName)
                // creep.moveTo(roomCenterPos);
                creep.moveTo(roomCenterPos);
                return;
            }

            const controllerLink = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.room.memory.controllerLink
            });

            if (creep.room.memory.centerLinkSentMode) {
                if (creep.store[RESOURCE_ENERGY] > 0) {
                    creep.transfer(centerLink, RESOURCE_ENERGY);
                } else {
                    creep.withdraw(creep.room.storage, RESOURCE_ENERGY);
                }
            } else {
                if (creep.store[RESOURCE_ENERGY] > 0) {
                    creep.transfer(creep.room.storage, RESOURCE_ENERGY);
                } else {
                    creep.withdraw(centerLink, RESOURCE_ENERGY);
                }
            }
        }
    },
    claimer: {
        spawn: function (room, creepMemory) {
            const spawn = room.spawns[0];
            const bodyConfigs = settings.bodyConfigs.claimer;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            const creepName = 'Claimer_' + room.name + '_' + creepMemory.targetRoom;
            creepMemory.working = false;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
            if (creep.room.name != creep.memory.targetRoom) {
                creep.say('🚩');
                const targetRoomPos = new RoomPosition(25, 25, creep.memory.targetRoom)
                creep.moveTo(targetRoomPos);
                return;
            }

            const targetRoom = Game.rooms[creep.memory.targetRoom];
            const roomController = targetRoom.controller;

            if (!roomController.my && !creep.pos.isNearTo(roomController)) {
                creep.say('🚩');
                creep.moveTo(roomController);
                return;
            }

            if (!roomController.my) {
                creep.claimController(roomController);
                return;
            }

            if (!creep.memory.signText) {
                creep.memory.signText = settings.defaultConrtollerSign;
            }

            if (!roomController.sign || roomController.sign.username != creep.owner.username || roomController.sign.text != creep.memory.signText) {
                creep.signController(roomController, creep.memory.signText);
                return;
            }

            const roomSpawn = targetRoom.spawns[0];
            if (roomSpawn) {
                delete Memory.claiming[targetRoom.name];
                const sourceTarget = targetRoom.sources[0];
                creep.memory.sourceTarget = sourceTarget.id;
                roleBase.harvester.work(creep);
                return;
            }

            // 调整工作模式
            if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
                creep.memory.working = false;
            }
            if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
                creep.memory.working = true;
            }

            if (creep.memory.working) {
                this.target(creep);
            } else {
                this.source(creep);
            }
        },
        source: function (creep) {
            const target = creep.room.sources[0];
            if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        },
        target: function (creep) {
            const targetRoom = Game.rooms[creep.memory.targetRoom];
            const flags = targetRoom.find(FIND_FLAGS, { filter: flag => flag.name == 'RS' });
            if (flags && flags.length > 0) {
                const createResult = creep.room.createConstructionSite(flags[0].pos, STRUCTURE_SPAWN);
                if (createResult == OK) flags[0].remove();
            }

            const constructionSites = targetRoom.find(FIND_CONSTRUCTION_SITES);
            if (constructionSites && constructionSites.length > 0) {
                if (creep.build(constructionSites[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(constructionSites[0]);
                }
            }
        }
    },
    reserver: {
        spawn: function (room, creepMemory) {
            const spawn = room.spawns[0];
            const bodyPart = [CLAIM, CLAIM, MOVE, MOVE];
            const creepName = 'Reserver_' + room.name + '_' + creepMemory.targetRoom;
            creepMemory.working = false;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
            if (creep.room.name != creep.memory.targetRoom) {
                creep.say('📍');
                const targetRoomPos = new RoomPosition(25, 25, creep.memory.targetRoom)
                creep.moveTo(targetRoomPos);
                return;
            }

            const targetRoom = Game.rooms[creep.memory.targetRoom];
            const roomController = targetRoom.controller;

            if (!roomController.my && !creep.pos.isNearTo(roomController)) {
                creep.say('📍');
                creep.moveTo(roomController);
                return;
            }

            creep.reserveController(roomController);
        }
    },
};

module.exports = roleAdvanced;