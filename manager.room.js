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
                // room.controller.activateSafeMode();
                console.log(room.name + ' 建筑受到破坏，立即激活安全模式！！！');
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
    if (!roomCenter) return;

    // room.find(FIND_CONSTRUCTION_SITES).forEach(constructionSite => {
    //     constructionSite.remove()
    // });

    for (level in settings.baseLayout) {
        if (room.controller.level < level) {
            continue;
        }
        for (index in settings.baseLayout[level]) {
            const constructionPosList = settings.baseLayout[level][index];
            for (posIndex in constructionPosList) {
                const posOffset = constructionPosList[posIndex];
                const constructionPosX = roomCenter.x + posOffset[0];
                const constructionPosY = roomCenter.y + posOffset[1];
                const constructionPos = new RoomPosition(constructionPosX, constructionPosY, room.name);

                const constructionAtPos = constructionPos.lookFor(LOOK_CONSTRUCTION_SITES);
                const structureAtPos = constructionPos.lookFor(LOOK_STRUCTURES);
                const rampartAtPos = structureAtPos.filter(structure => structure.structureType == STRUCTURE_RAMPART);

                if (constructionAtPos.length == 0 && (structureAtPos.length == 0
                    || (index == STRUCTURE_RAMPART && rampartAtPos.length == 0))) {
                    constructionPos.createConstructionSite(index);
                    // console.log('createConstructionSite ' + index)
                }
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
 * 展示房间信息
 * @param {*} room 
 */
function showRoomInfo(room) {
    // 显示Spawn孵化进度
    room.spawns.forEach(spawn => {
        if (spawn.spawning) {
            const spawnPercent = ((spawn.spawning.needTime - spawn.spawning.remainingTime) / spawn.spawning.needTime * 100).toFixed(2);
            const role = Game.creeps[spawn.spawning.name].memory.role;
            room.visual.text(role + ' ' + spawnPercent + ' %', spawn.pos.x, spawn.pos.y + 2, { align: 'center' });
        }
    });

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

function cacheRoomObjects() {
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
                if (!this.memory.spawnIds || this.memory.spawnIds == '' || Game.time % 10 == 0) {
                    this.memory.spawnIds = this.find(FIND_STRUCTURES)
                        .filter(structure => structure.structureType == STRUCTURE_SPAWN)
                        .map(structure => structure.id);
                }
                this._spawns = this.memory.spawnIds.map(id => Game.getObjectById(id));
                this._spawns = this._spawns.filter(spawn => spawn && spawn.isActive());
                if (!this._spawns) delete this.memory.spawnIds;
            }
            return this._spawns;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'extensions', {
        get: function () {
            if (!this._extensions) {
                if (!this.memory.extensionsIds || this.memory.extensionsIds.length == 0 || Game.time % 10 == 0) {
                    this.memory.extensionsIds = this.find(FIND_STRUCTURES)
                        .filter(structure => structure.structureType == STRUCTURE_EXTENSION)
                        .map(structure => structure.id);
                }
                this._extensions = this.memory.extensionsIds.map(id => Game.getObjectById(id));
                this._extensions = this._extensions.filter(extension => extension && extension.isActive());
                if (!this._extensions) delete this.memory.extensionsIds;
            }
            return this._extensions;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'containers', {
        get: function () {
            if (!this._containers) {
                if (!this.memory.containerIds || this.memory.containerIds.length == 0 || Game.time % 10 == 0) {
                    this.memory.containerIds = this.find(FIND_STRUCTURES)
                        .filter(structure => structure.structureType == STRUCTURE_CONTAINER)
                        .map(structure => structure.id);
                }
                this._containers = this.memory.containerIds.map(id => Game.getObjectById(id));
                this._containers = this._containers.filter(container => container);
                if (!this._containers) delete this.memory.containerIds;
            }
            return this._containers;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'storage', {
        get: function () {
            if (!this._storage) {
                if (!this.memory.storageId || Game.time % 10 == 0) {
                    const storageList = this.find(FIND_STRUCTURES, {
                        filter: structure => structure.structureType == STRUCTURE_STORAGE
                    });
                    this.memory.storageId = storageList.length > 0 ? storageList[0].id : null;
                }
                this._storage = Game.getObjectById(this.memory.storageId);
                if (this._storage && !this._storage.isActive()) {
                    this._storage = null;
                }
            }
            return this._storage;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Room.prototype, 'extractor', {
        get: function () {
            if (!this._extractor) {
                if (!this.memory.extractorId || Game.time % 10 == 0) {
                    const extractorList = this.find(FIND_STRUCTURES, {
                        filter: structure => structure.structureType == STRUCTURE_EXTRACTOR
                    });
                    this.memory.extractorId = extractorList.length > 0 ? extractorList[0].id : null;
                }
                this._extractor = Game.getObjectById(this.memory.extractorId);
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
    Object.defineProperty(Source.prototype, 'freeSpaceCount', {
        get: function () {
            const terrain = this.room.getTerrain();

            if (!Memory.freeSpaceCount) Memory.freeSpaceCount = {};
            if (this._freeSpaceCount == undefined) {
                if (Memory.freeSpaceCount[this.id] == undefined) {
                    let freeSpaceCount = 0;
                    [this.pos.x - 1, this.pos.x, this.pos.x + 1].forEach(x => {
                        [this.pos.y - 1, this.pos.y, this.pos.y + 1].forEach(y => {
                            if (terrain.get(x, y) != TERRAIN_MASK_WALL)
                                freeSpaceCount++;
                        }, this);
                    }, this);
                    Memory.freeSpaceCount[this.id] = freeSpaceCount;
                }
                this._freeSpaceCount = Memory.freeSpaceCount[this.id];
            }
            return this._freeSpaceCount;
        },
        enumerable: false,
        configurable: true
    });

    Object.defineProperty(Mineral.prototype, 'freeSpaceCount', {
        get: function () {
            const terrain = this.room.getTerrain();

            if (!Memory.freeSpaceCount) Memory.freeSpaceCount = {};
            if (this._freeSpaceCount == undefined) {
                if (Memory.freeSpaceCount[this.id] == undefined) {
                    let freeSpaceCount = 0;
                    [this.pos.x - 1, this.pos.x, this.pos.x + 1].forEach(x => {
                        [this.pos.y - 1, this.pos.y, this.pos.y + 1].forEach(y => {
                            if (terrain.get(x, y) != TERRAIN_MASK_WALL)
                                freeSpaceCount++;
                        }, this);
                    }, this);
                    Memory.freeSpaceCount[this.id] = freeSpaceCount;
                }
                this._freeSpaceCount = Memory.freeSpaceCount[this.id];
            }
            return this._freeSpaceCount;
        },
        enumerable: false,
        configurable: true
    });
}

var roomManager = {
    run: function () {
        // 加载并缓存房间信息
        cacheRoomObjects();

        for (roomName in Game.rooms) {
            var room = Game.rooms[roomName];

            if (!room.controller.my) continue;

            // 检查并开启安全模式
            safeModeChecker(room);

            // 检查并设定RoomCenter
            checkRoomCenter(room);

            // 检查控制器等级，发布建筑工地
            releaseConstructionSite(room);

            // 展示房间信息
            showRoomInfo(room);
        }
    }
};

module.exports = roomManager;