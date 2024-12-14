const roomUtils = require("utils.room");
const creepsUtils = require("utils.creeps");

var roleAdvanced = {
    miner: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];
            const bodyPart = creepsUtils.genbodyWorker(maxEnergy, totalEnergy, false);
            creepMemory.working = false;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            const mineral = room.memory.mineral;
            const target = room.find(FIND_STRUCTURES, {
                filter: structure => structure.structureType == STRUCTURE_STORAGE
            })[0];
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
            if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                creep.registerMove(target);
            }
        },
        target: function (creep) {
            const target = creep.room.find(FIND_STRUCTURES, {
                filter: structure => structure.structureType == STRUCTURE_STORAGE
            })[0];

            const mineral = creep.room.memory.mineral;
            const result = creep.transfer(target, mineral.mineralType);
            if (result == ERR_NOT_IN_RANGE) {
                creep.registerMove(target.pos);
            } else if (result != OK) {
                creep.say('💤');
            }
        }
    },
    manager: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = creepsUtils.genbodyFiller(maxEnergy, totalEnergy, true);
            creepMemory.working = false;
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
            if (!creep.pos.isEqualTo(roomCenter.x, roomCenter.y)) {
                creep.registerMove(new RoomPosition(roomCenter.x, roomCenter.y, roomCenter.roomName));
                return;
            }

            const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.structureType == STRUCTURE_STORAGE
            });
            const controllerLink = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.room.memory.controllerLink
            });

            if (creep.room.memory.centerLinkSentMode) {
                if (creep.store[RESOURCE_ENERGY] > 0) {
                    creep.transfer(centerLink, RESOURCE_ENERGY);
                } else {
                    creep.withdraw(storage, RESOURCE_ENERGY);
                }
            } else {
                if (creep.store[RESOURCE_ENERGY] > 0) {
                    creep.transfer(storage, RESOURCE_ENERGY);
                } else {
                    creep.withdraw(centerLink, RESOURCE_ENERGY);
                }
            }

        }
    },
};

module.exports = roleAdvanced;