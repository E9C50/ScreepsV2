const roleBase = require('role.base');
const roleAdvanced = require('role.advanced');
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
        case 'filler':
            roleBase.filler.work(creep);
            break;
        case 'upgrader':
            roleBase.upgrader.work(creep);
            break;
        case 'builder':
            roleBase.builder.work(creep);
            break;
        case 'repairer':
            roleBase.repairer.work(creep);
            break;
        case 'manager':
            roleAdvanced.manager.work(creep);
            break;
        case 'miner':
            roleAdvanced.miner.work(creep);
            break;
        case 'claimer':
            roleAdvanced.claimer.work(creep);
            break;
    }
}


/**
 * 检查房间信息，发布对应Creep需求
 * @param {*} room 
 */
function releaseCreepConfig(room) {
    if (!Memory.creepConfig) Memory.creepConfig = {};
    Memory.creepConfig[room.name] = {};

    // 挖矿
    room.sources.forEach(source => {
        var canHarvesterPos = source.freeSpaceCount;
        canHarvesterPos = Math.min(canHarvesterPos, 2);
        for (i = 0; i < canHarvesterPos; i++) {
            const configName = room.name + '_Harvester_' + source.id + '_' + i;
            Memory.creepConfig[room.name][configName] = {
                role: 'harvester',
                room: room.name,
                sourceTarget: source.id,
            }
        }
    });

    // 如果有，则发布一个矿工
    if (room.extractor) {
        const mineral = room.mineral;
        const minerConfigName = room.name + '_Miner_' + mineral.id;
        Memory.creepConfig[room.name][minerConfigName] = {
            role: 'miner',
            room: room.name,
            sourceTarget: mineral.id,
        };
    }


    // 如果有Storage，发布一个专属Filler，并且每5w多一个upgrader
    var storage = room.storage;
    if (storage) {
        const fillerStorageConfigName = room.name + '_FillerStorage_' + storage.id;
        Memory.creepConfig[room.name][fillerStorageConfigName] = {
            role: 'filler',
            room: room.name,
            sourceTarget: storage.id,
        };

        var workCount = parseInt(storage.store[RESOURCE_ENERGY] / 100000);
        workCount += 1;

        if (room.controller.level == 8) {
            workCount = 1;
        }
        for (i = 0; i < workCount; i++) {
            const upgraderConfigName = room.name + '_UpgraderStorage_' + storage.id + '_' + i;
            Memory.creepConfig[room.name][upgraderConfigName] = {
                role: 'upgrader',
                room: room.name,
                sourceTarget: storage.id,
            };

            const builderConfigName = room.name + '_BuilderStorage_' + storage.id + '_' + i;
            Memory.creepConfig[room.name][builderConfigName] = {
                role: 'builder',
                room: room.name,
                sourceTarget: storage.id,
            };

            const repairerConfigName = room.name + '_RepairerStorage_' + storage.id + '_' + i;
            Memory.creepConfig[room.name][repairerConfigName] = {
                role: 'repairer',
                room: room.name,
                sourceTarget: storage.id,
            };
        }
    }

    if (room.memory.centerLink) {
        const managerConfigName = room.name + '_Manager';
        Memory.creepConfig[room.name][managerConfigName] = {
            room: room.name,
            role: 'manager'
        };
    }

    // 初期 Container，每个 Container 发布 Builder*1，Filler*1，Upgrader*1，repairer*1
    // 如果有 Storage，Builder，Upgrader，repairer 只会绑定 Storage
    room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_CONTAINER })
        .forEach(structure => {
            const fillerConfigName = room.name + '_FillerContainer_' + structure.id;
            Memory.creepConfig[room.name][fillerConfigName] = {
                role: 'filler',
                room: room.name,
                sourceTarget: structure.id,
            };

            const sourceId = storage ? storage.id : structure.id;
            const builderConfigName = room.name + '_BuilderContainer_' + sourceId;
            Memory.creepConfig[room.name][builderConfigName] = {
                role: 'builder',
                room: room.name,
                sourceTarget: sourceId,
            };

            const upgraderConfigName = room.name + '_UpgraderContainer_' + sourceId;
            Memory.creepConfig[room.name][upgraderConfigName] = {
                role: 'upgrader',
                room: room.name,
                sourceTarget: sourceId,
            };

            const repairerConfigName = room.name + '_RepairerContainer_' + sourceId;
            Memory.creepConfig[room.name][repairerConfigName] = {
                role: 'repairer',
                room: room.name,
                sourceTarget: sourceId,
            };
        });
}

/**
 * 根据CreepConfig生成Creep
 * @param {*} room 
 */
function autoSpawnCreeps(room) {
    const harvester = _.filter(Game.creeps, (creep) => creep.memory.room == room.name && creep.memory.role == 'harvester');
    const fillers = _.filter(Game.creeps, (creep) => creep.memory.room == room.name && creep.memory.role == 'filler');

    if (harvester.length > 0 && fillers.length == 0) {
        var fillerSpawn = Object.entries(Memory.creepConfig[room.name]).filter(
            ([configName, config]) => config.role == 'filler' && !Game.creeps[configName])

        if (fillerSpawn && fillerSpawn.length > 0) {
            roleBase.filler.spawn(room, fillerSpawn[0][0], fillerSpawn[0][1]);
            return;
        }
    }

    var harvesterSpawn = Object.entries(Memory.creepConfig[room.name]).filter(
        ([configName, config]) => config.role == 'harvester' && !Game.creeps[configName])

    if (harvesterSpawn && harvesterSpawn.length > 0) {
        roleBase.harvester.spawn(room, harvesterSpawn[0][0], harvesterSpawn[0][1]);
        return;
    }

    var managerSpawn = Object.entries(Memory.creepConfig[room.name]).filter(
        ([configName, config]) => config.role == 'manager' && !Game.creeps[configName])

    if (managerSpawn && managerSpawn.length > 0) {
        roleAdvanced.manager.spawn(room, managerSpawn[0][0], managerSpawn[0][1]);
        return;
    }

    var fillerSpawn = Object.entries(Memory.creepConfig[room.name]).filter(
        ([configName, config]) => config.role == 'filler' && !Game.creeps[configName])

    if (fillerSpawn && fillerSpawn.length > 0) {
        roleBase.filler.spawn(room, fillerSpawn[0][0], fillerSpawn[0][1]);
        return;
    }

    var builderSpawn = Object.entries(Memory.creepConfig[room.name]).filter(
        ([configName, config]) => config.role == 'builder' && !Game.creeps[configName])

    if (builderSpawn && builderSpawn.length > 0 && roleBase.builder.isNeed(room)) {
        roleBase.builder.spawn(room, builderSpawn[0][0], builderSpawn[0][1]);
        return;
    }

    var upgraderSpawn = Object.entries(Memory.creepConfig[room.name]).filter(
        ([configName, config]) => config.role == 'upgrader' && !Game.creeps[configName])

    if (upgraderSpawn && upgraderSpawn.length > 0 && roleBase.upgrader.isNeed(room)) {
        roleBase.upgrader.spawn(room, upgraderSpawn[0][0], upgraderSpawn[0][1]);
        return;
    }

    var repairerSpawn = Object.entries(Memory.creepConfig[room.name]).filter(
        ([configName, config]) => config.role == 'repairer' && !Game.creeps[configName])

    if (repairerSpawn && repairerSpawn.length > 0) {
        roleBase.repairer.spawn(room, repairerSpawn[0][0], repairerSpawn[0][1]);
        return;
    }

    var minerSpawn = Object.entries(Memory.creepConfig[room.name]).filter(
        ([configName, config]) => config.role == 'miner' && !Game.creeps[configName])

    if (minerSpawn && minerSpawn.length > 0 && roleAdvanced.miner.isNeed(room)) {
        roleAdvanced.miner.spawn(room, minerSpawn[0][0], minerSpawn[0][1]);
        return;
    }
}

function showCount(room) {
    let roleCounts = { 'harvester': 0, 'filler': 0, 'manager': 0, 'builder': 0, 'repairer': 0, 'upgrader': 0, 'miner': 0 };
    for (let creepName in Game.creeps) {
        let creep = Game.creeps[creepName];
        let role = creep.memory.role;
        let creepRoom = creep.memory.room;

        if (role && creepRoom == room.name) {
            if (!roleCounts[role]) {
                roleCounts[role] = 0;
            }
            roleCounts[role]++;
        }
    }

    let roleMaxCounts = { 'harvester': 0, 'filler': 0, 'manager': 0, 'builder': 0, 'repairer': 0, 'upgrader': 0, 'miner': 0 };
    for (let creepName in Memory.creepConfig[room.name]) {
        let creep = Memory.creepConfig[room.name][creepName];
        let role = creep.role;

        if (role) {
            if (!roleMaxCounts[role]) {
                roleMaxCounts[role] = 0;
            }
            roleMaxCounts[role]++;
        }
    }

    delete roleCounts['claimer'];

    const roomCenter = room.controller.pos;
    if (roomCenter) {
        var index = roomCenter.y - 2;
        for (role in roleCounts) {
            room.visual.text(role, roomCenter.x + 2, index, { align: 'left' });
            room.visual.text(roleCounts[role] + '/' + roleMaxCounts[role], roomCenter.x + 6, index, { align: 'center' });
            index++;
        }
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
            if (!room.controller.my) continue;
            
            // 检查房间信息，发布Creep需求
            releaseCreepConfig(room);

            // 根据CreepConfig生成Creep
            autoSpawnCreeps(room);

            // 打印房间日志信息
            showCount(room);
        }

        // 工作管理器
        Object.values(Game.creeps).forEach(creep => creepsWork(creep));
    }
};


module.exports = creepsManager;