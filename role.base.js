const roomUtils = require("utils.room");
const creepsUtils = require("utils.creeps");

var roleBase = {
    harvester: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];
            const fillerList = _.filter(Game.creeps, (creep) => creep.room.name == room.name && creep.memory.role == 'filler');

            const bodyPart = creepsUtils.genbodyHarvester(maxEnergy, totalEnergy, fillerList.length == 0);
            creepMemory.working = false;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
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
            creep.registerMove(target.pos);
        },
        source: function (creep) {
            const target = creep.pos.findClosestByRange(FIND_SOURCES, {
                filter: source => source.id == creep.memory.sourceTarget
            });
            if (creep.harvest(target) != OK) {
                creep.say('💤');
            }
        },
        target: function (creep) {
            const links = creep.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: structure => structure.structureType == STRUCTURE_LINK
            });

            const storages = creep.room.find(FIND_STRUCTURES, {
                filter: structure => structure.structureType == STRUCTURE_STORAGE
            });

            const containers = creep.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: structure => structure.structureType == STRUCTURE_CONTAINER
            });

            const constructionSite = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3)[0];

            // 在旁边构建Links
            if (!constructionSite && links.length == 0) {
                const source = Game.getObjectById(creep.memory.sourceTarget);

                const dx = source.pos.x - creep.pos.x
                const dy = source.pos.y - creep.pos.y

                const linkX = creep.pos.x - dx;
                const linkY = creep.pos.y - dy;

                const linkPost = new RoomPosition(linkX, linkY, creep.room.name);
                linkPost.createConstructionSite(STRUCTURE_LINK);
            }

            // 在旁边构建Containers
            const maxContainers = storages.length > 0 ? 1 : 1;
            if (!constructionSite && containers.length < maxContainers && links.length == 0) {
                creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
            }

            if (constructionSite) {
                creep.build(constructionSite);
                return;
            }

            var target = creep.pos.findInRange(FIND_STRUCTURES, 3)
                .filter(structure => structure.structureType == STRUCTURE_LINK &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            target = target.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep))[0];

            if (!target) {
                var containersInRange = creep.pos.findInRange(FIND_STRUCTURES, 3)
                    .filter(structure => structure.structureType == STRUCTURE_CONTAINER
                        && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                containersInRange.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));

                target = containersInRange[0];
            }

            if (!target) {
                return;
            }

            if (target.hits < target.hitsMax) {
                creep.repair(target);
                return;
            }

            const result = creep.transfer(target, RESOURCE_ENERGY);
            if (result == ERR_NOT_IN_RANGE) {
                creep.registerMove(target.pos);
            } else if (result != OK) {
                creep.say('💤');
            }
        }
    },
    filler: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = creepsUtils.genbodyFiller(maxEnergy, totalEnergy, true);
            creepMemory.working = false;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
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
            if (creepsUtils.pickupDroppedResource(creep, true)) {
                return;
            }

            var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            if (!target) {
                target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: structure => (
                        structure.structureType == STRUCTURE_CONTAINER
                    ) && structure.store[RESOURCE_ENERGY] > 0
                });
            }

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.registerMove(target.pos);
            } else if (withdrawResult != OK) {
                creep.say('💤');
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

            const resourceList = Object.keys(creep.store).filter(resource => resource != RESOURCE_ENERGY);
            if (structures && resourceList && resourceList.length > 0) {
                for (resource in resourceList) {
                    if (creep.transfer(structures, resource) == ERR_NOT_IN_RANGE) {
                        creep.registerMove(structures.pos);
                    }
                }
            }

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
                    creep.registerMove(structures.pos);
                }
            } else {
                creep.say('💤');
                structures = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_EXTENSION
                });
                if (structures) {
                    creep.registerMove(structures.pos);
                }
            }
        }
    },
    builder: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = creepsUtils.genbodyWorker(maxEnergy, totalEnergy, false);
            creepMemory.working = false;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
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
            if (creepsUtils.pickupDroppedResource(creep, false)) {
                return;
            }

            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.registerMove(target.pos);
            }
            if (withdrawResult == ERR_NOT_ENOUGH_RESOURCES) {
                const backTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_SPAWN
                });
                creep.registerMove(backTarget.pos);
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

            if (buildTarget) {
                if (creep.build(buildTarget) == ERR_NOT_IN_RANGE) {
                    creep.registerMove(buildTarget.pos);
                }
            } else {
                roleBase.upgrader.work(creep);
                // creep.memory.role = 'upgrader';
            }
        }
    },
    upgrader: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = creepsUtils.genbodyWorker(maxEnergy, totalEnergy, false);
            creepMemory.working = false;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            var maxController = room.controller.level == 8;
            var storages = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_STORAGE });
            if (!storages || storages.length == 0) {
                return !maxController;
            } else {
                return !maxController || storages[0].store[RESOURCE_ENERGY] > 5000000;
            }
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
            if (creepsUtils.pickupDroppedResource(creep, false)) {
                return;
            }

            var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            if (creep.room.memory.controllerLink) {
                target = Game.getObjectById(creep.room.memory.controllerLink);
            }

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.registerMove(target.pos);
            }
        },
        target: function (creep) {
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.registerMove(creep.room.controller.pos);
            }
        }
    },
    repairer: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = creepsUtils.genbodyWorker(maxEnergy, totalEnergy, false);
            creepMemory.working = false;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
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
            if (creepsUtils.pickupDroppedResource(creep, false)) {
                return;
            }

            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.registerMove(target.pos);
            }
            if (withdrawResult == ERR_NOT_ENOUGH_RESOURCES) {
                const backTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_SPAWN
                });
                creep.registerMove(backTarget.pos);
            }
        },
        target: function (creep) {
            var repairTarget = creep.room.find(FIND_STRUCTURES, {
                filter: structure => structure.structureType != STRUCTURE_WALL
                    && structure.structureType != STRUCTURE_RAMPART
                    && structure.hits < structure.hitsMax
            }).reduce((min, structure) => {
                if (min == null) { return structure }
                return structure.hits < min.hits ? structure : min;
            }, null);

            if (!repairTarget) {
                repairTarget = creep.room.find(FIND_STRUCTURES, {
                    filter: structure => (structure.structureType == STRUCTURE_WALL && structure.hits <= 10000000)
                        || (structure.structureType == STRUCTURE_RAMPART && structure.hits <= 10000000)
                }).reduce((min, structure) => {
                    if (min == null) { return structure }
                    return structure.hits < min.hits ? structure : min;
                }, null);
            }

            if (repairTarget) {
                if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
                    creep.registerMove(repairTarget.pos);
                }
            } else {
                roleBase.upgrader.work(creep);
                // creep.memory.role = 'upgrader';
            }
        }
    }
};

module.exports = roleBase;