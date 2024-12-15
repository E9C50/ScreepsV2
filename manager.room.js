const settings = require("base.settings");
const roleAdvanced = require('role.advanced');
const roomUtils = require("utils.room");

/**
 * 检查并开启安全模式
 * @param {*} room 
 */
function safeModeChecker(room) {
    const structures = room.find(FIND_STRUCTURES);

    structures.forEach(structure => {
        if (structure.hits < structure.hitsMax
            && structure.structureType != STRUCTURE_ROAD
            && structure.structureType != STRUCTURE_WALL
            && structure.structureType != STRUCTURE_RAMPART
            && structure.structureType != STRUCTURE_CONTAINER
        ) {
            if (room.controller && !room.controller.safeMode) {
                // const result = structure.controller.activateSafeMode();
                console.log('立即激活安全模式！！！');
            }
        }
    });
}

/**
 * 检查并设定RoomCenter
 * @param {*} room 
 */
function checkRoomCenter(room) {
    if (!room.memory.roomCenter) {
        // 自动规划房间中心位置
        let autoRoomCenter = roomUtils.autoComputeCenterPos(room, 13);

        // 查找名为RC的旗子，作为手动选取的房间中心位置
        const flags = room.find(FIND_FLAGS, { filter: flag => flag.name == 'RC' });
        let flagRoomCenter = null;
        if (flags && flags[0]) {
            flagRoomCenter = flags[0].pos;
            flags[0].remove();
        }

        if (flagRoomCenter) {
            room.memory.roomCenter = flagRoomCenter;
        }
        if (room.memory.autoPlanner && autoRoomCenter) {
            room.memory.roomCenter = autoRoomCenter;
        }
    }
}

/**
 * 检查控制器等级，发布建筑工地
 * @param {*} room 
 */
function releaseConstructionSite(room) {
    const roomCenter = room.memory.roomCenter;
    if (!roomCenter) {
        return;
    }

    for (index in settings.baseLayout2) {
        if (index == STRUCTURE_RAMPART && room.controller.level < 3) {
            continue;
        }
        const construction = settings.baseLayout2[index]
        for (posIndex in construction) {
            const posOffset = construction[posIndex];
            const constructionPosX = roomCenter.x + posOffset.x;
            const constructionPosY = roomCenter.y + posOffset.y;
            const constructionPos = new RoomPosition(constructionPosX, constructionPosY, room.name);
            if (constructionPos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0
                && constructionPos.lookFor(LOOK_STRUCTURES).length == 0) {
                constructionPos.createConstructionSite(index);
            }
        }
    }

    // Source旁边发布Link

    // Controller旁边发布Link

    // Mineral上面发布Extractor
    if (room.controller.level >= 6 && !room.extractor) {
        const mineralPos = room.mineral.pos;
        mineralPos.createConstructionSite(STRUCTURE_EXTRACTOR);
    }
}

/**
 * 处理正在占领中的房间
 */
function processClaiming() {
    for (claiming in Memory.claiming) {
        const targetRoom = claiming;
        const sourceRoom = Memory.claiming[targetRoom]
        const creepName = 'Claimer_' + sourceRoom + '_' + targetRoom;

        if (!Game.creeps[creepName]) {
            claimRoom(sourceRoom, targetRoom);
        }
    }
}

/**
 * 占领房间
 * @param {*} sourceRoom 
 * @param {*} targetRoom 
 */
function claimRoom(sourceRoom, targetRoom) {
    const room = Game.rooms[sourceRoom];
    const memory = {
        'role': 'claimer',
        'targetRoom': targetRoom
    }
    roleAdvanced.claimer.spawn(room, memory);
}

/**
 * 展示房间信息
 * @param {*} room 
 */
function showRoomInfo(room) {
    // 显示控制器升级进度
    const controllerPercent = (room.controller.progress / room.controller.progressTotal * 100).toFixed(2);
    room.visual.text(controllerPercent + ' %' + '', room.controller.pos.x, room.controller.pos.y + 2, { align: 'center' });

    // 显示部分建筑能量存储信息
    room.find(FIND_STRUCTURES, {
        filter: structure => structure.structureType == STRUCTURE_CONTAINER
            || structure.structureType == STRUCTURE_TOWER
    }).forEach(structure => {
        var showText = (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY) * 100).toFixed(2) + ' %';
        room.visual.text(showText, structure.pos.x, structure.pos.y + 2, { align: 'center' });
    })

    if (room.storage) {
        room.visual.text(room.storage.store.getUsedCapacity(RESOURCE_ENERGY), room.storage.pos.x, room.storage.pos.y + 2, { align: 'center' });
    }
}

function cacheRoomObjects(room) {
    Object.defineProperty(Room.prototype, 'sources', {
        get: function () {
            if (!this._sources) {
                if (!this.memory.sourceIds) {
                    this.memory.sourceIds = this.find(FIND_SOURCES).map(source => source.id);
                }
                this._sources = this.memory.sourceIds.map(id => Game.getObjectById(id));
            }
            return this._sources;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'spawns', {
        get: function () {
            if (!this._spawns) {
                if (!this.memory.spawnIds) {
                    this.memory.spawnIds = this.find(FIND_STRUCTURES)
                        .filter(structure => structure.structureType == STRUCTURE_SPAWN)
                        .map(structure => structure.id);
                }
                this._spawns = this.memory.spawnIds.map(id => Game.getObjectById(id));
            }
            return this._spawns;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'extensions', {
        get: function () {
            if (!this._extensions) {
                if (!this.memory._extensionsIds) {
                    this.memory._extensionsIds = this.find(FIND_STRUCTURES)
                        .filter(structure => structure.structureType == STRUCTURE_EXTENSION)
                        .map(structure => structure.id);
                }
                this._extensions = this.memory._extensionsIds.map(id => Game.getObjectById(id));
            }
            return this._extensions;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'storage', {
        get: function () {
            if (!this._storage) {
                if (!this.memory.storageId) {
                    const storageList = this.find(FIND_STRUCTURES, {
                        filter: structure => structure.structureType == STRUCTURE_STORAGE
                    });
                    this.memory.storageId = storageList.length > 0 ? storageList[0].id : null;
                }
                this._storage = Game.getObjectById(this.memory.storageId);
            }
            return this._storage;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'extractor', {
        get: function () {
            if (!this._extractor) {
                if (!this.memory._extractorId) {
                    const extractorList = this.find(FIND_STRUCTURES, {
                        filter: structure => structure.structureType == STRUCTURE_EXTRACTOR
                    });
                    this.memory._extractorId = extractorList.length > 0 ? extractorList[0].id : null;
                }
                this._extractor = Game.getObjectById(this.memory._extractorId);
            }
            return this._extractor;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'mineral', {
        get: function () {
            if (!this._mineral) {
                if (!this.memory.mineralId) {
                    this.memory.mineralId = this.find(FIND_MINERALS)[0].id;
                }
                this._mineral = Game.getObjectById(this.memory.mineralId);
            }
            return this._mineral;
        },
        enumerable: false,
        configurable: true
    });
}

var roomManager = {
    run: function () {
        for (roomName in Game.rooms) {
            var room = Game.rooms[roomName];

            // 加载并缓存房间信息
            cacheRoomObjects(room);

            // 检查并开启安全模式
            safeModeChecker(room);

            // 检查并设定RoomCenter
            checkRoomCenter(room);

            // 检查控制器等级，发布建筑工地
            releaseConstructionSite(room);

            // 展示房间信息
            showRoomInfo(room);
        }

        // 处理正在占领中的房间
        processClaiming();
    }
};

module.exports = roomManager;