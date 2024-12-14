var linkManager = {
    run: function () {
        for (roomName in Game.rooms) {
            const room = Game.rooms[roomName]

            const links = room.find(FIND_STRUCTURES, {
                filter: structure => structure.structureType === STRUCTURE_LINK
            });

            const centerLink = room.find(FIND_STRUCTURES, {
                filter: structure => {
                    const storages = structure.pos.findInRange(FIND_STRUCTURES, 3)
                        .filter(structure => structure.structureType == STRUCTURE_STORAGE);
                    return structure.structureType == STRUCTURE_LINK && storages.length > 0
                }
            })[0];

            const controllerLink = room.find(FIND_STRUCTURES, {
                filter: structure => {
                    const controllers = structure.pos.findInRange(FIND_STRUCTURES, 3)
                        .filter(structure => structure.structureType == STRUCTURE_CONTROLLER);
                    return structure.structureType == STRUCTURE_LINK && controllers.length > 0
                }
            })[0];

            if (centerLink) {
                room.memory.centerLink = centerLink.id;
            }

            if (controllerLink) {

                const storage = centerLink.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: structure => structure.structureType == STRUCTURE_STORAGE
                });

                room.memory.controllerLink = controllerLink.id;
                if (controllerLink.store[RESOURCE_ENERGY] == 0 && storage.store[RESOURCE_ENERGY] >= 1000) {
                    room.memory.centerLinkSentMode = true;
                } else {
                    room.memory.centerLinkSentMode = false;
                }
            }

            if (centerLink.store.getFreeCapacity(RESOURCE_ENERGY) < 10
                && room.memory.centerLinkSentMode) {
                centerLink.transferEnergy(controllerLink);
            }

            for (linkIndex in links) {
                var link = links[linkIndex];
                if (link.pos.findInRange(FIND_SOURCES, 3).length > 0) {
                    if (link.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                        link.transferEnergy(centerLink);
                    }
                }
            }
        }
    }
};

module.exports = linkManager;