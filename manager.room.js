const settings = require("base.settings");
const roleBase = require("role.base");
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
        let autoRoomCenter = roomUtils.autoComputeCenterPos(room, 11);

        // 查找名为RC的旗子，作为手动选取的房间中心位置
        const flags = room.find(FIND_FLAGS, { filter: flag => flag.name == 'RC' });
        let flagRoomCenter = null;
        if (flags && flags[0]) {
            flagRoomCenter = flags[0].pos;
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

    // for (let site of Object.values(Game.constructionSites)) {
    //     site.remove();
    // }

    for (index in settings.baseLayout) {
        if (index > room.controller.level) {
            continue;
        }

        for (construction in settings.baseLayout[index]) {

            for (posIndex in settings.baseLayout[index][construction]) {
                const posOffset = settings.baseLayout[index][construction][posIndex];

                const constructionPosX = roomCenter.x + posOffset[0];
                const constructionPosY = roomCenter.y + posOffset[1];
                const constructionPos = new RoomPosition(constructionPosX, constructionPosY, room.name);
                constructionPos.createConstructionSite(construction, 'S_' + room.name);
            }
        }
    }
}

var roomManager = {
    run: function () {
        for (roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            // 检查并开启安全模式
            safeModeChecker(room);

            // 检查并设定RoomCenter
            checkRoomCenter(room);

            // 检查控制器等级，发布建筑工地
            releaseConstructionSite(room);
        }
    }
};

module.exports = roomManager;