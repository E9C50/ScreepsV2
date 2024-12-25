const ROOM_MAX_SIZE = 49;

/**
 * 判断是否可作为基地中央，并返回沼泽位置数量
 * @param {*} terrain 
 * @param {*} posx 
 * @param {*} posy 
 * @param {*} baseSize 
 * @returns 
 */
function canBeRoomCenter(terrain, posx, posy, baseSize) {
    const harfBaseSize = Math.floor(baseSize / 2);
    var swampCount = 0;
    for (let x = posx - harfBaseSize; x <= posx + harfBaseSize; x++) {
        for (let y = posy - harfBaseSize; y <= posy + harfBaseSize; y++) {
            if (x == 2 || y == 2 || x == 48 || y == 48 || terrain.get(x, y) === TERRAIN_MASK_WALL) {
                return [false, Infinity];
            }
            if (terrain.get(x, y) === TERRAIN_MASK_SWAMP) {
                swampCount += 1;
            }
        }
    }
    return [true, swampCount];
}

var roomUtils = {
    /**
     * 判断当前房间是否为战斗模式
     * @param {*} room 
     * @returns 
     */
    isFighting: function (room) {
        var enemys = room.find(FIND_HOSTILE_CREEPS);
        if (enemys.length > 0 && enemys[0].owner.username != 'Invader') {
            console.log('notify_检测到您的房间[' + room.name + ']有敌人[' + enemys[0].owner.username + ']正在进攻')
        }
        return enemys != '';
    },
    /**
     * 获取当前房间所有spawn和extension中存储的energy数量
     * @param {*} room 
     * @returns 
     */
    getTotalEnergy: function (room) {
        const spawns = room.spawns;

        const extensions = room.extensions;

        let totalEnergy = 0;
        spawns.forEach(spawn => totalEnergy += spawn.store[RESOURCE_ENERGY]);
        extensions.forEach(extension => totalEnergy += extension.store[RESOURCE_ENERGY]);

        return totalEnergy;
    },
    /**
     * 获取房间可生产最大energy值
     * @param {*} room 
     */
    getMaxEnergy: function (room) {
        var extensionCount = room.extensions.length;
        var maxEnergy = extensionCount * 50 + 300;
        return maxEnergy;
    },
    /**
     * 获取指定位置周围8格的非墙位置数量
     * @param {*} targetPos 
     * @returns 
     */
    getCanHarvesterPos: function (targetPos) {
        const surroundingPositions = [
            new RoomPosition(targetPos.x - 1, targetPos.y - 1, targetPos.roomName),  // 左上
            new RoomPosition(targetPos.x, targetPos.y - 1, targetPos.roomName),      // 上
            new RoomPosition(targetPos.x + 1, targetPos.y - 1, targetPos.roomName),  // 右上
            new RoomPosition(targetPos.x - 1, targetPos.y, targetPos.roomName),      // 左
            new RoomPosition(targetPos.x + 1, targetPos.y, targetPos.roomName),      // 右
            new RoomPosition(targetPos.x - 1, targetPos.y + 1, targetPos.roomName),  // 左下
            new RoomPosition(targetPos.x, targetPos.y + 1, targetPos.roomName),      // 下
            new RoomPosition(targetPos.x + 1, targetPos.y + 1, targetPos.roomName),  // 右下
        ];

        const terrains = surroundingPositions
            .map(pos => Game.rooms[targetPos.roomName].lookForAt(LOOK_TERRAIN, pos))
            .filter(terrain => terrain != 'wall');
        return terrains.length
    },
    /**
     * 获取指定位置周围8格的非墙位置数量
     * @param {*} targetPos 
     * @returns 
     */
    getCanHarvesterPosV2: function (targetPos) {
        const room = Game.rooms[targetPos.roomName];
        const surroundingPositions = [
            new RoomPosition(targetPos.x, targetPos.y - 1, targetPos.roomName),      // 上
            new RoomPosition(targetPos.x, targetPos.y + 1, targetPos.roomName),      // 下
            new RoomPosition(targetPos.x - 1, targetPos.y, targetPos.roomName),      // 左
            new RoomPosition(targetPos.x + 1, targetPos.y, targetPos.roomName),      // 右
        ];

        const terrains = surroundingPositions
            .map(pos => room.lookForAt(LOOK_TERRAIN, pos))
            .filter(terrain => terrain != 'wall');

        var positionCount = terrains.length

        var topLeft = [
            new RoomPosition(targetPos.x - 1, targetPos.y - 1, targetPos.roomName),  // 左上
            new RoomPosition(targetPos.x, targetPos.y - 1, targetPos.roomName),      // 上
            new RoomPosition(targetPos.x - 1, targetPos.y, targetPos.roomName),      // 左
        ].map(pos => room.lookForAt(LOOK_TERRAIN, pos)).filter(terrain => terrain != 'wall').length

        var topRight = [
            new RoomPosition(targetPos.x + 1, targetPos.y - 1, targetPos.roomName),  // 右上
            new RoomPosition(targetPos.x, targetPos.y - 1, targetPos.roomName),      // 上
            new RoomPosition(targetPos.x + 1, targetPos.y, targetPos.roomName),      // 右
        ].map(pos => room.lookForAt(LOOK_TERRAIN, pos)).filter(terrain => terrain != 'wall').length


        var bottomLeft = [
            new RoomPosition(targetPos.x - 1, targetPos.y + 1, targetPos.roomName),  // 左下
            new RoomPosition(targetPos.x, targetPos.y + 1, targetPos.roomName),      // 下
            new RoomPosition(targetPos.x - 1, targetPos.y, targetPos.roomName),      // 左
        ].map(pos => room.lookForAt(LOOK_TERRAIN, pos)).filter(terrain => terrain != 'wall').length

        var bottomRight = [
            new RoomPosition(targetPos.x + 1, targetPos.y + 1, targetPos.roomName),  // 右下
            new RoomPosition(targetPos.x, targetPos.y + 1, targetPos.roomName),      // 下
            new RoomPosition(targetPos.x + 1, targetPos.y, targetPos.roomName),      // 右
        ].map(pos => room.lookForAt(LOOK_TERRAIN, pos)).filter(terrain => terrain != 'wall').length

        if (topLeft == 3) { positionCount += 1 }
        if (topRight == 3) { positionCount += 1 }
        if (bottomLeft == 3) { positionCount += 1 }
        if (bottomRight == 3) { positionCount += 1 }

        return positionCount;
    },
    /**
     * 自动查找可作为基地中央的位置
     * @param {*} room 
     * @returns 
     */
    autoComputeCenterPos: function (room, baseSize) {
        const terrain = room.getTerrain();

        var minSwamp = Infinity;
        var autoSelectCenter = null;

        // 遍历所有地块
        for (let i = 0; i < ROOM_MAX_SIZE; i++) {
            for (let j = 0; j < ROOM_MAX_SIZE; j++) {
                const result = canBeRoomCenter(terrain, i, j, baseSize);
                const canBeCenter = result[0];
                const swampCount = result[1];
                if (canBeCenter) {
                    if (swampCount < minSwamp) {
                        minSwamp = swampCount;
                        autoSelectCenter = new RoomPosition(i, j, room.name);
                    }
                    room.visual.text(swampCount, i, j, { align: 'center' });
                }
            }
        }

        return autoSelectCenter;
    }
}
module.exports = roomUtils;