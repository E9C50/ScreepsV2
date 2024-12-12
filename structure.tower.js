function findEnemy(tower) {
    var enemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: creep => creep.body.some(part => part.type === HEAL)
    });
    if (!enemy) {
        enemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
            filter: creep => creep.body.some(part => part.type === RANGED_ATTACK)
        });
    }
    if (!enemy) {
        enemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
            filter: creep => creep.body.some(part => part.type === ATTACK)
        });
    }
    if (!enemy) {
        enemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    }
    return enemy
}

function findStructureToRepair(tower) {
    var structureToRepair = tower.room.find(FIND_STRUCTURES, {
        filter: structure => structure.hits < structure.hitsMax
            && structure.structureType !== STRUCTURE_WALL
            && structure.structureType !== STRUCTURE_RAMPART
    }).reduce((min, structure) => {
        if (min == null) { return structure }
        return structure.hits < min.hits ? structure : min;
    }, null);

    if (!structureToRepair) {
        structureToRepair = tower.room.find(FIND_STRUCTURES, {
            filter: structure =>
                (structure.structureType == STRUCTURE_WALL && structure.hits <= 150000)
                || (structure.structureType == STRUCTURE_RAMPART && structure.hits <= 140000)
        }).reduce((min, structure) => {
            if (min == null) { return structure }
            return structure.hits < min.hits ? structure : min;
        }, null);
    }
    return structureToRepair;
}

var towerManager = {
    run: function () {
        // 获取所有房间中的Tower
        const allRooms = Object.values(Game.rooms);
        const towers = allRooms.filter(room => room.controller && room.controller.my)
            .map(room => room.find(FIND_STRUCTURES, {
                filter: structure => structure.structureType === STRUCTURE_TOWER
            })).reduce((acc, towers) => acc.concat(towers), []);

        for (var index in towers) {
            var tower = towers[index];
            var towerEnergy = tower.store[RESOURCE_ENERGY];

            // 检测敌人并攻击，优先攻击治疗单位 -> 远程攻击单位 -> 攻击单位 -> 其他
            var enemy = findEnemy(tower);
            if (enemy) {
                tower.attack(enemy);
                continue;
            }

            // 只有energy大于500时，才会修复建筑物/治疗单位（储备弹药优先攻击敌人）
            if (towerEnergy < 500) {
                continue;
            }

            // 如果没有敌人，尝试修复建筑物，优先除墙外的血量最低的建筑，其次修墙
            var structure = findStructureToRepair(tower);
            if (structure) {
                tower.repair(structure);
                continue;
            }
        }
    }
};

module.exports = towerManager;