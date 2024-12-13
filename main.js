const roomManager = require('manager.room');
const creepManager = require('manager.creeps');
const trafficManager = require('manager.traffic');

const towerManager = require('structure.tower');
const linkManager = require('structure.link');
const baseConsole = require('base.console');

trafficManager.init();

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

    // Link管理器
    linkManager.run();

    // 绑定控制台命令
    baseConsole.run();

    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        trafficManager.run(room);
    }
}
