const wrapperElement = document.querySelector('.map-wrapper');
const mapElement = document.querySelector('.map');


export function renderMap (map) {
    clearMap();
    const mapRows = map.trim().split('\n').map(r => r.trim());
    const mapWidth = mapRows[0].length;
    mapElement.style.setProperty('--map-columns-count', mapWidth);

    for (let y = 0; y < mapRows.length; y++) {
        for (let x = 0; x < mapRows[0].length; x++) {
            const cellElement = createCell(mapRows[y][x]);
            cellElement.id = `${x}_${y}`;
            mapElement.appendChild(cellElement);
        }
    }
}

function clearMap () {
    mapElement.innerHTML = '';

    const shipElement = document.createElement('div');
    if (shipElement) shipElement.remove();

    const piratesElements = document.querySelectorAll('.pirates');
    piratesElements.forEach(i => i.remove());
    
    const history = document.querySelector('.history-list');
    history.innerHTML = '';
}

function createCell (cell) {
    const cellElement = document.createElement('div');
    cellElement.classList.add('cell');

    let type = getCellType(cell);
    cellElement.classList.add(type);
    return cellElement;
}

function getCellType (cell) {
    switch (cell) {
        case '~':
            return 'sea';
        case '#':
            return 'earth';
        case 'O':
            return 'port';
        case 'H':
            return 'home';
        default:
            return 'empty';
    }
}

export function renderInterface (state, step = 0, command) {
    const hiddenSidebar = document.querySelector('.sidebar.hidden');
    if (hiddenSidebar) {
        hiddenSidebar.classList.remove('hidden');
    }

    updateMap(state.ship, state.pirates);
    renderStep(step);
    renderScore(state.score);
    renderGoods(state.ship.goods);
    
    if (command) {
        renderHistory(step, command);
    }
}

function updateMap (shipCoordinates, piratesCoordinates = []) {
    const shipElement = document.getElementById('ship');
    if (!shipElement) {
        createShip(shipCoordinates);
    } else {
        moveElement(shipElement, shipCoordinates);
    }

    if (!piratesCoordinates.length) {
        return;
    }

    const piratesElements = document.querySelectorAll('.pirates');
    if (!piratesElements || !piratesElements.length) {
        createPirates(piratesCoordinates);
    } else {
        movePirates(piratesElements, piratesCoordinates);
    }
}

function createShip (coordinates) {
    const shipElement = document.createElement('div');
    shipElement.id = 'ship';

    const size = getSize();
    shipElement.style.width = size.width + 'px';
    shipElement.style.height = size.height + 'px';

    moveElement(shipElement, coordinates);

    wrapperElement.appendChild(shipElement);
}

function moveElement (element, coordinates) {
    const targetCell = document.getElementById(`${coordinates.x}_${coordinates.y}`);
    const wrapperRect = wrapperElement.getBoundingClientRect();
    const rect = targetCell.getBoundingClientRect();
    let left = rect.left - wrapperRect.left + 'px';
    const top = rect.top - wrapperRect.top + 'px';

    element.style.transform = `translate(${left}, ${top})`;
}

function createPirates (coordinates) {
    for (const coordinate of coordinates) {
        const pirateElement = document.createElement('div');
        pirateElement.classList.add('pirates');

        const size = getSize();
        pirateElement.style.width = size.width + 'px';
        pirateElement.style.height = size.height + 'px';

        moveElement(pirateElement, coordinate);

        wrapperElement.appendChild(pirateElement);
    }
}

function movePirates (elements, coordinates) {
    for (let i = 0; i < elements.length; i++) {
        moveElement(elements[i], coordinates[i]);
    }
}

function getSize () {
    const cell = mapElement.children[0];
    const rect = cell.getBoundingClientRect();

    return {
        width: rect.width,
        height: rect.height,
    };
}

function renderScore (score) {
    const scoreElement = document.querySelector('.score');
    scoreElement.innerText = `Счет: ${score} монет`;
}

function renderStep (step) {
    const scoreElement = document.querySelector('.step');
    scoreElement.innerText = `Ход №${step}`;
}

function renderGoods (goods) {
    const goodsContainer = document.querySelector('.goods');
    const empty = document.querySelector('.empty-goods');

    if (!goods.length) {
        goodsContainer.classList.add('hide');
        empty.classList.remove('hide');
        return;
    }

    goodsContainer.innerHTML = '';
    empty.classList.add('hide');
    goodsContainer.classList.remove('hide');

    for (const item of goods) {
        const li = document.createElement('li');
        li.innerText = `${item.name}: ${item.amount}`;
        goodsContainer.appendChild(li);
    }
}

function renderHistory(step, command) {
    let text = `Ход №${step}, `;
    
    switch (command.type) {
        case 'SELL':
            text += `корабль продал ${command.amount} ед. ${command.name} по цене ${command.price} монет за штуку`;
            break;
        case 'LOAD':
            text += `корабль загрузил ${command.amount} ед. ${command.name}`;
            break;
        case 'UNLOAD':
            text += `корабль выгрузил ${command.amount} ед. ${command.name}`;
            break;
        default:
            text += 'корабль сделал что-то странное';
            break;
    }
    
    const li = document.createElement('li');
    li.innerText = text;
    
    const list = document.querySelector('.history-list');
    const firstItem = list.querySelector('li');
    if (firstItem) {
        list.insertBefore(li, firstItem);
    } else {
        list.appendChild(li);
    }
}

export function renderTextOverMap (text, description) {
    const backdropElement = document.createElement('div');
    backdropElement.classList.add('backdrop');
    wrapperElement.appendChild(backdropElement);

    const wrapper = document.createElement('div');
    wrapper.classList.add('text-over-map-wrapper');

    const textElement = document.createElement('h3');
    textElement.classList.add('text-over-map');
    textElement.innerText = text;
    wrapper.appendChild(textElement);

    if (description) {
        const textElement = document.createElement('p');
        textElement.classList.add('small-text-over-map');
        textElement.innerText = description;
        wrapper.appendChild(textElement);
    }
    wrapperElement.appendChild(wrapper);
}

export function removeTextOverMap () {
    const backdrop = document.querySelectorAll('.backdrop');
    const textOverMap = document.querySelectorAll('.text-over-map-wrapper');

    if (backdrop) backdrop.forEach(i => i.remove());
    if (textOverMap) textOverMap.forEach(i => i.remove());
}
