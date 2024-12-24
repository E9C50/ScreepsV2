const creepsUtils = require("utils.creeps");
const roleBase = require("role.base");
const settings = require("base.settings");

var roleAdvanced = {
    rHarvester: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns.filter(spawn => !spawn.spawning)[0];
            const harvesters = _.filter(Game.creeps, (creep) => creep.room.name == room.name && creep.memory.role == 'harvester');
            const bodyConfigs = settings.bodyConfigs.rHarvester;
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
                creep.say('🛜⛏️');
            } else {
                this.target(creep);
                creep.say('📦');
            }
        },
        source: function (creep) {
            if (creepsUtils.pickupDroppedResource(creep, false)) {
                return;
            }
            const target = Game.getObjectById(creep.memory.sourceTarget);
            if (creep.room.name != creep.memory.targetRoom) {
                creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom));
                return;
            }
            if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(Game.getObjectById(creep.memory.sourceTarget));
            }
        },
        target: function (creep) {
            if (creep.room.name != creep.memory.room) {
                const constructionSites = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
                if (constructionSites) {
                    if (creep.build(constructionSites) == ERR_NOT_IN_RANGE) creep.moveTo(constructionSites);
                    return;
                }

                const needRepair = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: structure => structure.structureType == STRUCTURE_ROAD
                        && structure.hits < structure.hitsMax
                });
                if (needRepair) {
                    if (creep.repair(needRepair) == ERR_NOT_IN_RANGE) creep.moveTo(needRepair);
                    return;
                }

                creep.moveTo(new RoomPosition(25, 25, creep.memory.room));
                return;
            }

            var targets = [creep.room.storage].concat(creep.room.links);
            targets = targets.filter(target => target.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            const target = targets.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep))[0];
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        }
    },
    rFiller: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns.filter(spawn => !spawn.spawning)[0];
            const bodyConfigs = settings.bodyConfigs.filler;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            creepMemory.room = room.name;

            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
            if (creepsUtils.pickupDroppedResource(creep, false, 3)) {
                return;
            }
            // 去目标房间搬运物资
            if (creep.store.getFreeCapacity() > 0 && creep.pos.roomName != creep.memory.targetRoom) {
                creep.say('🈳');
                creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom));
                return;
            }

            if (creep.pos.roomName == creep.memory.targetRoom && creep.store.getFreeCapacity() > 0) {
                creep.say('🈳');

                var canWithdrawTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: structure => structure.store && Object.keys(structure.store).length > 1
                });

                if (!canWithdrawTarget) {
                    canWithdrawTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: structure => structure.store && Object.keys(structure.store).length > 0
                    });
                }

                // canWithdrawTarget.sort(function (a, b) {
                //     // order是规则bai  objs是需要排序的数du组
                //     var order = [RESOURCE_PURIFIER, RESOURCE_KEANIUM, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM];
                //     return order.indexOf(a) - order.indexOf(b);
                // });

                if (!canWithdrawTarget || canWithdrawTarget.length == 0) {
                    Memory.jobs.remoteFiller[creep.memory.room] = Memory.jobs.remoteFiller[creep.memory.room]
                        .filter(item => item != creep.memory.targetRoom);
                    creep.suicide();
                }

                if (canWithdrawTarget) {
                    var withdrawResources = Object.keys(canWithdrawTarget.store);

                    withdrawResources.sort(function (a, b) {
                        var order = [
                            'accessKey', 'accessKey', 'cpuUnlock', 'cpuUnlock', 'organism', 'essence', 'organoid', 'muscle', 'emanation', 'device',
                            'machine', 'circuit', 'microchip', 'spirit', 'hydraulics', 'tissue', 'frame', 'extract', 'transistor', 'phlegm', 'fixtures',
                            'concentrate', 'tube', 'switch', 'pixel', 'pixel', 'metal', 'cell', 'condensate', 'wire', 'liquid', 'alloy', 'ghodium_melt',
                            'crystal', 'silicon', 'mist', 'purifier', 'XKHO2', 'composite', 'biomass', 'power', 'XZH2O', 'keanium_bar', 'XGH2O', 'XZHO2',
                            'XKH2O', 'XGHO2', 'GH2O', 'GH', 'XUH2O', 'reductant', 'LH2O', 'GHO2', 'XLH2O', 'KH2O', 'XUHO2', 'G', 'utrium_bar',
                            'lemergium_bar', 'KHO2', 'UH2O', 'KH', 'LH', 'UO', 'ZHO2', 'ZK', 'X', 'K', 'H', 'zynthium_bar', 'GO', 'oxidant', 'UL',
                            'battery', 'XLHO2', 'L', 'U', 'ops', 'Z', 'LHO2', 'O', 'energy', 'LO', 'KO', 'UH', 'ZH', 'ZO', 'accessKey', 'cpuUnlock',
                            'organism', 'essence', 'organoid', 'muscle', 'emanation', 'device', 'machine', 'circuit', 'microchip', 'spirit', 'hydraulics',
                            'tissue', 'frame', 'extract', 'transistor', 'phlegm', 'fixtures', 'concentrate', 'tube', 'switch', 'pixel', 'metal', 'cell',
                            'condensate', 'wire', 'liquid', 'alloy', 'ghodium_melt', 'crystal', 'silicon', 'mist', 'purifier', 'XKHO2', 'composite',
                            'biomass', 'power', 'XZH2O', 'keanium_bar', 'XGH2O', 'XZHO2', 'XKH2O', 'XGHO2', 'GH2O', 'GH', 'XUH2O', 'reductant', 'LH2O',
                            'GHO2', 'XLH2O', 'KH2O', 'XUHO2', 'G', 'utrium_bar', 'lemergium_bar', 'KHO2', 'UH2O', 'KH', 'LH', 'UO', 'ZHO2', 'ZK',
                            'X', 'K', 'H', 'zynthium_bar', 'GO', 'oxidant', 'UL', 'battery', 'XLHO2', 'L', 'U', 'ops', 'Z', 'LHO2', 'O', 'energy',
                            'LO', 'KO', 'UH', 'ZH', 'ZO', 'ZH2O', 'UHO2', 'OH'
                        ]

                        return order.indexOf(a) - order.indexOf(b);
                    });

                    if (creep.withdraw(canWithdrawTarget, withdrawResources[0]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(canWithdrawTarget);
                    }
                    return;
                }
            }

            // 回家！！！
            if (creep.pos.roomName != creep.memory.room && creep.store.getFreeCapacity() == 0) {
                creep.say('📦');
                creep.moveTo(new RoomPosition(25, 25, creep.memory.room));
                return;
            }

            if (creep.pos.roomName == creep.memory.room && creep.store.getUsedCapacity() > 0) {
                creep.say('📦');
                const dropTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: structure => (structure.structureType == STRUCTURE_CONTAINER
                        || structure.structureType == STRUCTURE_STORAGE || structure.structureType == STRUCTURE_SPAWN
                        || structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_TOWER
                        || structure.structureType == STRUCTURE_LINK) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (creep.transfer(dropTarget, Object.keys(creep.store)[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropTarget);
                }
                return;
            }
        }
    },
    miner: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns.filter(spawn => !spawn.spawning)[0];
            const bodyConfigs = settings.bodyConfigs.rHarvester;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            creepMemory.working = false;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            const mineral = room.mineral;
            const target = room.storage;
            return target.store[mineral.mineralType] <= 100000
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
            if (creep.transfer(creep.room.storage, creep.room.mineral.mineralType) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.storage);
            }
        }
    },
    manager: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns.filter(spawn => !spawn.spawning)[0];
            const bodyConfigs = settings.bodyConfigs.manager;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, true);
            creepMemory.working = false;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            return room.memory.centerLink != null;
        },
        work: function (creep) {
            creep.memory.dontPullMe = true;
            const centerLink = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.room.memory.centerLink
            });

            var managerPos = creep.room.memory.managerPos;
            if (managerPos) managerPos = new RoomPosition(managerPos.x, managerPos.y, managerPos.roomName);
            if (managerPos && !creep.pos.isEqualTo(managerPos)) {
                creep.moveTo(managerPos);
                return;
            } else {
                if (!creep.pos.isNearTo(creep.room.storage)) {
                    creep.moveTo(creep.room.storage);
                    return;
                }
                if (!creep.pos.isNearTo(centerLink)) {
                    creep.moveTo(centerLink);
                    return;
                }
            }

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
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns.filter(spawn => !spawn.spawning)[0];
            // const bodyConfigs = settings.bodyConfigs.claimer;
            // const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            const bodyPart = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
            if (Game.rooms[creepMemory.targetRoom] && Game.rooms[creepMemory.targetRoom].controller.my) {
                bodyPart.pop(CLAIM);
                bodyPart.concat([WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]);
            }

            // const creepName = 'Claimer_' + room.name + '_' + creepMemory.targetRoom;
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
                const signResult = creep.signController(roomController, creep.memory.signText);
                if (signResult == ERR_NOT_IN_RANGE) {
                    creep.moveTo(roomController);
                    return;
                } else if (signResult == OK) {
                    return;
                }
            }

            const roomSpawn = targetRoom.spawns[0];
            if (roomSpawn) {
                delete Memory.jobs.claiming[targetRoom.name];
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
            const flag = Game.flags.RS;
            if (flag) {
                const createResult = creep.room.createConstructionSite(flag.pos, STRUCTURE_SPAWN);
                if (createResult == OK) flag.remove();
            }

            var constructionSites = targetRoom.constructionSites.filler(structure => structure.structureType == STRUCTURE_SPAWN);
            if (!constructionSites || constructionSites.length == 0) {
                constructionSites = targetRoom.constructionSites;
            }

            if (constructionSites && constructionSites.length > 0) {
                if (creep.build(constructionSites[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(constructionSites[0]);
                }
            }
        }
    },
    reserver: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns.filter(spawn => !spawn.spawning)[0];
            const bodyConfigs = settings.bodyConfigs.reserver;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            // const creepName = 'Reserver_' + room.name + '_' + creepMemory.targetRoom;
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