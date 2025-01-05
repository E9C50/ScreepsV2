var marketUtils = {
    sellResource: function (room, resourceType, amount, minPrice) {
        var allOrders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: resourceType });
        allOrders = allOrders.sort((a, b) => b.price - a.price);

        var checkOrders = {};
        var totalCost = 0;

        allOrders.forEach(order => {
            if (amount <= 0) return;
            if (order.price < minPrice) return;

            const orderAmount = Math.min(order.remainingAmount, amount);
            checkOrders[order.id] = orderAmount
            amount -= order.remainingAmount;

            totalCost += Game.market.calcTransactionCost(orderAmount, room.name, order.roomName);
        });

        console.log(JSON.stringify(allOrders))
        console.log(JSON.stringify(checkOrders))
        console.log('共需要手续费: ' + totalCost)

        if (amount > 0) console.log('有资源未被出售: ' + amount);

        Object.keys(checkOrders).forEach(orderId => {
            console.log(Game.market.deal(orderId, checkOrders[orderId], room.name));
        })
    },
    buyResource: function (room, resourceType, amount, maxPrice) {
        var allOrders = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: resourceType });
        allOrders = allOrders.sort((a, b) => a.price - b.price);

        var checkOrders = {};
        var totalCost = 0;

        allOrders.forEach(order => {
            if (amount <= 0) return;
            if (order.price > maxPrice) return;

            const roomDistance = Game.map.getRoomLinearDistance(order.roomName, room.name);
            console.log(roomDistance);

            if (roomDistance < 40) return;

            const orderAmount = Math.min(order.remainingAmount, amount);
            checkOrders[order.id] = orderAmount
            amount -= order.remainingAmount;

            totalCost += Game.market.calcTransactionCost(orderAmount, room.name, order.roomName);
        });

        console.log(JSON.stringify(allOrders))
        console.log(JSON.stringify(checkOrders))
        console.log('共需要手续费: ' + totalCost)

        // Object.keys(checkOrders).forEach(orderId => {
        //     console.log(orderId + ' ' + checkOrders[orderId])
        //     console.log(Game.market.deal(orderId, checkOrders[orderId], room.name));
        // })
    },
}
module.exports = marketUtils;