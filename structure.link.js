var linkManager = {
    run: function () {
        for (roomName in Game.rooms) {
            const room = Game.rooms[roomName]
            if (!room.controller || !room.controller.my) continue;

            const centerLink = room.links.filter(link => link.pos.inRangeTo(room.storage, 2))[0];
            const controllerLink = room.links.filter(link => link.pos.inRangeTo(room.controller, 3))[0];

            if (centerLink) {
                room.memory.centerLink = centerLink.id;
            }

            if (controllerLink) {
                room.memory.controllerLink = controllerLink.id;
                var maxController = room.controller.level == 8 && room.controller.ticksToDowngrade > 160000;
                if (controllerLink.store[RESOURCE_ENERGY] == 0 && !maxController) {
                    room.memory.centerLinkSentMode = true;
                } else {
                    room.memory.centerLinkSentMode = false;
                }
            }

            if (centerLink && centerLink.store.getFreeCapacity(RESOURCE_ENERGY) < 30
                && room.memory.centerLinkSentMode) {
                centerLink.transferEnergy(controllerLink, 200);
            }

            for (linkIndex in room.links) {
                var link = room.links[linkIndex];
                if ((!centerLink || link.id != centerLink.id) && (!controllerLink || link.id != controllerLink.id)) {
                    if (link.store.getFreeCapacity(RESOURCE_ENERGY) < 10) {
                        link.transferEnergy(centerLink);
                    }
                }
            }
        }
    }
};

module.exports = linkManager;