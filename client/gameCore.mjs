import { startGame, getNextCommand } from './game.mjs';
import { renderInterface, renderTextOverMap } from './render.mjs';

const MAX_INITIAL_FUNC_DURATION = 1000;
const MAX_STEPS = 180;
const MAX_CALC_DURATION = 100;
const MAX_VOLUME = 368;

let currentGames = [];

export default async function startGameLoop(map, state, piratesPoints = []) {
    runStartGameFunc(map, state);
    const game = new Game(map, state, piratesPoints);
    currentGames.push(game);

    let step = 1;

    while (true) {
        if (currentGames.length > 1 && currentGames[0] === game) {
            break;
        }

        if (step === MAX_STEPS) {
            renderInterface(game.state, step);
            renderTextOverMap('Игра окончена', `Прошло ${ step } ходов`);
            break;
        }
        if (game.checkAllSold()) {
            renderInterface(game.state, step);
            renderTextOverMap('Игра окончена', `Все товары проданы`);
            break;
        }
        let commandForRender = null;

        try {
            performance.mark('getStep');
            const command = getNextCommand(game.state).trim();
            performance.measure('calcNextStep', 'getStep');

            const calcDuration = performance.getEntriesByName('calcNextStep')[0].duration;

            if (calcDuration > MAX_CALC_DURATION) {
                throw new Error('Слишком долгое вычисление');
            }

            runCommand(command, game);
            movePirates(game);
            commandForRender = createCommandForRenderHistory(command, game)
        } catch (err) {
            game.score = 0;
            renderTextOverMap('Game Over', err.message);
            console.error(err);
            break;
        } finally {
            performance.clearMarks();
            performance.clearMeasures();
            renderInterface(game.state, step, commandForRender);
        }

        await delay(100);
        step++;
    }

    currentGames.shift();
    return game.score;
}

function runStartGameFunc(map, state) {
    performance.mark('initStart');
    startGame(map, state);
    performance.measure('calcInit', 'initStart');

    const calcDuration = performance.getEntriesByName('calcInit')[0].duration;
    if (calcDuration > MAX_INITIAL_FUNC_DURATION) {
        renderTextOverMap('Игра окончена', `Слишком долгое вычисление`);
        throw new Error('Слишком долгое вычисление');
    }
}

function delay(time) {
    return new Promise(res => setTimeout(res, time));
}

const directions = {
    N: { x: 0, y: -1 },
    S: { x: 0, y: 1 },
    W: { x: -1, y: 0 },
    E: { x: 1, y: 0 },
};

const tiles = {
    earth: '#',
    sea: '~',
    port: 'O',
    home: 'H',
};

class Game {
    constructor(map, state, piratesPoints) {
        this.map = map.trim().split('\n');
        this.score = state.score;

        this.ship = { ...state.ship, goods: { ...state.ship.goods } };
        this.pirates = state.pirates.map((p, i) => new Pirate(p, piratesPoints[i]));

        this.ports = [];
        for (const port of state.ports) {
            const copy = { ...port };
            if (port.isHome) {
                this.home = copy;
            } else {
                this.ports.push(copy);
            }
        }

        this.pricesByPorts = state.prices.reduce((acc, item) => {
            acc[item.portId] = { ...item };
            return acc;
        }, {});

        this.goodsInPort = state.goodsInPort.reduce((acc, item) => {
            acc[item.name] = { ...item };
            return acc;
        }, {});
    }

    checkAllSold() {
        return Object.values(this.goodsInPort).every(i => i.amount === 0)
            && Object.values(this.ship.goods).every(i => i === 0);
    }

    move(command) {
        const direction = directions[command];
        const x = this.ship.x + direction.x;
        const y = this.ship.y + direction.y;

        if (!checkCoordinates(x, y, this.map)) {
            throw new Error('Невалидное направление движения');
        }

        this.ship.x = x;
        this.ship.y = y;
    }

    get state() {
        return {
            score: this.score,
            ship: {
                ...this.ship,
                goods: Object.entries(this.ship.goods)
                    .map(([ name, amount ]) => ({ name, amount }))
                    .filter(i => i.amount > 0),
            },
            pirates: this.pirates.map(i => i.coords),
            goodsInPort: Object.values(this.goodsInPort).filter(i => i.amount > 0),
            ports: [
                { ...this.home, isHome: true },
                ...this.ports.map(i => ({ ...i, isHome: false })),
            ],
            prices: Object.values(this.pricesByPorts),
        };
    }

    sell(productName, amount) {
        if (!amount || amount < 0) {
            throw new Error('Вес товара должен быть > 0 тонн');
        }

        const currentPort = this.ports.find(port => port.x === this.ship.x && port.y === this.ship.y);
        if (!currentPort) {
            throw new Error('Нельзя продавать товар не в порту');
        }

        let sellingProduct = this.ship.goods[productName];
        if (!sellingProduct || sellingProduct < amount) {
            throw new Error('Выбранного товара на корабле нет или меньше необходимого');
        }

        const price = this.pricesByPorts[currentPort.portId];
        if (!price[productName]) {
            throw new Error(`В этом порту ${ productName } продать нельзя`);
        }

        this.score += price[productName] * amount;
        this.ship.goods[productName] -= amount;
    }

    load(productName, amount) {
        if (!amount || amount < 0) {
            throw new Error('Вес товара должен быть > 0 тонн');
        }
        if (this.ship.x !== this.home.x || this.ship.y !== this.home.y) {
            throw new Error('Товар можно загружать только в домашнем порту');
        }

        const productInPort = this.goodsInPort[productName];
        if (!productInPort || productInPort.amount < amount) {
            throw new Error('В порту нет или недостаточно товара');
        }

        if (productName in this.ship.goods) {
            this.ship.goods[productName] += amount;
        } else {
            this.ship.goods[productName] = amount;
        }

        if (this.calcShipGoodsVolume() > MAX_VOLUME)
            throw new Error('Количество товаров превысило вместимость корабля');

        productInPort.amount -= amount;
    }

    unload(productName, amount) {
        if (!amount || amount < 0) {
            throw new Error('Вес товара должен быть > 0 тонн');
        }
        if (this.ship.x !== this.home.x || this.ship.y !== this.home.y) {
            throw new Error('Товар можно выгружать только в домашнем порту');
        }

        let sellingProduct = this.ship.goods[productName];
        if (!sellingProduct || sellingProduct.amount < amount) {
            throw new Error('Выбранного товара на корабле нет или меньше необходимого');
        }

        this.ship.goods[productName] -= amount;

        if (productName in this.goodsInPort) {
            this.goodsInPort[productName] += amount;
        } else {
            this.goodsInPort[productName] = amount;
        }

    }

    calcShipGoodsVolume() {
        return Object.entries(this.ship.goods).reduce((acc, [ name, amount ]) => acc + amount * this.goodsInPort[name].volume, 0);
    }
}

class Pirate {
    constructor(coordinates, points) {
        this.x = coordinates.x;
        this.y = coordinates.y;
        this.points = points;
        this.lastPointIndex = 0;
        this.nextPoint = this.getNextPoint();
    }

    get coords() {
        return {
            x: this.x,
            y: this.y,
        };
    }

    nextMove(shipCoordinates) {
        if (this.checkShipNearby(shipCoordinates)) {
            this.x = shipCoordinates.x;
            this.y = shipCoordinates.y;
            throw new Error('Пираты захватили ваш корабль');
        }

        if (this.x !== this.nextPoint.x) {
            this.x += this.x < this.nextPoint.x ? 1 : -1;
            return;
        }
        if (this.y !== this.nextPoint.y) {
            this.y += this.y < this.nextPoint.y ? 1 : -1;
            return;
        }
        this.lastPointIndex = this.getNextPointIndex();
        this.nextPoint = this.getNextPoint();
        this.nextMove(shipCoordinates);
    }

    checkShipNearby(shipCoordinates) {
        const neighbours = this.getNeighbourCells();
        return neighbours.some(c => c.x === shipCoordinates.x && c.y === shipCoordinates.y);
    }

    getNextPointIndex() {
        return (this.lastPointIndex + 1) % this.points.length;
    }

    getNextPoint() {
        return this.points[this.getNextPointIndex()];
    }

    getNeighbourCells() {
        return [
            { x: this.x, y: this.y },
            { x: this.x + 1, y: this.y },
            { x: this.x - 1, y: this.y },
            { x: this.x, y: this.y + 1 },
            { x: this.x, y: this.y - 1 },
        ];
    }
}

function checkCoordinates(x, y, map) {
    if (x < 0 || y < 0) {
        return false;
    }

    const height = map.length;
    const width = map[0].length;
    if (x >= width || y >= height) {
        return false;
    }

    if (map[y][x] === tiles.earth) {
        return false;
    }

    return true;
}

function runCommand(rowCommand, game) {
    const [ command, productName, amount ] = rowCommand.split(' ');

    switch (command) {
        case 'N':
        case 'E':
        case 'S':
        case 'W':
            game.move(command);
            break;
        case 'WAIT':
            break;
        case 'SELL':
            game.sell(productName.toLowerCase(), parseInt(amount));
            break;
        case 'LOAD':
            game.load(productName.toLowerCase(), parseInt(amount));
            break;
        case 'UNLOAD':
            game.unload(productName.toLowerCase(), parseInt(amount));
            break;
        default:
            throw new Error('Неизвестная команда');
    }
}

function createCommandForRenderHistory(rowCommand, game) {
    const [ command, productName, amount ] = rowCommand.split(' ');

    const commandForHistory = {
        type: command,
        amount: amount,
        name: productName,
    };

    switch (command) {
        case 'SELL':
            const currentPort = game.ports.find(port => port.x === game.ship.x && port.y === game.ship.y);
            commandForHistory.price = game.pricesByPorts[currentPort.portId][productName];
            return commandForHistory;
        case 'LOAD':
        case 'UNLOAD':
            return commandForHistory;
    }
}

function movePirates(game) {
    for (const pirate of game.pirates) {
        pirate.nextMove(game.ship);
    }
}
