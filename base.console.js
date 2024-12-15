var baseConsole = {
    run: function () {
        test = function () {
            return 111
        };
        claimRoom = function (sourceRoom, targetRoom) {
            if (!sourceRoom) return '请输入出发的房间名称';
            if (!targetRoom) return '请输入要占领的房间名称';
            if (!Memory.claiming) Memory.claiming = {}
            Memory.claiming[targetRoom] = sourceRoom;
            return '已添加占领任务！记得通过RS旗帜标记Spawn出生点！';
        };
    }
}

module.exports = baseConsole;