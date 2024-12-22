var linkManager = {
    run: function () {
        for (roomName in Game.rooms) {
            const room = Game.rooms[roomName]
            if (!room.controller || !room.controller.my) continue;

            const centerLink = room.links.filter(link => link.pos.inRangeTo(room.storage, 3))[0];
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

            room.memory.sideLinks = [];
            for (linkIndex in room.links) {
                var link = room.links[linkIndex];
                for (sourceIndex in room.sources) {
                    if (link.pos.inRangeTo(room.sources[sourceIndex].pos, 3) && link.cooldown == 0) {
                        link.transferEnergy(centerLink);
                    }
                }

                if (link.pos.x >= 47 || link.pos.x <= 2 || link.pos.y >= 47 || link.pos.y <= 2) {
                    room.memory.sideLinks.push(link.id);
                    if (link.cooldown == 0) {
                        link.transferEnergy(centerLink);
                    }
                }
            }
        }
    }
};

module.exports = linkManager;