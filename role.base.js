const roomUtils = require("utils.room");
const creepsUtils = require("utils.creeps");
const { filter } = require("lodash");

function genbodyHarvester(maxEnergy, totalEnergy, forceSpawn) {
    var energy = forceSpawn ? totalEnergy : maxEnergy;
    energy = Math.max(300, energy);
    energy -= energy % 50;
    var bodyParts = [];

    bodyParts.push(MOVE);
    bodyParts.push(CARRY);
    energy -= BODYPART_COST.move;
    energy -= BODYPART_COST.carry;

    if (energy % 100 == 50) {
        bodyParts.push(MOVE);
        energy -= BODYPART_COST.move;
    }

    var workCount = parseInt(energy / BODYPART_COST.work);
    workCount = Math.min(workCount, 4);
    for (let i = 0; i < workCount; i++) {
        bodyParts.push(WORK);
    }

    return bodyParts;
}

function genbodyCarryer(maxEnergy, totalEnergy, forceSpawn) {
    var energy = forceSpawn ? totalEnergy : maxEnergy;
    energy = Math.max(300, energy);
    energy -= energy % 50;
    var bodyParts = [];

    var totalPartCount = energy / 50;
    if (totalPartCount % 2 == 1) {
        totalPartCount -= 1;
    }

    var singlePartCount = totalPartCount / 2;

    for (let i = 0; i < singlePartCount; i++) {
        bodyParts.push(MOVE);
        bodyParts.push(CARRY);
    }

    return bodyParts;
}

function genbodyWorker(maxEnergy, totalEnergy, forceSpawn) {
    var energy = forceSpawn ? totalEnergy : maxEnergy;
    energy = Math.max(300, energy);
    energy -= energy % 50;
    var bodyParts = [];

    bodyParts.push(CARRY);
    bodyParts.push(MOVE);
    energy -= BODYPART_COST.carry;
    energy -= BODYPART_COST.move;

    while (energy >= 150) {
        bodyParts.push(WORK);
        bodyParts.push(MOVE);
        energy -= BODYPART_COST.work;
        energy -= BODYPART_COST.move;
    }

    if (energy == 100) {
        bodyParts.push(CARRY);
        bodyParts.push(MOVE);
        energy -= BODYPART_COST.carry;
        energy -= BODYPART_COST.move;
    }
    return bodyParts;
}

var roleBase = {
    harvester: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];
            const carryerList = _.filter(Game.creeps, (creep) => creep.room.name == room.name && creep.memory.role == 'carryer');

            const bodyPart = genbodyHarvester(maxEnergy, totalEnergy, carryerList.length == 0);
            creepMemory.working = false;
            spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
            const target = creep.pos.findClosestByRange(FIND_SOURCES, {
                filter: source => source.id == creep.memory.sourceTarget
            });

            if (!creep.pos.isNearTo(target)) {
                this.prepar(creep);
                return;
            }

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
        prepar: function (creep) {
            const target = creep.pos.findClosestByRange(FIND_SOURCES, {
                filter: source => source.id == creep.memory.sourceTarget
            });
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
        },
        source: function (creep) {
            const target = creep.pos.findClosestByRange(FIND_SOURCES, {
                filter: source => source.id == creep.memory.sourceTarget
            });
            creep.harvest(target);
        },
        target: function (creep) {
            const links = creep.pos.findInRange(FIND_STRUCTURES, 5, {
                filter: structure => structure.structureType == STRUCTURE_LINK
            });

            const containers = creep.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: structure => structure.structureType == STRUCTURE_CONTAINER
            });

            const constructionSite = creep.pos.findInRange(LOOK_CONSTRUCTION_SITES, 3)
                .filter(structure => structure.structureType == STRUCTURE_CONTAINER)[0];

            if (!containers[0] && !constructionSite && containers.length < 1 && links.length == 0) {
                creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
            }

            if (constructionSite) {
                creep.build(constructionSite);
                return;
            }

            var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.structureType == STRUCTURE_LINK &&
                    structure.store.getFreeCapacity() > 0
            });

            if (!target) {
                target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: structure => structure.structureType == STRUCTURE_CONTAINER
                        && structure.store.getFreeCapacity() > 0
                });
            }

            if (!target) {
                return;
            }

            if (target.hits < target.hitsMax) {
                creep.repair(target);
                return;
            }

            creep.transfer(target, RESOURCE_ENERGY);
        }
    },
    carryer: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = genbodyCarryer(maxEnergy, totalEnergy, true);
            creepMemory.working = false;
            spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
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
            if (creepsUtils.pickupDroppedResource(creep)) {
                return;
            }

            var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { maxRooms: 1, visualizePathStyle: { stroke: '#ffaa00' } });
            }
            if (withdrawResult == ERR_NOT_ENOUGH_RESOURCES) {
                const backTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_SPAWN
                });
                creep.moveTo(backTarget, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
            }
        },
        target: function (creep) {

            // 优先往Storage搬
            var structures = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType == STRUCTURE_STORAGE
                        && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });

            if (structures && creep.memory.sourceTarget == structures.id) {
                structures = null;
            }

            // 然后查找资源不足的Spawn和Extension
            if (!structures) {
                structures = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: structure => {
                        return (structure.structureType == STRUCTURE_EXTENSION
                            || structure.structureType == STRUCTURE_SPAWN)
                            && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
            }

            // 其次查找Tower（若为战斗模式，强制优先Tower） 
            if (!structures || roomUtils.isFighting(creep.room)) {
                structures = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType == STRUCTURE_TOWER
                            && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 100;
                    }
                });
            }

            // 转移资源
            if (structures) {
                if (creep.transfer(structures, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(structures, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                structures = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_EXTENSION
                });
                creep.moveTo(structures, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    },
    builder: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = genbodyWorker(maxEnergy, totalEnergy, false);
            creepMemory.working = false;
            spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            var constructionSiteCount = room.find(FIND_CONSTRUCTION_SITES).length;
            var needBuilder = constructionSiteCount > 0;
            return needBuilder;
        },
        work: function (creep) {
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
            if (creepsUtils.pickupDroppedResource(creep)) {
                return;
            }

            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { maxRooms: 1, visualizePathStyle: { stroke: '#ffaa00' } });
            }
            if (withdrawResult == ERR_NOT_ENOUGH_RESOURCES) {
                const backTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_SPAWN
                });
                creep.moveTo(backTarget, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
            }
        },
        target: function (creep) {
            // 获取优先建造的建筑
            var buildTarget = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
                filter: structure => structure.structureType === STRUCTURE_CONTAINER
            });
            if (!buildTarget) {
                buildTarget = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
                    filter: structure => structure.structureType === STRUCTURE_EXTENSION
                });
            }
            if (!buildTarget) {
                buildTarget = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
                    filter: structure => structure.structureType === STRUCTURE_TOWER
                });
            }
            // 其次获取其他建筑
            if (!buildTarget) {
                buildTarget = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
            }

            // 获取需要修复的血量最低的建筑
            var repairTarget = creep.room.find(FIND_STRUCTURES, {
                filter: structure => (structure.structureType == STRUCTURE_WALL && structure.hits <= 100000)
                    || (structure.structureType == STRUCTURE_RAMPART && structure.hits <= 100000)
            }).reduce((min, structure) => {
                if (min == null) { return structure }
                return structure.hits < min.hits ? structure : min;
            }, null);

            if (buildTarget) {
                // 优先建造
                if (creep.build(buildTarget) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(buildTarget, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                // 其次修复
                if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(repairTarget, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
                }
            }


        }
    },
    upgrader: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = genbodyWorker(maxEnergy, totalEnergy, false);
            creepMemory.working = false;
            spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            var storages = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_STORAGE });
            return storages && storages.length > 0 && storages[0].store[RESOURCE_ENERGY] > 50000;
        },
        work: function (creep) {
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
            if (creepsUtils.pickupDroppedResource(creep)) {
                return;
            }

            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { maxRooms: 1, visualizePathStyle: { stroke: '#ffaa00' } });
            }
            if (withdrawResult == ERR_NOT_ENOUGH_RESOURCES) {
                const backTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_SPAWN
                });
                creep.moveTo(backTarget, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
            }
        },
        target: function (creep) {
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    },
    repairer: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = genbodyWorker(maxEnergy, totalEnergy, false);
            creepMemory.working = false;
            spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
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
            if (creepsUtils.pickupDroppedResource(creep)) {
                return;
            }

            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { maxRooms: 1, visualizePathStyle: { stroke: '#ffaa00' } });
            }
            if (withdrawResult == ERR_NOT_ENOUGH_RESOURCES) {
                const backTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_SPAWN
                });
                creep.moveTo(backTarget, { maxRooms: 1, visualizePathStyle: { stroke: '#ffffff' } });
            }
        },
        target: function (creep) {

        }
    }
};

module.exports = roleBase;