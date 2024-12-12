var roomManager = require('manager.room');
var creepManager = require('manager.creeps');

var towerManager = require('structure.tower');
var baseConsole = require('base.console');

module.exports.loop = function () {
    // 利用空闲CPU生成Pixel
    if (typeof Game.cpu.generatePixel === 'function') {
        Game.cpu.generatePixel();
    }

    // Room管理器
    roomManager.run();

    // Creeps管理器
    creepManager.run();

    // Tower管理器
    towerManager.run();

    // 绑定控制台命令
    baseConsole.run();
}