var linkManager = {
    run: function () {
        for (roomName in Game.rooms) {
            const room = Game.rooms[roomName]
            if (!room.controller.my) continue;

            const links = room.find(FIND_STRUCTURES, {
                filter: structure => structure.structureType === STRUCTURE_LINK
            });

            const centerLink = links.filter(link => link.pos.inRangeTo(room.storage, 3))[0];
            const controllerLink = links.filter(link => link.pos.inRangeTo(room.controller, 3))[0];

            if (centerLink) {
                room.memory.centerLink = centerLink.id;
            }

            if (controllerLink) {

                room.memory.controllerLink = controllerLink.id;
                if (controllerLink.store[RESOURCE_ENERGY] == 0 && room.storage.store[RESOURCE_ENERGY] >= 1000) {
                    room.memory.centerLinkSentMode = true;
                } else {
                    room.memory.centerLinkSentMode = false;
                }
            }

            if (centerLink && centerLink.store.getFreeCapacity(RESOURCE_ENERGY) < 10
                && room.memory.centerLinkSentMode) {
                centerLink.transferEnergy(controllerLink);
            }

            for (linkIndex in links) {
                var link = links[linkIndex];
                for (sourceIndex in room.sources) {
                    if (link.pos.inRangeTo(room.sources[sourceIndex].pos, 3)
                        && link.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                        link.transferEnergy(centerLink);
                    }
                }

            }
        }
    }
};

module.exports = linkManager;