const level1 = {
    map: `
~~~~~#########~~~~~
~~~~~~~##O##~~~~~~~
~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~
#~~~~~~~~~~~~~~~~~#
###~~~~~~~~~~~~~###
####~~~~~~~~~~~####
###~~~~~~~~~~~~~###
#~~~~~~~~~~~~~~~~~#
~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~
~~~~~~~~#H#~~~~~~~~
~~~~~~~######~~~~~~
~~~~~##########~~~~
    `.trim(),
    state: {
        ship: {
            x: 9,
            y: 11,
            goods: [],
        },
        score: 0,
        pirates: [],
        goodsInPort: [
            {
                name: 'fabric',
                amount: 3000,
                volume: 3,
            },
        ],
        ports: [
            {
                portId: 0,
                x: 9,
                y: 11,
                isHome: true,
            },
            {
                portId: 1,
                x: 9,
                y: 1,
                isHome: false,
            }
        ],
        prices: [
            {
                portId: 1,
                fabric: 10,
            }
        ]
    },
};

const level2 = {
    map: `
~~~~~#########~~~~~
~~~~~~~##O##~~~~~~~
~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~
#~~~~~~~~~~~~~~~~~#
###~~~~~~~~~~~~~###
####~~~~~~~~~~~####
###~~~~~~~~~~~~~###
#~~~~~~~~~~~~~~~~~#
~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~
~~~~~~~~#H#~~~~~~~~
~~~~~~~######~~~~~~
~~~~~##########~~~~
    `.trim(),
    state: {
        ship: {
            x: 9,
            y: 11,
            goods: [],
        },
        score: 0,
        pirates: [],
        goodsInPort: [
            {
                name: 'fabric',
                amount: 3000,
                volume: 3,
            },
            {
                name: 'fish',
                amount: 3000,
                volume: 1,
            },
            {
                name: 'spices',
                amount: 3000,
                volume: 30,
            },
            {
                name: 'tea',
                amount: 3000,
                volume: 50,
            },
        ],
        ports: [
            {
                portId: 0,
                x: 9,
                y: 11,
                isHome: true,
            },
            {
                portId: 1,
                x: 9,
                y: 1,
                isHome: false,
            }
        ],
        prices: [
            {
                portId: 1,
                fabric: 10,
                fish: 3,
                spices: 100,
                tea: 170,
            }
        ]
    },
};

const level3 = {
    map: `
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~O~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~O~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~O~~~~~~H~~~~~~~~~O
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~O~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~O~~~~~~~~~~
    `.trim(),
    state: {
        ship: {
            x: 9,
            y: 9,
            goods: [],
        },
        score: 0,
        pirates: [],
        goodsInPort: [
            {
                name: 'fabric',
                amount: 3000,
                volume: 3,
            },
        ],
        ports: [
            {
                portId: 0,
                x: 9,
                y: 9,
                isHome: true,
            },
            {
                portId: 1,
                x: 9,
                y: 1, 
                isHome: false,
            },
            {
                portId: 2,
                x: 9,
                y: 19, 
                isHome: false,
            },
            {
                portId: 3,
                x: 2, 
                y: 9,
                isHome: false,
            },
            {
                portId: 4,
                x: 19, 
                y: 9,
                isHome: false,
            },
            {
                portId: 5,
                x: 14, 
                y: 14, 
                isHome: false,
            },
            {
                portId: 6,
                x: 5, 
                y: 5, 
                isHome: false,
            },
        ],
        prices: [
            {
                portId: 1,
                fabric: 30,
            },
            {
                portId: 2,
                fabric: 38,
            },
            {
                portId: 3,
                fabric: 27,
            },
            {
                portId: 4,
                fabric: 39,
            },
            {
                portId: 5,
                fabric: 43,
            },
            {
                portId: 6,
                fabric: 35,
            },
        ]
    },
};

const level4 = {
    map: `
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~O~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~O~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~O~~~~~~H~~~~~~~~~O
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~O~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~O~~~~~~~~~~
    `.trim(),
    state: {
        ship: {
            x: 9,
            y: 9,
            goods: [],
        },
        score: 0,
        pirates: [],
        goodsInPort: [
            {
                name: 'fabric',
                amount: 3000,
                volume: 3,
            },
            {
                name: 'fish',
                amount: 3000,
                volume: 1,
            },

            {
                name: 'gold',
                amount: 5,
                volume: 3,
            },

            {
                name: 'tea',
                amount: 10,
                volume: 50,
            },

            {
                name: 'spices',
                amount: 15,
                volume: 30,
            },

            {
                name: 'wheat',
                amount: 3000,
                volume: 10,
            },

        ],
        ports: [
            {
                portId: 0,
                x: 9,
                y: 9,
                isHome: true,
            },
            {
                portId: 1,
                x: 9,
                y: 1,
                isHome: false,
            },
            {
                portId: 2,
                x: 9,
                y: 19,
                isHome: false,
            },
            {
                portId: 3,
                x: 2,
                y: 9,
                isHome: false,
            },
            {
                portId: 4,
                x: 19,
                y: 9,
                isHome: false,
            },
            {
                portId: 5,
                x: 14,
                y: 14,
                isHome: false,
            },
            {
                portId: 6,
                x: 5,
                y: 5,
                isHome: false,
            },
        ],
        prices: [
            {
                portId: 1,
                fabric: 30,
                gold: 150,
                tea: 165,
                spices: 98,
            },
            {
                portId: 2,
                fabric: 38,
                fish: 14,
                gold: 110,
                tea: 171,
                wheat: 30,
            },
            {
                portId: 3,
                fabric: 27,
                fish: 16,
                gold: 151,
                spices: 112,
            },
            {
                portId: 4,
                fish: 15,
                gold: 154,
                spices: 101,
                wheat: 25,
            },
            {
                portId: 5,
                fabric: 43,
                fish: 11,
                tea: 173,
                spices: 90,
            },
            {
                portId: 6,
                gold: 146,
                tea: 169,
                spices: 110,
                wheat: 32,
            },
        ]
    },
};

const level5 = {
    map: `
~~~~~~~~~~~~~~~~####
~~~~~~~~~~~~~~~~~O##
~~~~~~O~~~~~~~~~~~##
~~~~~###~~~~#~~~~~~~
~~~~~##~~~~~##~~~~~~
##~~~~~~~~~~~#~~~~~~
##~~~~~~~~~~~~~~~~~#
#~~~~~~~~~####~~~###
~~~~~~~~~###H~~~~~##
~~~##~~~~~####~~~~~~
~~####~~~~~~~~~~~~~~
~~#O#~~~~~~~~~~~~~~#
~~~~~~~~~~~~~~~~~~O#
~~~~~~~~~~~~~~~~~###
~~~~~~~~~~##~~~~~~##
#~~~~~~~~####O~~~~~#
##~~~~~~~~####~~~~~~
#~~~~~~~~~~O##~~~~~~
~~~~~~~~~~~~#~~~~~~~
~~~~~~~~~~~~~~~~~~~~
    `.trim(),
    state: {
        ship: {
            x: 12,
            y: 8,
            goods: [],
        },
        score: 0,
        pirates: [],
        goodsInPort: [
            {
                name: 'fabric',
                amount: 3000,
                volume: 3,
            },
            {
                name: 'fish',
                amount: 3000,
                volume: 1,
            },

            {
                name: 'gold',
                amount: 5,
                volume: 3,
            },

            {
                name: 'tea',
                amount: 10,
                volume: 50,
            },

            {
                name: 'spices',
                amount: 15,
                volume: 30,
            },

            {
                name: 'wheat',
                amount: 3000,
                volume: 10,
            },

        ],
        ports: [
            {
                portId: 0,
                x: 12,
                y: 8,
                isHome: true,
            },
            {
                portId: 1,
                x: 17,
                y: 1,
                isHome: false,
            },
            {
                portId: 2,
                x: 6,
                y: 2,
                isHome: false,
            },
            {
                portId: 3,
                x: 3,
                y: 11,
                isHome: false,
            },
            {
                portId: 4,
                x: 18,
                y: 12,
                isHome: false,
            },
            {
                portId: 5,
                x: 13,
                y: 15,
                isHome: false,
            },
            {
                portId: 6,
                x: 11,
                y: 17,
                isHome: false,
            },
        ],
        prices: [
            {
                portId: 1,
                fabric: 30,
                gold: 150,
                tea: 165,
                spices: 98,
            },
            {
                portId: 2,
                fabric: 38,
                fish: 14,
                gold: 110,
                tea: 171,
                wheat: 30,
            },
            {
                portId: 3,
                fabric: 27,
                fish: 16,
                gold: 151,
                spices: 112,
            },
            {
                portId: 4,
                fish: 15,
                gold: 154,
                spices: 101,
                wheat: 25,
            },
            {
                portId: 5,
                fabric: 43,
                fish: 11,
                tea: 173,
                spices: 90,
            },
            {
                portId: 6,
                gold: 146,
                tea: 169,
                spices: 110,
                wheat: 32,
            },
        ]
    },
};

const level6 = {
    map: `
~~~~~#########~~~~~
~~~~~~~##O##~~~~~~~
~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~
#~~~~~~~~~~~~~~~~~#
###~~~~~~~~~~~~~###
####~~~~~~~~~~~####
###~~~~~~~~~~~~~###
#~~~~~~~~~~~~~~~~~#
~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~
~~~~~~~~#H#~~~~~~~~
~~~~~~~######~~~~~~
~~~~~##########~~~~
    `.trim(),
    state: {
        ship: {
            x: 9,
            y: 11,
            goods: [],
        },
        score: 0,
        pirates: [{ x: 4, y: 6 }],
        goodsInPort: [
            {
                name: 'fabric',
                amount: 3000,
                volume: 3,
            },
        ],
        ports: [
            {
                portId: 0,
                x: 9,
                y: 11,
                isHome: true,
            },
            {
                portId: 1,
                x: 9,
                y: 1,
                isHome: false,
            }
        ],
        prices: [
            {
                portId: 1,
                fabric: 10,
            }
        ]
    },
    piratesPoints: [[{ x: 4, y: 6 }, { x: 14, y: 6 }]],
};

const level7 = {
    map: `
~~~~~~~~~~~~~~~~####
~~~~~~~~~~~~~~~~~O##
~~~~~~O~~~~~~~~~~~##
~~~~~###~~~~#~~~~~~~
~~~~~##~~~~~##~~~~~~
##~~~~~~~~~~~#~~~~~~
##~~~~~~~~~~~~~~~~~#
#~~~~~~~~~####~~~###
~~~~~~~~~###H~~~~~##
~~~##~~~~~####~~~~~~
~~####~~~~~~~~~~~~~~
~~#O#~~~~~~~~~~~~~~#
~~~~~~~~~~~~~~~~~~O#
~~~~~~~~~~~~~~~~~###
~~~~~~~~~~##~~~~~~##
#~~~~~~~~####O~~~~~#
##~~~~~~~~####~~~~~~
#~~~~~~~~~~O##~~~~~~
~~~~~~~~~~~~#~~~~~~~
~~~~~~~~~~~~~~~~~~~~
    `.trim(),
    state: {
        ship: {
            x: 12,
            y: 8,
            goods: [],
        },
        score: 0,
        pirates: [
            {x: 6, y: 11},
            {x: 2, y: 6},
        ],
        goodsInPort: [
            {
                name: 'fabric',
                amount: 3000,
                volume: 3,
            },
            {
                name: 'fish',
                amount: 3000,
                volume: 1,
            },

            {
                name: 'gold',
                amount: 5,
                volume: 3,
            },

            {
                name: 'tea',
                amount: 10,
                volume: 50,
            },

            {
                name: 'spices',
                amount: 15,
                volume: 30,
            },

            {
                name: 'wheat',
                amount: 3000,
                volume: 10,
            },

        ],
        ports: [
            {
                portId: 0,
                x: 12,
                y: 8,
                isHome: true,
            },
            {
                portId: 1,
                x: 17,
                y: 1,
                isHome: false,
            },
            {
                portId: 2,
                x: 6,
                y: 2,
                isHome: false,
            },
            {
                portId: 3,
                x: 3,
                y: 11,
                isHome: false,
            },
            {
                portId: 4,
                x: 18,
                y: 12,
                isHome: false,
            },
            {
                portId: 5,
                x: 13,
                y: 15,
                isHome: false,
            },
            {
                portId: 6,
                x: 11,
                y: 17,
                isHome: false,
            },
        ],
        prices: [
            {
                portId: 1,
                fabric: 30,
                gold: 150,
                tea: 165,
                spices: 98,
            },
            {
                portId: 2,
                fabric: 38,
                fish: 14,
                gold: 110,
                tea: 171,
                wheat: 30,
            },
            {
                portId: 3,
                fabric: 27,
                fish: 16,
                gold: 151,
                spices: 112,
            },
            {
                portId: 4,
                fish: 15,
                gold: 154,
                spices: 101,
                wheat: 25,
            },
            {
                portId: 5,
                fabric: 43,
                fish: 11,
                tea: 173,
                spices: 90,
            },
            {
                portId: 6,
                gold: 146,
                tea: 169,
                spices: 110,
                wheat: 32,
            },
        ]
    },
    piratesPoints: [
        [{x: 6, y: 11}, {x: 16, y: 11}, {x: 16, y: 12}, {x: 6, y: 12}],
        [{x: 2, y: 6}, {x: 9, y: 6}]
    ],
};

export default {
    1: level1,
    2: level2,
    3: level3,
    4: level4,
    5: level5,
    6: level6,
    7: level7,
}