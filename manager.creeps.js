const roleBase = require('role.base');
const roleAdvanced = require('role.advanced');

function creepsWork(creep) {
    // 还没出生就啥都不干
    if (creep.spawning) return;

    // 检查 creep 内存中的角色是否存在
    if (!creep.memory.role) {
        creep.say('我是谁？我在哪？')
        return;
    }

    const role = creep.memory.role;
    if (roleBase[role]) roleBase[role].work(creep);
    if (roleAdvanced[role]) roleAdvanced[role].work(creep);
}

/**
 * 添加需求配置
 * @param {*} roomName 
 * @param {*} role 
 * @param {*} roleName 
 * @param {*} sourceId 
 * @param {*} sourceIndex 
 */
function addCreepConfig(roomName, role, roleName, sourceId, sourceIndex) {
    const room = Game.rooms[roomName];
    var configName = roomName + '_' + roleName;
    if (sourceId) configName += ('_' + sourceId);
    if (sourceIndex) configName += ('_' + sourceIndex);

    if ((roleBase[role] && (typeof roleBase[role].isNeed != 'function' || roleBase[role].isNeed(room)))
        || (roleAdvanced[role] && (typeof roleAdvanced[role].isNeed != 'function' || roleAdvanced[role].isNeed(room)))) {
        Memory.creepConfig[roomName][configName] = { role: role, room: roomName };
        if (sourceId) Memory.creepConfig[roomName][configName]['sourceTarget'] = sourceId;
    }
}

/**
 * 生产Creep
 * @param {*} room 
 * @param {*} role 
 * @returns 
 */
function spawnCreep(room, spawnObj, role) {
    const spawnConfigs = Object.entries(Memory.creepConfig[room.name]).filter(
        ([configName, config]) => config.role == role && !Game.creeps[configName]);
    if (spawnConfigs && spawnConfigs.length > 0) {
        spawnObj.spawn(room, spawnConfigs[0][0], spawnConfigs[0][1]);
        return true;
    }
    return false;
}


/**
 * 检查房间信息，发布对应Creep需求
 */
function releaseCreepConfig() {
    for (roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller.my) continue;

        // 初始化配置列表
        if (!Memory.creepConfig) Memory.creepConfig = {};
        Memory.creepConfig[room.name] = {};

        // 前三级每个矿2个矿工，三级之后每个矿一个
        room.sources.forEach(source => {
            var canHarvesterPos = source.freeSpaceCount;
            canHarvesterPos = Math.min(canHarvesterPos, 2);
            if (room.controller.level > 3) canHarvesterPos = 1;
            for (i = 0; i < canHarvesterPos; i++) {
                addCreepConfig(room.name, 'harvester', 'Harvester', source.id, i);
            }
        });

        // 如果有中央Link，则发布中央搬运者
        if (room.memory.centerLink) addCreepConfig(room.name, 'manager', 'Manager');

        // 如果有矿机，则发布一个元素矿矿工
        if (room.extractor) addCreepConfig(room.name, 'miner', 'Miner', room.mineral.id);

        // 如果有Storage，发布一个专属Filler
        var storage = room.storage;
        if (storage) addCreepConfig(room.name, 'filler', 'FillerStorage', storage.id);

        // 如果有Storage，则每100000资源发布一个对应的Upgrader、Builder、Repairer
        if (storage) {
            var workCount = parseInt(storage.store[RESOURCE_ENERGY] / 100000) + 1;
            if (room.controller.level == 8) workCount = 1;

            for (i = 0; i < workCount; i++) {
                addCreepConfig(room.name, 'upgrader', 'UpgraderStorage', storage.id, i);
                addCreepConfig(room.name, 'builder', 'BuilderStorage', storage.id, i);
                addCreepConfig(room.name, 'repairer', 'RepairerStorage', storage.id, i);
            }
        }

        // 初期 Container，每个 Container 发布 Builder*1，Filler*1，Upgrader*1，repairer*1
        room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_CONTAINER })
            .forEach(structure => {
                addCreepConfig(room.name, 'filler', 'FillerContainer', structure.id);
                addCreepConfig(room.name, 'upgrader', 'UpgraderContainer', structure.id);
                addCreepConfig(room.name, 'builder', 'BuilderContainer', structure.id);
                addCreepConfig(room.name, 'repairer', 'RepairerContainer', structure.id);
            });
    }
}

/**
 * 根据CreepConfig生成Creep
 */
function autoSpawnCreeps() {
    for (roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller.my) continue;

        const harvester = _.filter(Game.creeps, (creep) => creep.memory.room == room.name && creep.memory.role == 'harvester');
        const fillers = _.filter(Game.creeps, (creep) => creep.memory.room == room.name && creep.memory.role == 'filler');
        const managers = _.filter(Game.creeps, (creep) => creep.memory.room == room.name && creep.memory.role == 'manager');

        if (harvester.length > 0 && managers.length == 0) {
            if (spawnCreep(room, roleAdvanced.manager, 'manager')) continue;
        }

        if (harvester.length > 0 && fillers.length == 0) {
            if (spawnCreep(room, roleBase.filler, 'filler')) continue;
        }

        if (spawnCreep(room, roleBase.harvester, 'harvester')) continue;
        if (spawnCreep(room, roleAdvanced.manager, 'manager')) continue;
        if (spawnCreep(room, roleBase.filler, 'filler')) continue;

        if (spawnCreep(room, roleBase.builder, 'builder')) continue;
        if (spawnCreep(room, roleBase.upgrader, 'upgrader')) continue;
        if (spawnCreep(room, roleBase.repairer, 'repairer')) continue;

        if (spawnCreep(room, roleAdvanced.miner, 'miner')) continue;

        if (spawnCreep(room, roleAdvanced.claimer, 'claimer')) continue;
        if (spawnCreep(room, roleAdvanced.reserver, 'reserver')) continue;
        if (spawnCreep(room, roleAdvanced.rHarvester, 'rHarvester')) continue;
    }
}

/**
 * 处理外部工作
 */
function releaseRemoteCreepConfig() {
    if (!Memory.jobs) Memory.jobs = {};

    for (claiming in Memory.jobs.claiming) {
        const targetRoom = claiming;
        const sourceRoom = Memory.jobs.claiming[targetRoom]
        const creepName = 'Claimer_' + sourceRoom + '_' + targetRoom;

        Memory.creepConfig[sourceRoom][creepName] = {
            'room': sourceRoom,
            'role': 'claimer',
            'targetRoom': targetRoom
        }
    }

    for (reserving in Memory.jobs.reserving) {
        const targetRoom = reserving;
        const sourceRoom = Memory.jobs.reserving[targetRoom]
        const creepName = 'Reserver_' + sourceRoom + '_' + targetRoom;

        Memory.creepConfig[sourceRoom][creepName] = {
            'room': sourceRoom,
            'role': 'reserver',
            'targetRoom': targetRoom
        }
    }

    for (remoteHarvest in Memory.jobs.remoteHarvest) {
        const sourceId = remoteHarvest;
        const sourceRoom = Memory.jobs.remoteHarvest[sourceId];

        const memory = {
            'room': sourceRoom,
            'role': 'rHarvester',
            'sourceTarget': sourceId,
        }

        const creepName1 = 'RemoteHarvester_' + sourceRoom + '_' + sourceId + '_1';
        const creepName2 = 'RemoteHarvester_' + sourceRoom + '_' + sourceId + '_2';

        Memory.creepConfig[sourceRoom][creepName1] = memory;
        Memory.creepConfig[sourceRoom][creepName2] = memory;
    }
}

/**
 * 发布远程房间Creep需求
 */
function showCount() {
    for (roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller.my) continue;
        //  统计当前数量
        let roleCounts = { 'harvester': 0, 'filler': 0, 'manager': 0, 'builder': 0, 'repairer': 0, 'upgrader': 0, 'miner': 0, 'reserver': 0, 'rHarvester': 0 };
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

        //  统计最大数量
        let roleMaxCounts = { 'harvester': 0, 'filler': 0, 'manager': 0, 'builder': 0, 'repairer': 0, 'upgrader': 0, 'miner': 0, 'reserver': 0, 'rHarvester': 0 };
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

        // 去除一些不需要统计的角色
        delete roleCounts['claimer'];

        // 显示统计信息
        const roomCenter = room.controller.pos;
        if (roomCenter) {
            var index = roomCenter.y - 4;
            for (role in roleCounts) {
                const checkText = (roleCounts[role] == roleMaxCounts[role]) ? ' ✅' : (roleCounts[role] > roleMaxCounts[role]) ? ' ⏳' : ' ❌';
                const countText = roleCounts[role] + '/' + roleMaxCounts[role] + checkText;
                room.visual.text(role, roomCenter.x + 2, index, { align: 'left' });
                room.visual.text(countText, roomCenter.x + 7, index, { align: 'center' });
                index++;
            }
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

        // 检查房间信息，发布Creep需求
        releaseCreepConfig();

        // 发布远程房间Creep需求
        releaseRemoteCreepConfig();

        // 根据CreepConfig生成Creep
        autoSpawnCreeps();

        // 打印房间日志信息
        showCount();

        // 工作管理器
        Object.values(Game.creeps).forEach(creep => creepsWork(creep));
    }
};


module.exports = creepsManager;