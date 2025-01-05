const roleWar = require('role.war');
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
    if (roleWar[role]) roleWar[role].work(creep);
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
    if (sourceId != null) configName += ('_' + sourceId);
    if (sourceIndex != null) configName += ('_' + sourceIndex);

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
        if (!room.controller || !room.controller.my) continue;

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
        if (room.extractor && room.mineral.mineralAmount > 0) addCreepConfig(room.name, 'miner', 'Miner', room.mineral.id);

        var storage = room.storage;
        if (storage) {
            var upgradeCount = parseInt(storage.store[RESOURCE_ENERGY] / 5000) + 1;
            if (room.controller.level == 8) upgradeCount = 1;
            upgradeCount = Math.min(upgradeCount, 15);

            // 如果有Storage，发布一个专属Filler
            var extensionCount = room.extensions.length;
            addCreepConfig(room.name, 'filler', 'FillerStorage', storage.id, 0);
            if (extensionCount > 20) {
                addCreepConfig(room.name, 'filler', 'FillerStorage', storage.id, 1);
            }

            // 发布一个专属Repairer
            addCreepConfig(room.name, 'repairer', 'RepairerStorage', storage.id);
            addCreepConfig(room.name, 'repairer', 'RepairerStorage', storage.id, 1);
            addCreepConfig(room.name, 'repairer', 'RepairerStorage', storage.id, 2);
            addCreepConfig(room.name, 'repairer', 'RepairerStorage', storage.id, 3);

            // 发布Builder
            addCreepConfig(room.name, 'builder', 'BuilderStorage', storage.id, 0);
            addCreepConfig(room.name, 'builder', 'BuilderStorage', storage.id, 1);

            // 如果有Storage，则每100000资源发布一个对应的Upgrader、Builder、Repairer
            for (i = 0; i < upgradeCount; i++) {
                addCreepConfig(room.name, 'upgrader', 'UpgraderStorage', storage.id, i);
            }
        }

        // 如果有 Container，根据容量发布对应的Creeps
        room.structures.filter(structure => structure.structureType == STRUCTURE_CONTAINER)
            .forEach(structure => {
                addCreepConfig(room.name, 'filler', 'FillerContainer', structure.id);
                if (structure.store[RESOURCE_ENERGY] > 1000 && room.energyAvailable < room.energyCapacityAvailable) {
                    addCreepConfig(room.name, 'filler', 'FillerContainer', structure.id, 1);
                }

                if (structure.store[RESOURCE_ENERGY] > 1000 && !room.storage) {
                    for (i = 1; i < (structure.store[RESOURCE_ENERGY] / 300) + 1; i++) {
                        addCreepConfig(room.name, 'upgrader', 'UpgraderContainer', structure.id, i);
                        addCreepConfig(room.name, 'builder', 'BuilderContainer', structure.id, i);
                        addCreepConfig(room.name, 'repairer', 'RepairerContainer', structure.id, i);
                    }
                }
            });
    }
}

/**
 * 根据CreepConfig生成Creep
 */
function autoSpawnCreeps() {
    for (roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my) continue;

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
        if (spawnCreep(room, roleAdvanced.rFiller, 'rFiller')) continue;
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
        const memory = {
            'role': 'claimer',
            'room': sourceRoom,
            'targetRoom': targetRoom
        }
        const creepName0 = 'Claimer_' + sourceRoom + '_' + targetRoom + '_0';
        const creepName1 = 'Claimer_' + sourceRoom + '_' + targetRoom + '_1';
        const creepName2 = 'Claimer_' + sourceRoom + '_' + targetRoom + '_2';
        Memory.creepConfig[sourceRoom][creepName0] = memory;
        Memory.creepConfig[sourceRoom][creepName1] = memory;
        Memory.creepConfig[sourceRoom][creepName2] = memory;
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

    for (sourceRoom in Memory.jobs.remoteHarvest) {
        for (sourceId in Memory.jobs.remoteHarvest[sourceRoom]) {
            const targetRoom = Memory.jobs.remoteHarvest[sourceRoom][sourceId];

            const memory = {
                'room': sourceRoom,
                'role': 'rHarvester',
                'sourceTarget': sourceId,
                'targetRoom': targetRoom,
            }

            const creepName1 = 'RemoteHarvester_' + sourceRoom + '_' + sourceId + '_1';
            const creepName2 = 'RemoteHarvester_' + sourceRoom + '_' + sourceId + '_2';

            Memory.creepConfig[sourceRoom][creepName1] = memory;
            Memory.creepConfig[sourceRoom][creepName2] = memory;
        }
    }

    for (sourceRoom in Memory.jobs.remoteFiller) {
        for (targetRoomName in Memory.jobs.remoteFiller[sourceRoom]) {
            const targetRoom = Memory.jobs.remoteFiller[sourceRoom][targetRoomName];

            const memory = {
                'role': 'rFiller',
                'room': sourceRoom,
                'targetRoom': targetRoom,
            }

            const creepName1 = sourceRoom + '_RemoteFiller_' + targetRoom + '_1';
            const creepName2 = sourceRoom + '_RemoteFiller_' + targetRoom + '_2';

            Memory.creepConfig[sourceRoom][creepName1] = memory;
            Memory.creepConfig[sourceRoom][creepName2] = memory;
        }
    }
}

/**
 * 发布远程房间Creep需求
 */
function showCount() {
    const initDict = {
        'harvester': 0, 'filler': 0, 'manager': 0, 'builder': 0, 'repairer': 0, 'upgrader': 0,
        'miner': 0, 'reserver': 0, 'rHarvester': 0, 'rFiller': 0
    };

    for (roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my) continue;
        //  统计当前数量
        let roleCounts = { ...initDict };
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
        let roleMaxCounts = { ...initDict };
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
        delete roleCounts['dismantler'];

        // 显示统计信息
        if (Game.flags.infoPos && Game.flags.infoPos.pos.roomName == roomName) {
            room.memory.infoPos = Game.flags.infoPos.pos;
            Game.flags.infoPos.remove();
        }
        const infoPos = room.memory.infoPos || room.controller.pos;
        if (infoPos) {
            var index = infoPos.y - 4;
            for (role in roleCounts) {
                const checkText = (roleCounts[role] == roleMaxCounts[role]) ? ' ✅' : (roleCounts[role] > roleMaxCounts[role]) ? ' ⏳' : ' ❌';
                const countText = roleCounts[role] + '/' + roleMaxCounts[role] + checkText;
                room.visual.text(role, infoPos.x + 2, index, { align: 'left' });
                room.visual.text(countText, infoPos.x + 9, index, { align: 'right' });
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