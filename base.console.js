const roleWar = require("./role.war");
const roleBase = require("./role.base");
const roleAdvanced = require("./role.advanced");
const { sellResource, buyResource } = require("./utils.market");

var baseConsole = {
    run: function () {
        help = '<table>' +
            "<tr> <th>命令</th><th>&nbsp;&nbsp;&nbsp;&nbsp;</th> <th>说明</th><th>&nbsp;&nbsp;&nbsp;&nbsp;</th> <th>示例</th><th>&nbsp;&nbsp;&nbsp;&nbsp;</th> </tr>" +

            "<tr> <th>Room.spawnCreep</th><th></th> <th>手动SpawnCreep</th><th></th> <th>Game.rooms['E35N1'].spawnCreep('Dismantler_001', 'dismantler')</th><th></th> </tr>" +
            "<tr> <th>Room.enableTowerRepairWall</th><th></th> <th>允许Tower刷墙</th><th></th> <th>Game.rooms['W8N3'].enableTowerRepairWall(false)</th><th></th> </tr>" +
            "<tr> <th>Room.resetRoomPath</th><th></th> <th>重置房间寻路</th><th></th> <th>Game.rooms['W8N3'].resetRoomPath()</th><th></th> </tr>" +

            "<tr> <th>Room.claimRoom</th><th></th> <th>占领房间</th><th></th> <th>Game.rooms['W8N3'].claimRoom('W8N2')</th><th></th> </tr>" +
            "<tr> <th>Room.reserveRoom</th><th></th> <th>预定房间</th><th></th> <th>Game.rooms['W8N3'].reserveRoom('W8N2')</th><th></th> </tr>" +

            "<tr> <th>Room.releaseRemoteHarvest</th><th></th> <th>发布外矿</th><th></th> <th>Game.rooms['W8N3'].releaseRemoteHarvest('W1N1', 'a06f077240e9885')</th><th></th> </tr>" +
            "<tr> <th>Room.releaseRemoteFiller</th><th></th> <th>发布外房搬运任务</th><th></th> <th>Game.rooms['W8N3'].releaseRemoteFiller('W1N1')</th><th></th> </tr>" +

            "<tr> <th>Room.releaseFillTerminalJob</th><th></th> <th>发布填充终端任务</th><th></th> <th>Game.rooms['E35N3'].releaseFillTerminalJob('K', 1000, 'sourceId', 'targetId')</th><th></th> </tr>" +
            "<tr> <th>Room.releaseTakeTerminalJob</th><th></th> <th>发布提取终端任务</th><th></th> <th>Game.rooms['E35N3'].releaseTakeTerminalJob('K', 1000, 'sourceId', 'targetId')</th><th></th> </tr>" +
            
            "<tr> <th>Room.sellResource</th><th></th> <th>出售资源</th><th></th> <th>Game.rooms['E35N3'].sellResource('K', 1000, 124)</th><th></th> </tr>" +
            "<tr> <th>Room.buyResource</th><th></th> <th>购买资源</th><th></th> <th>Game.rooms['E35N3'].buyResource('K', 1000, 124)</th><th></th> </tr>" +

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
         * 搬运其他房间物资
         * @param {*} targetRoom 
         * @returns 
         */
        Room.prototype.releaseRemoteFiller = function (targetRoom) {
            if (!targetRoom) return '请输入要搬运的房间名称';
            if (!Memory.jobs) Memory.jobs = {}
            if (!Memory.jobs.remoteFiller) Memory.jobs.remoteFiller = {}
            if (!Memory.jobs.remoteFiller[this.name]) Memory.jobs.remoteFiller[this.name] = [];
            Memory.jobs.remoteFiller[this.name].push(targetRoom);
            return '已添加搬运任务！';
        };

        /**
         * 发布外矿任务
         * @param {*} targetRoom 
         * @param {*} sourceId 
         * @returns 
         */
        Room.prototype.releaseRemoteHarvest = function (targetRoom, sourceId) {
            if (!targetRoom) return '请输入要采集的房间名称';
            if (!sourceId) return '请输入要采集的资源ID';
            if (!Memory.jobs) Memory.jobs = {};
            if (!Memory.jobs.remoteHarvest) Memory.jobs.remoteHarvest = {};
            if (!Memory.jobs.remoteHarvest[this.name]) Memory.jobs.remoteHarvest[this.name] = {};

            Memory.jobs.remoteHarvest[this.name][sourceId] = targetRoom;
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
         * @param {*} enable 
         * @returns 
         */
        Room.prototype.enableTowerRepairWall = function (enable) {
            this.memory.enableTowerRepairWall = enable;
            return '已设置此房间' + (enable ? '允许' : '禁止') + '刷墙！';
        };
        /**
         * 手动SpawnCreeps
         * @param {*} creepName 
         * @param {*} creepRole 
         * @returns 
         */
        Room.prototype.spawnCreep = function (creepName, creepRole) {
            var result = null;
            if (roleWar[creepRole]) result = roleWar[creepRole].spawn(this, creepName, { role: creepRole });
            if (roleBase[creepRole]) result = roleBase[creepRole].spawn(this, creepName, { role: creepRole });
            if (roleAdvanced[creepRole]) result = roleAdvanced[creepRole].spawn(this, creepName, { role: creepRole });
            return result;
        };
        /**
         * 发布填充终端任务
         * @param {*} resourceType 
         * @param {*} amount 
         */
        Room.prototype.releaseFillTerminalJob = function (resourceType, amount) {
            if (!Memory.jobs.fillTerminal) Memory.jobs.fillTerminal = {}
            if (!Memory.jobs.fillTerminal[this.name]) Memory.jobs.fillTerminal[this.name] = []

            Memory.jobs.fillTerminal[this.name].push({
                type: resourceType, amount: amount
            })
        };
        /**
         * 发布提取终端任务
         * @param {*} resourceType 
         * @param {*} amount 
         */
        Room.prototype.releaseTakeTerminalJob = function (resourceType, amount) {
            if (!Memory.jobs.takeTerminal) Memory.jobs.takeTerminal = {}
            if (!Memory.jobs.takeTerminal[this.name]) Memory.jobs.takeTerminal[this.name] = []

            Memory.jobs.takeTerminal[this.name].push({
                type: resourceType, amount: amount
            })
        };
        /**
         * 出售资源
         * @param {*} resourceType 
         * @param {*} amount 
         * @param {*} minPrice 
         * @returns 
         */
        Room.prototype.sellResource = function (resourceType, amount, minPrice) {
            return sellResource(this, resourceType, amount, minPrice)
        };
        /**
         * 购买资源
         * @param {*} resourceType 
         * @param {*} amount 
         * @param {*} minPrice 
         * @returns 
         */
        Room.prototype.buyResource = function (resourceType, amount, minPrice) {
            return buyResource(this, resourceType, amount, minPrice)
        };
        testSendMsg = function () {
            const key = 'PDU33295TcKxse3yISFQRj27xO5tvv9kwjrw9zMAE';
            const title = 'Screeps通知';
            const markdown = '您的房间正在遭受攻击，请立即处理！！！';
            const url = 'https://api2.pushdeer.com/message/push?pushkey=' + key + '&text=' + title + '&desp=' + markdown + '&type=markdown';

            const axios = require('axios');
            axios.get(url);
        }
    }
}

module.exports = baseConsole;