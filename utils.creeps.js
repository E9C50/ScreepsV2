var creepsUtils = {
    /**
     * 挖矿BodyPart构建
     * @param {*} maxEnergy 
     * @param {*} totalEnergy 
     * @param {*} forceSpawn 
     * @returns 
     */
    genbodyHarvester: function (maxEnergy, totalEnergy, forceSpawn) {
        var energy = forceSpawn ? totalEnergy : maxEnergy;
        energy = Math.max(300, energy);
        energy -= energy % 50;
        var bodyParts = [];

        bodyParts.push(MOVE);
        bodyParts.push(CARRY);
        energy -= BODYPART_COST.move;
        energy -= BODYPART_COST.carry;

        if (energy % 100 == 50) {
            bodyParts.push(MOVE);
            energy -= BODYPART_COST.move;
        }

        var workCount = parseInt(energy / BODYPART_COST.work);
        workCount = Math.min(workCount, 4);
        for (let i = 0; i < workCount; i++) {
            bodyParts.push(WORK);
        }

        return bodyParts;
    },
    /**
     * 搬运BodyPart构建
     * @param {*} maxEnergy 
     * @param {*} totalEnergy 
     * @param {*} forceSpawn 
     * @returns 
     */
    genbodyFiller: function (maxEnergy, totalEnergy, forceSpawn) {
        var energy = forceSpawn ? totalEnergy : maxEnergy;
        energy = Math.max(300, energy);
        energy -= energy % 50;
        var bodyParts = [];

        var totalPartCount = energy / 50;
        if (totalPartCount % 2 == 1) {
            totalPartCount -= 1;
        }

        totalPartCount = Math.min(totalPartCount, 50)

        var singlePartCount = totalPartCount / 2;

        for (let i = 0; i < singlePartCount; i++) {
            bodyParts.push(MOVE);
            bodyParts.push(CARRY);
        }

        return bodyParts;
    },
    /**
     * 工作BodyPart构建
     * @param {*} maxEnergy 
     * @param {*} totalEnergy 
     * @param {*} forceSpawn 
     * @returns 
     */
    genbodyWorker: function (maxEnergy, totalEnergy, forceSpawn) {
        var energy = forceSpawn ? totalEnergy : maxEnergy;
        energy = Math.max(300, energy);
        energy -= energy % 50;
        var bodyParts = [];

        bodyParts.push(CARRY);
        bodyParts.push(MOVE);
        energy -= BODYPART_COST.carry;
        energy -= BODYPART_COST.move;

        while (energy >= 150) {
            bodyParts.push(WORK);
            bodyParts.push(MOVE);
            energy -= BODYPART_COST.work;
            energy -= BODYPART_COST.move;
        }

        if (energy == 100) {
            bodyParts.push(CARRY);
            bodyParts.push(MOVE);
            energy -= BODYPART_COST.carry;
            energy -= BODYPART_COST.move;
        }
        return bodyParts;
    },
    /**
     * 捡起地上掉落的资源/墓碑的资源
     * @param {*} creep 
     * @returns 
     */
    pickupDroppedResource: function (creep, allSource) {
        // 没有携带空间的跳过
        if (creep.store.getFreeCapacity() == 0) {
            return false;
        }

        // 优先捡起附近掉落的资源
        const droppedEnergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 5);

        if (droppedEnergy.length > 0) {
            if (creep.pickup(droppedEnergy[0]) == ERR_NOT_IN_RANGE) {
                creep.registerMove(droppedEnergy[0].pos);
            }
            return true;
        }

        // 查找附近墓碑的资源
        var destroyed = creep.pos.findInRange(FIND_TOMBSTONES, 5, {
            filter: tombstone => tombstone.store.getUsedCapacity() > 0
        });

        // 查找附近遗址的资源
        if (destroyed == '' || destroyed.length == 0) {
            destroyed = creep.pos.findInRange(FIND_RUINS, 10, {
                filter: ruin => ruin.store.getUsedCapacity() > 0
            });
        }

        // 捡取资源
        if (destroyed.length > 0) {
            for (resource in destroyed[0].store) {
                if (resource != RESOURCE_ENERGY && !allSource) {
                    continue;
                }
                if (creep.withdraw(destroyed[0], resource) == ERR_NOT_IN_RANGE) {
                    creep.registerMove(destroyed[0].pos);
                }
            }
            return true;
        }
        return false;
    }
}
module.exports = creepsUtils;