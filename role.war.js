const creepsUtils = require("utils.creeps");
const settings = require("base.settings");
const { fill, filter } = require("lodash");

var roleWar = {
    npcHouseKeeper: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns.filter(spawn => !spawn.spawning)[0];
            const bodyConfigs = settings.bodyConfigs.oneWar;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);

            if (spawn) console.log(spawn.spawnCreep([MOVE], creepName, { memory: creepMemory }))
        },
        work: function (creep) {
            const targetFlag = Game.flags['TARGET_TEST'];
            if (creep.room.name == targetFlag.pos.roomName) {
                var enemy = creep.pos.findClosestByRange(FIND_CREEPS, { filter: creep => !creep.my });

                // if (!enemy) {
                //     enemy = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                //         filter: structure => !structure.my && structure.structureType == STRUCTURE_TOWER
                //     });
                // }
                // if (!enemy) {
                //     enemy = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                //         filter: structure => !structure.my && structure.structureType == STRUCTURE_SPAWN
                //     });
                // }
                // if (!enemy) {
                //     enemy = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                //         filter: structure => !structure.my && structure.structureType != STRUCTURE_CONTROLLER
                //     });
                // }
                // if (!enemy) {
                //     enemy = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
                // }
                if (!enemy) {
                    enemy = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: structure => structure.structureType == STRUCTURE_INVADER_CORE
                    });
                }

                if (enemy && creep.pos.inRangeTo(enemy, 1)) {
                    creep.attack(enemy)
                } else if (enemy) {
                    creep.moveTo(enemy);
                } else {
                    creep.moveTo(Game.flags['TARGET_TEST'].pos);
                }
            } else {
                creep.moveTo(Game.flags['TARGET_TEST'].pos);
            }

            if (creep.hits < creep.hitsMax) {
                creep.heal(creep);
            }
        },
    },
    dismantler: {
        spawn: function (room, creepName, creepMemory) {
            const spawn = room.spawns.filter(spawn => !spawn.spawning)[0];
            const bodyConfigs = settings.bodyConfigs.worker;
            const bodyPart = creepsUtils.getBodyConfig(room, bodyConfigs, false);
            creepMemory.room = room.name;
            if (spawn) spawn.spawnCreep(bodyPart, creepName, { memory: creepMemory });
        },
        work: function (creep) {
            if (creep.store.getFreeCapacity() == 0 && creep.room.name != creep.memory.room) {
                creep.moveTo(new RoomPosition(25, 25, creep.memory.room));
                return;
            }
            creep.say('🚫');
            const targetFlag = Game.flags['TARGET_D'];
            if (creep.room.name != targetFlag.pos.roomName) {
                creep.moveTo(Game.flags['TARGET_D'].pos);
                return;
            }
            const targets = targetFlag.pos.lookFor(LOOK_STRUCTURES);
            if (!targets || targets.length == 0 || creep.dismantle(targets[0]) != OK) {
                creep.moveTo(targetFlag);
            }

            creep.drop(RESOURCE_ENERGY);
        },
    },
};

module.exports = roleWar;