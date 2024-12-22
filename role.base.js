const roomUtils = require("utils.room");
const creepsUtils = require("utils.creeps");
const settings = require("base.settings");

var roleBase = {
    harvester: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns[0];
            const harvesters = _.filter(Game.creeps, (creep) => creep.room.name == room.name && creep.memory.role == 'harvester');
            const bodyConfigs = settings.bodyConfigs.harvester;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, harvesters.length == 0);
            creepMemory.working = false;
            creepMemory.room = room.name;

            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
            const target = Game.getObjectById(creep.memory.sourceTarget);

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
            creep.say('⛏️');
            creep.moveTo(Game.getObjectById(creep.memory.sourceTarget));
        },
        source: function (creep) {
            if (creepsUtils.pickupDroppedResource(creep, false, 1)) {
                return;
            }
            creep.harvest(Game.getObjectById(creep.memory.sourceTarget));
        },
        target: function (creep) {
            const links = creep.room.links.filter(item => item.pos.getRangeTo(creep) <= 2);
            const containers = creep.room.containers.filter(item => item.pos.getRangeTo(creep) <= 2);
            const constructionSite = creep.room.constructionSites.filter(item => item.pos.getRangeTo(creep) <= 2)[0];

            // 在旁边构建Containers
            const maxContainers = creep.room.storage ? 1 : 1;
            if (!constructionSite && containers.length < maxContainers && links.length == 0) {
                creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
            }

            if (constructionSite) {
                creep.build(constructionSite);
                return;
            }

            var target = creep.room.links.filter(
                item => item.pos.getRangeTo(creep) <= 2
                    && item.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            ).sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep))[0];

            if (!target) {
                var containersInRange = creep.pos.findInRange(FIND_STRUCTURES, 2)
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

            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        }
    },
    filler: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns[0];
            const bodyConfigs = settings.bodyConfigs.filler;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, true);
            creepMemory.working = false;
            creepMemory.room = room.name;
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
                creep.say('📦');
            } else {
                this.source(creep);
                creep.say('🈳');
            }
        },
        source: function (creep) {
            if (creepsUtils.pickupDroppedResource(creep, true, 40)) {
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

            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        },
        target: function (creep) {
            // 优先往Storage搬
            var structures = creep.room.storage;

            if (structures && structures.store.getFreeCapacity() == 0) {
                structures = null;
            }

            const resourceList = Object.keys(creep.store).filter(resource => resource != RESOURCE_ENERGY);
            if (structures && resourceList && resourceList.length > 0) {
                for (resource in resourceList) {
                    if (creep.transfer(structures, resourceList[resource]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(structures);
                    }
                }
            }

            if (structures && creep.memory.sourceTarget == structures.id) {
                structures = null;
            }

            // 然后查找资源不足的Spawn和Extension
            if (!structures) {
                const extensionTargets = creep.room.extensions
                    .filter(extension => extension.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                extensionTargets.sort((a, b) => {
                    if (a.pos.getRangeTo(creep) === b.pos.getRangeTo(creep)) {
                        return a.id.localeCompare(b.id);
                    }
                    return a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep);
                });

                if (extensionTargets && extensionTargets.length > 0) {
                    structures = extensionTargets[0];
                }
            }
            if (!structures) {
                const spawnTargets = creep.room.spawns
                    .filter(spawn => spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                spawnTargets.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep))[0];

                if (spawnTargets && spawnTargets.length > 0) {
                    structures = spawnTargets[0];
                }
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
                    creep.moveTo(structures);
                }
            } else {
                creep.say('❓');
                structures = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_EXTENSION
                });
                if (structures) {
                    creep.moveTo(structures);
                }
            }
        }
    },
    builder: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns[0];
            const bodyConfigs = settings.bodyConfigs.worker;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            creepMemory.working = false;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            return room.constructionSites.length > 0;
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
                creep.say('🪛');
            } else {
                this.source(creep);
                creep.say('🈳');
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
                creep.moveTo(target);
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
            if (!buildTarget) {
                buildTarget = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
                    filter: structure => structure.structureType === STRUCTURE_STORAGE
                });
            }

            var buildTarget = null;
            // 其次获取其他建筑
            if (!buildTarget) {
                buildTarget = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
            }

            if (buildTarget) {
                if (creep.build(buildTarget) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(buildTarget);
                }
            } else {
                roleBase.upgrader.work(creep);
            }
        }
    },
    upgrader: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns[0];
            const bodyConfigs = settings.bodyConfigs.worker;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            creepMemory.working = false;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            var maxController = room.controller.level == 8 && room.controller.ticksToDowngrade > 160000;
            return !maxController;
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
                creep.say('⏫');
            } else {
                this.source(creep);
                creep.say('🈳');
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
                if (!target) delete creep.room.memory.controllerLink;
            }

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        },
        target: function (creep) {
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }

            if (creep.room.memory.signText && creep.room.memory.signText != creep.room.controller.sign.text) {
                if (creep.signController(creep.room.controller, creep.room.memory.signText) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller);
                }
            }
        }
    },
    repairer: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns[0];
            const bodyConfigs = settings.bodyConfigs.worker;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            creepMemory.working = false;
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            return room.structures.filter(structure => structure.hits / structure.hitsMax < 0.5).length > 0
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
                creep.say('🛠️');
            } else {
                this.source(creep);
                creep.say('🈳');
            }
        },
        source: function (creep) {
            creep.memory.repairTarget = null;
            if (creepsUtils.pickupDroppedResource(creep, false)) {
                return;
            }

            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => structure.id == creep.memory.sourceTarget
                    && structure.store[RESOURCE_ENERGY] > 0
            });

            const withdrawResult = creep.withdraw(target, RESOURCE_ENERGY);
            if (withdrawResult == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        },
        target: function (creep) {
            var repairTarget = Game.getObjectById(creep.memory.repairTarget);
            if (!creep.memory.repairTarget || repairTarget.hits == repairTarget.hitsMax) {
                repairTarget = creep.room.structures
                    .filter(structure => structure.hits < structure.hitsMax)
                    .reduce((min, structure) => {
                        if (min == null) { return structure }
                        return structure.hits < min.hits ? structure : min;
                    }, null);

                if (repairTarget) creep.memory.repairTarget = repairTarget.id
            }

            if (repairTarget) {
                if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(repairTarget);
                }
            } else {
                roleBase.upgrader.work(creep);
            }
        }
    }
};

module.exports = roleBase;