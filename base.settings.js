var settings = {
    baseLayout: {
        1: {
            [STRUCTURE_SPAWN]: [[1, 0]]
        },
        2: {
            [STRUCTURE_EXTENSION]: [[2, 1], [3, 1], [4, 1], [2, -1], [3, -1]],
            [STRUCTURE_ROAD]: [[1, 1], [1, -1], [2, 0], [3, 0], [4, 0]]
        },
        3: {
            [STRUCTURE_EXTENSION]: [[-2, 1], [-3, 1], [-4, 1], [-2, -1], [-3, -1]],
            [STRUCTURE_ROAD]: [[-1, 1], [-1, -1], [-2, 0], [-3, 0], [-4, 0]],
            [STRUCTURE_TOWER]: [[-5, 1]]
        },
        4: {
            [STRUCTURE_EXTENSION]: [[-5, 0], [-5, -1], [-4, -1], [5, 0], [5, -1], [4, -1], [-1, 2], [-2, 2], [1, 2], [2, 2]],
            [STRUCTURE_ROAD]: [[0, 2], [0, -2]],
            [STRUCTURE_STORAGE]: [[0, 1]],
        },
        5: {
            [STRUCTURE_EXTENSION]: [[-3, 2], [3, 2], [-5, 2], [5, 2], [1, -2], [2, -2], [3, -2], [-1, -2], [-2, -2], [-3, -2]],
            [STRUCTURE_ROAD]: [[4, 2], [-4, 2], [1, 3], [2, 3], [3, 3], [-1, 3], [-2, 3], [-3, 3]],
            [STRUCTURE_TOWER]: [[5, 1]],
            [STRUCTURE_LINK]: [[0, 0]],
        },
        6: {
            [STRUCTURE_EXTENSION]: [[4, -2], [5, -2], [-4, -2], [-5, -2], [5, -3], [-5, -3], [1, -4], [2, -4], [-1, -4], [-2, -4]],
            [STRUCTURE_ROAD]: [[0, -4], [1, -3], [2, -3], [3, -3], [4, -3], [-1, -3], [-2, -3], [-3, -3], [-4, -3]],
            [STRUCTURE_LAB]: [[0, 4], [1, 4], [-1, 4]],
            [STRUCTURE_TERMINAL]: [[-1, 0]],
        },
    }
}

module.exports = settings;