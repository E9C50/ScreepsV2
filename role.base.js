const roomUtils = require("utils.room");
const creepsUtils = require("utils.creeps");

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

function genbodyFiller(maxEnergy, totalEnergy, forceSpawn) {
    var energy = forceSpawn ? totalEnergy : maxEnergy;
    energy = Math.max(300, energy);
    energy -= energy % 50;
    var bodyParts = [];

    var totalPartCount = energy / 50;
    if (totalPartCount % 2 == 1) {
        totalPartCount -= 1;
    }

    totalPartCount = Math.min(totalPartCount, 50)

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
            const fillerList = _.filter(Game.creeps, (creep) => creep.room.name == room.name && creep.memory.role == 'filler');

            const bodyPart = genbodyHarvester(maxEnergy, totalEnergy, fillerList.length == 0);
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

                target = containersInRange;
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
    manager: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = genbodyFiller(maxEnergy, totalEnergy, true);
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
    filler: {
        spawn: function (room, creepName, creepMemory) {
            const maxEnergy = roomUtils.getMaxEnergy(room);
            const totalEnergy = roomUtils.getTotalEnergy(room);

            const spawn = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN })[0];

            const bodyPart = genbodyFiller(maxEnergy, totalEnergy, true);
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
                creep.registerMove(structures.pos);
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

            const bodyPart = genbodyWorker(maxEnergy, totalEnergy, false);
            creepMemory.working = false;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        isNeed: function (room) {
            // var storages = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_STORAGE });
            // if (!storages || storages.length == 0) {
            //     return true
            // } else {
            //     return storages[0].store[RESOURCE_ENERGY] > 50000;
            // }
            return true;
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
                creep.registerMove(backTargets.pos);
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

            const bodyPart = genbodyWorker(maxEnergy, totalEnergy, false);
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