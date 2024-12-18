var baseConsole = {
    run: function () {
        help = '<table>' +
            "<tr> <th>命令</th><th>&nbsp;&nbsp;&nbsp;&nbsp;</th> <th>说明</th><th>&nbsp;&nbsp;&nbsp;&nbsp;</th> <th>示例</th><th>&nbsp;&nbsp;&nbsp;&nbsp;</th> </tr>" +
            "<tr> <th>Room.resetRoomPath</th><th></th> <th>重置房间寻路</th><th></th> <th>Game.rooms['W8N3'].resetRoomPath()</th><th></th> </tr>" +
            "<tr> <th>Room.claimRoom</th><th></th> <th>占领房间</th><th></th> <th>Game.rooms['W8N3'].claimRoom('W8N2')</th><th></th> </tr>" +
            "<tr> <th>Room.reserveRoom</th><th></th> <th>预定房间</th><th></th> <th>Game.rooms['W8N3'].reserveRoom('W8N2')</th><th></th> </tr>" +
            "<tr> <th>Room.releaseRemoteHarvest</th><th></th> <th>发布外矿</th><th></th> <th>Game.rooms['W8N3'].releaseRemoteHarvest('a06f077240e9885')</th><th></th> </tr>" +
            "<tr> <th>Room.enableTowerRepairWall</th><th></th> <th>允许Tower刷墙</th><th></th> <th>Game.rooms['W8N3'].enableTowerRepairWall(false)</th><th></th> </tr>" +
            "<tr> <th>Game.profiler.profile</th><th></th> <th>性能分析</th><th></th> <th>Game.profiler.profile(1)</th><th></th> </tr>" +
            '</table>';

        /**
         * 占领新房间
         * @param {*} targetRoom 
         * @returns 
         */
        Room.prototype.claimRoom = function (targetRoom) {
            if (!targetRoom) return '请输入要占领的房间名称';
            if (!Memory.jobs) Memory.jobs = {}
            if (!Memory.jobs.claiming) Memory.jobs.claiming = {}
            Memory.jobs.claiming[targetRoom] = this.name;
            return '已添加占领任务！记得通过RS旗帜标记Spawn出生点！';
        };

        /**
         * 预定新房间
         * @param {*} targetRoom 
         * @returns 
         */
        Room.prototype.reserveRoom = function (targetRoom) {
            if (!targetRoom) return '请输入要预定的房间名称';
            if (!Memory.jobs) Memory.jobs = {}
            if (!Memory.jobs.reserving) Memory.jobs.reserving = {}
            Memory.jobs.reserving[targetRoom] = this.name;
            return '已添加预定任务！';
        };

        /**
         * 发布外矿任务
         * @param {*} sourceId 
         */
        Room.prototype.releaseRemoteHarvest = function (sourceId) {
            if (!sourceId) return '请输入要采集的资源ID';
            if (!Memory.jobs) Memory.jobs = {}
            if (!Memory.jobs.remoteHarvest) Memory.jobs.remoteHarvest = {}
            Memory.jobs.remoteHarvest[sourceId] = this.name;
            return '已发布外矿任务！';
        };
        /**
         * 重置房间寻路
         * @returns 
         */
        Room.prototype.resetRoomPath = function () {
            BetterMove.deletePathInRoom(this.name);
            return '已重置房间寻路！';
        };
        /**
         * 允许Tower刷墙
         * @returns 
         */
        Room.prototype.enableTowerRepairWall = function (enable) {
            this.memory.enableTowerRepairWall = enable;
            return '已设置此房间' + (enable ? '允许' : '禁止') + '刷墙！';
        };
    }
}

module.exports = baseConsole;