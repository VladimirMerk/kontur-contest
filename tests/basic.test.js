import { expect } from "chai";
import { startGame, getNextCommand } from '../client/game';

const { map, state } = getDefaultLevel();

describe('basic', () => {
    it('getNextCommand возвращает строку', () => {
        startGame(map, state);
        expect(typeof getNextCommand(state)).to.equal('string');
    });
    it('getNextCommand возвращает валидную команду', () => {
        startGame(map, state);
        const commands = ['N', 'S', 'W', 'E', 'WAIT', 'SELL', 'LOAD', 'UNLOAD'];
        const nextCommand = getNextCommand(state).split(' ')[0]; 
        expect(commands).to.include(nextCommand);
    });
});

function getDefaultLevel() {
    return {
        map: `
~~~O~~~
~~~~~~~
~~~~~~~
~~~H~~~
    `.trim(),
        state: {
            ship: {
                x: 3,
                y: 3,
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
                    x: 3,
                    y: 3,
                    isHome: true,
                },
                {
                    portId: 1,
                    x: 3,
                    y: 0,
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
}

