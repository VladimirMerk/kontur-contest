import { expect } from "chai";
import levels from '../client/levels';
import { startGameLoop } from './testingGameCore';

let scoreSum = 0;

describe('maps', () => {
    const levelNumbers = Object.keys(levels);

    levelNumbers.forEach(levelNumber => {
        it(`level ${ levelNumber }`, () => {
            const { map, state, piratesPoints } = levels[levelNumber];
            
            const score = startGameLoop(map, state, piratesPoints);
            scoreSum += score;
            expect(score).to.above(0);
        });
    });

    after(() => {
        console.log(`---------------------------------------`);
        console.log(`   Сумма очков за все уровни ${ scoreSum }`);
        console.log(`---------------------------------------`);
    })
});

