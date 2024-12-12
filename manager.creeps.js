const roleBase = require('role.base');
const roomUtils = require("utils.room");

function creepsWork(creep) {
    // 还没出生就啥都不干
    if (creep.spawning) {
        return;
    }

    // 检查 creep 内存中的角色是否存在
    if (!creep.memory.role) {
        creep.say('我是谁？我在哪？')
        return;
    }

    switch (creep.memory.role) {
        case 'harvester':
            roleBase.harvester.work(creep);
            break;
        case 'carryer':
            roleBase.carryer.work(creep);
            break;
        case 'upgrader':
            roleBase.upgrader.work(creep);
            break;
        case 'builder':
            roleBase.builder.work(creep);
            break;
    }
}


/**
 * 检查房间信息，发布对应Creep需求
 * @param {*} room 
 */
function releaseCreepConfig(room) {
    Memory.creepConfig = {};

    // 挖矿
    room.find(FIND_SOURCES).forEach(source => {
        if (source.id == '14b2b5b278f241d8c1ea75e2') {
            return;
        }
        var canHarvesterPos = roomUtils.getCanHarvesterPos(source.pos);
        canHarvesterPos = Math.min(canHarvesterPos, 2);
        for (i = 0; i < canHarvesterPos; i++) {
            const configName = room.name + '_Harvester_' + source.id + '_' + i;
            Memory.creepConfig[configName] = {
                role: 'harvester',
                sourceTarget: source.id,
            }
        }
    });

    // 如果有Storage，发布一个专属Carryer
    var storages = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_STORAGE });
    if (storages && storages.length > 0) {
        const carryerStorageConfigName = room.name + '_CarryerContainer_' + storages[0].id;
        Memory.creepConfig[carryerStorageConfigName] = {
            role: 'carryer',
            sourceTarget: storages[0].id,
        };
    }

    // 初期 Container，每个 Container 发布 Builder*1，Carryer*1，Upgrader*1，repairer*1
    // 如果有 Storage，Builder，Upgrader，repairer 只会绑定 Storage
    room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_CONTAINER })
        .forEach(structure => {
            const carryerConfigName = room.name + '_CarryerContainer_' + structure.id;
            Memory.creepConfig[carryerConfigName] = {
                role: 'carryer',
                sourceTarget: structure.id,
            };

            const sourceId = storages.length > 0 ? storages[0].id : structure.id;
            const builderConfigName = room.name + '_BuilderContainer_' + sourceId;
            Memory.creepConfig[builderConfigName] = {
                role: 'builder',
                sourceTarget: sourceId,
            };

            const upgraderConfigName = room.name + '_UpgraderContainer_' + sourceId;
            Memory.creepConfig[upgraderConfigName] = {
                role: 'upgrader',
                sourceTarget: sourceId,
            };

            const repairerConfigName = room.name + '_RepairerContainer_' + sourceId;
            Memory.creepConfig[repairerConfigName] = {
                role: 'repairer',
                sourceTarget: sourceId,
            };
        });
}

/**
 * 根据CreepConfig生成Creep
 * @param {*} room 
 */
function autoSpawnCreeps(room) {
    var harvesterSpawn = Object.entries(Memory.creepConfig).filter(
        ([configName, config]) => config.role == 'harvester' && !Game.creeps[configName])

    if (harvesterSpawn && harvesterSpawn.length > 0) {
        roleBase.harvester.spawn(room, harvesterSpawn[0][0], harvesterSpawn[0][1]);
        return;
    }

    var carryerSpawn = Object.entries(Memory.creepConfig).filter(
        ([configName, config]) => config.role == 'carryer' && !Game.creeps[configName])

    if (carryerSpawn && carryerSpawn.length > 0) {
        roleBase.carryer.spawn(room, carryerSpawn[0][0], carryerSpawn[0][1]);
        return;
    }

    var builderSpawn = Object.entries(Memory.creepConfig).filter(
        ([configName, config]) => config.role == 'builder' && !Game.creeps[configName])

    if (builderSpawn && builderSpawn.length > 0 && roleBase.builder.isNeed(room)) {
        roleBase.builder.spawn(room, builderSpawn[0][0], builderSpawn[0][1]);
        return;
    }

    var upgraderSpawn = Object.entries(Memory.creepConfig).filter(
        ([configName, config]) => config.role == 'upgrader' && !Game.creeps[configName])

    if (upgraderSpawn && upgraderSpawn.length > 0 && roleBase.upgrader.isNeed(room)) {
        roleBase.upgrader.spawn(room, upgraderSpawn[0][0], upgraderSpawn[0][1]);
        return;
    }
}

function showCount(room) {
    let roleCounts = { 'harvester': 0, 'carryer': 0, 'builder': 0, 'upgrader': 0 };
    for (let creepName in Game.creeps) {
        let creep = Game.creeps[creepName];
        let role = creep.memory.role;

        if (role) {
            if (!roleCounts[role]) {
                roleCounts[role] = 0;
            }
            roleCounts[role]++;
        }
    }

    var index = 1;
    for (role in roleCounts) {
        room.visual.text(role, 0, index, { align: 'left' });
        room.visual.text(roleCounts[role], 4, index, { align: 'left' });
        index++;
    }
}

var creepsManager = {
    run: function () {
        // 清除死亡的Creeps
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }

        for (roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            // 检查房间信息，发布Creep需求
            releaseCreepConfig(room);

            // 根据CreepConfig生成Creep
            autoSpawnCreeps(room);

            showCount(room);
        }

        // 工作管理器
        Object.values(Game.creeps).forEach(creep => creepsWork(creep));
    }
};


module.exports = creepsManager;