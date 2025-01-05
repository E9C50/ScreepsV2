const roomManager = require('manager.room');
const creepManager = require('manager.creeps');

const towerManager = require('structure.tower');
const linkManager = require('structure.link');
const baseConsole = require('base.console');

const profiler = require('utils.profiler');
const exportStats = require('utils.stats');

require('utils.resource');
require('utils.move');
profiler.enable();

module.exports.loop = function () {
    // 利用空闲CPU生成Pixel
    if (typeof Game.cpu.generatePixel === 'function') {
        Game.cpu.generatePixel();
    }

    profiler.wrap(function () {
        // Room管理器
        roomManager.run();

        if (Game.cpu.bucket > 20) {
            // Creeps管理器
            creepManager.run();
        }

        // Tower管理器
        towerManager.run();

        // Link管理器
        linkManager.run();

        // 绑定控制台命令
        baseConsole.run();

        // 自动规划
        // autoPlanner();


        energyOrderIdMap = {
            'E35N1': '6772e14105132b001285b6f9',
            'E35N3': '6772ac0e05132b001271432f',
        };

        const checkResult = Object.keys(energyOrderIdMap).filter(roomName => {
            const room = Game.rooms[roomName];
            if (!room) return false;
            return room.storage.store[RESOURCE_ENERGY] + room.terminal.store[RESOURCE_ENERGY] < 800000;
        }).length > 0

        if (Game.time % 10 == 0 && checkResult && Game.cpu.bucket > 500) {
            // 查询市场中买单的最大价格
            const maxPrice = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: RESOURCE_ENERGY })
                .filter(order => !Object.keys(energyOrderIdMap).includes(order.roomName))
                .sort((a, b) => b.price - a.price)[0].price
            var newPrice = Math.min(maxPrice, 38)

            for (const roomName in energyOrderIdMap) {
                const room = Game.rooms[roomName];
                if (!room) continue;
                const storageStore = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0;
                const terminalStore = room.terminal ? room.terminal.store[RESOURCE_ENERGY] : 0;
                if (storageStore + terminalStore < 400000) {
                    newPrice = Math.min(maxPrice, 40)
                }
                if (storageStore + terminalStore < 800000) {
                    const orderInfo = Game.market.getOrderById(energyOrderIdMap[roomName])

                    if (orderInfo.price != newPrice && ((orderInfo.price < newPrice && orderInfo.remainingAmount > 0) || orderInfo.remainingAmount == 0)) {
                        Game.market.changeOrderPrice(energyOrderIdMap[roomName], newPrice);
                        // console.log('notify_change_order_price: roomName:' + roomName + ' remainingAmount: ' + orderInfo.remainingAmount + ' orderPrice: ' + orderInfo.price + ' -> ' + newPrice)
                    }

                    if (orderInfo.remainingAmount == 0) {
                        Game.market.extendOrder(energyOrderIdMap[roomName], 50000);
                        // console.log('notify_extend_order: ', roomName, ' -> ', 50000)
                    }
                }
            }
        }

        // 数据统计
        exportStats();
    });
}
