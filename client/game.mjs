let tradingBot;

export function startGame(levelMap, gameState) {
  tradingBot = new TradingBot(levelMap, gameState);
}

export function getNextCommand(gameState) {
  tradingBot.updateState(gameState);
  const command = tradingBot.getCommand();
  return command || 'WAIT';
}

class TradingBot {
  static MaxShipVolume = 368;
  static MaxMoves = 180;
  static Commands = {
     wait: 'WAIT',
     load: 'LOAD',
     unload: 'UNLOAD',
     sell: 'SELL',
     up: 'N',
     down: 'S',
     left: 'W',
     right: 'E',
  };
  static Legend = {
     'sea': 0,
     'land': 1,
     'remotePort': 2,
     'homePort': 3,
     '~': 0, // sea
     '#': 1, // land
     'O': 2, // remote port
     'H': 3 // home port
  };

  constructor(levelMap, gameState) {
    this.pathFinder = new PathFinder(
      TradingBot.splitMapToArray(levelMap),
      TradingBot.Legend.land
    );

    this.gameState = JSON.parse(JSON.stringify(gameState));
    this.currentMoves = 0;
    this.pirates = this.gameState.pirates;
    this.piratesPrev = this.pirates;
    this.piratesPathInfo = Object.keys(this.pirates).map(() => {
      return {path: [], moves: 0, closed: false};
    });

    const ports = this.initializePorts();
    this.homePort = ports.homePort;
    this.allPorts = ports.allPorts;
    this.remotePorts = ports.remotePorts;

    this.goodsInPort = this.initializeGoods();

    this.ship = {
      x: this.gameState.ship.x,
      y: this.gameState.ship.y,
      previousX: this.gameState.ship.x,
      previousY: this.gameState.ship.x,
      maxVolume: TradingBot.MaxShipVolume,
      goods: this.goodsArrayToObject(gameState.ship)
    };


    this.actionsList = [];
    this.currentAction = null;
    this.planGenerator = new PlanGenerator(this.ship.maxVolume, this.homePort);
    this.antiPiracy = new AntiPiracy({
      actionFunction: this.Action,
      pathFinder: this.pathFinder
    });
  }

  get remainingMoves() {
    return TradingBot.MaxMoves - this.currentMoves;
  }

  /**
   * allPorts - Все порты, remotePorts - Все кроме домашнего, homePort - домашний
   * @return {Object} { allPorts: { Number portId: Port { Number portId, Number x, Number y, Boolean isHome, prices: { String productName: Number price, ... }, routes: { Number portId: {Array track: [{x, y}], Number length}, ... } }, ... }, remotePorts: {portId: Port, ... }, homePort: Port }
   */
  initializePorts() {
    const portsArray = this.gameState.ports.map(port => {
      return {
        ...port,
        prices: this.getPricesByPortId(port.portId),
        routes: this.getRoutesToPorts(port.portId)
      };
    })

    const homePort = portsArray.find(port => port.isHome);

    // Удаляем недостижимые пути из маршрутов домашнего порта
    Object.keys(homePort.routes).forEach(portId => {
      if (homePort.routes[portId].length !== Infinity) return;
      delete homePort.routes[portId];
    })

    const allPorts = portsArray.filter(port => {
      // Оставляем только те порты, что есть в маршрутах домашнего порта
      return port === homePort || homePort.routes[port.portId] !== undefined;
    }).reduce((result, port) => {
      result[port.portId] = port;
      return result;
    }, {});

    const remotePorts = Object.values(allPorts).filter((port) => {
      return ! port.isHome;
    }).reduce((result, port) => {
      result[port.portId] = port;
      return result;
    }, {});

    return {
      allPorts,
      remotePorts,
      homePort
    };
  }

  /**
   * Получает маршруты от порта с portId до всех остальных портов
   */
  getRoutesToPorts(portId) {
    const fromPort = this.getPortById(portId);
    return this.gameState.ports.reduce((routes, port) => {
      if (port.portId !== portId) {
        const ignore = this.pirates.reduce((result, pirate) => {
          result.push(...PathFinder.getNeighboringPoints(pirate));
          return result;
        },[]);
        routes[port.portId] = this.getRoute(fromPort, port, ignore)
        if (routes[port.portId].length !== Infinity) {
          routes[port.portId] = this.getRoute(fromPort, port)
        }
      }
      return routes;
    }, Object.create(null));
  }

  /**
   * Получает маршрут от точки from до to. Если длина пути length бесконечна, то до конечной точки не добраться (маршрут перекрыт)
   * @param  {Object} from   {x, y}
   * @param  {Object} to     {x, y}
   * @param  {Array} ignore [{x, y}, ...]
   * @return {Object}        {Array track: [{x, y}], Number length}
   */
  getRoute(from, to, ignore) {
    const track = this.pathFinder.find(from, to, ignore);
    const length = track.length - 1;
    return {
      track: track,
      length: length || Infinity
    };
  }

  getPortById(portId) {
    return this.allPorts && this.allPorts[portId]
           || this.gameState.ports.find((port) => port.portId === portId);
  }

  /**
   * Возвращает список товаров и цен на них
   * @param  {Number} portId
   * @return {Object}        { String productName: Number price, ... }
   */
  getPricesByPortId(portId) {
    const pricesInPort = this.gameState.prices.find((pricesInPort) => {
      return pricesInPort.portId === portId;
    });
    if (pricesInPort) {
      delete pricesInPort.portId;
    }
    return pricesInPort;
  }

  initializeGoods () {
    return this.getProductsInfo(this.gameState.goodsInPort);
  }

  /**
   * Возвращает объект с portId и ценами на указанный товар
   * @param  {String} productName
   * @return {Object}             { portId: price, ... }
   */
  getPricesByProductName(productName) {
    const ports = Object.values(this.remotePorts);
    const portsList = {};
    ports.forEach(port => {
      const prices = Object.entries(port.prices);
      prices.forEach(([portProducnName, price]) => {
        if (portProducnName !== productName) return;
        portsList[port.portId] = price;
      });
    });
    return portsList;
  }

  updateState(state, init = false) {
    this.currentMoves += 1;
    this.updateShip(state.ship);
    this.updateGoodsInPort(state.goodsInPort);
    this.updatePirates(state.pirates);
  }

  updateShip(ship) {
    this.ship.previousX = this.ship.x;
    this.ship.previousY = this.ship.y;
    this.ship.x = ship.x;
    this.ship.y = ship.y;
    this.ship.goods = this.goodsArrayToObject(ship.goods);
  }

  /**
   * Преобразует массив товаров на корбле в объект
   * @param  {Array} goods [{ productName, amount }, ... ]
   * @return {Object}      { productName: amount, ... }
   */
  goodsArrayToObject(goods) {
    if (! goods.length) return {};
    if (! goods[0].name) return goods;
    const goodsObject = goods.reduce((goods, product) => {
      goods[product.name] = product.amount;
      return goods;
    }, {});
    return goods = goodsObject;
  }

  updateGoodsInPort(products) {
    this.goodsInPort = this.getProductsInfo(products);
  }

  updatePirates(pirates) {
    this.piratesPrev = this.pirates;
    this.pirates = pirates;
    this.buildPiratePaths();
  }

  /**
   * Формирует список товаров с количеством, объёмом и ценами на этот товар в разных портах.
   * @param  {Array} products [Object { name, amount, volume }, ... ]
   * @return {Object} { String productName: { String name, Number amount, Number volume, Object prices: { Number portId: Number price } }, ... }
   */
  getProductsInfo (products) {
    return products.reduce((result, product) => {
      result[product.name] = {
        name: product.name,
        amount: product.amount,
        volume: product.volume,
        prices: this.getPricesByProductName(product.name)
      };
      // Если ни один порт не покупает этот товар, удаляем
      if (Object.keys(result[product.name].prices).length === 0) {
        delete result[product.name];
      }
      return result;
    }, Object.create(null));
  }

  /**
   * Строит маршрут пиратского корабля и направление движения
   * this.piratesPathInfo = [{Number moves, Boolean closed, Array path}, ... ]
   */
  buildPiratePaths() {
    this.pirates.forEach((pirate, index) => {
      const pathInfo = this.piratesPathInfo[index];
      pathInfo.moves = this.currentMoves - 1;
      if (pathInfo.closed === true) return;

      const prevPirate = this.piratesPrev[index];
      const direction = PathFinder.vectorDirection(prevPirate, pirate);
      const firstPoint = pathInfo.path[0];

      if (
        firstPoint !== undefined
        && PathFinder.isPointsEqual(firstPoint, pirate)
      ) {
        // Путь замкнулся
        const firstDirection = PathFinder.vectorDirection(pirate, prevPirate);
        pathInfo.closed = true;
        [ firstPoint.dx, firstPoint.dy ] = [ firstDirection.x, firstDirection.y ];
      } else {
        pathInfo.path.push({
          x: pirate.x,
          y: pirate.y,
          dx: direction.x,
          dy: direction.y
        });
      }
    });
  }

  getCommand () {
    if (! this.actionsList.length) {
      this.actionsList = this.prepareActionList();
    }
    let command = this.getNextCommand();
    return command;
  }

  getNextCommand() {
    let nextCommand = TradingBot.Commands.wait;

    if (this.actionsList.length) {
      let nextAction = this.actionsList[0];

      switch (nextAction.title) {
        case 'move':
          if (! PathFinder.isPointsEqual(this.ship, nextAction.to)) {
            // Продолжение движения
            const shipPointIndex = nextAction.track.findIndex(point => {
              return PathFinder.isPointsEqual(this.ship, point);
            });

            // Если маршрута нет - перестраиваем
            if (shipPointIndex < 0) {
              this.actionsList[0] = this.Action().move({ to: nextAction.to });
              return this.getCommand();
            }

            const nextShipPoint = nextAction.track[shipPointIndex + 1];

            this.antiPiracy.update({
              pirates: this.pirates,
              piratesPrev: this.piratesPrev,
              piratesPath: this.piratesPathInfo,
              shipPoint: this.ship,
              nextShipPoint: nextShipPoint,
              target: nextAction.to
            });

            const isDanger = this.antiPiracy.isDanger({
              pirates: this.pirates,
              piratesPrev: this.piratesPrev,
              piratesPath: this.piratesPathInfo,
              nextShipPoint: nextShipPoint,
            });

            if (isDanger && ! nextAction.maneuver) {
              // Если пираты, строим обходной путь и включаем режим маневрирования
              this.actionsList.unshift(this.antiPiracy.maneuver());
              return this.getCommand();
            } else if (! isDanger && nextAction.maneuver) {
              // Если опасность миновала, то выключаем режим маневрирования
              nextAction.maneuver = false;
            }

            nextAction.nextPoint = nextShipPoint;

          } else {
            // Конец движения
            this.actionsList.shift();
            return this.getCommand();
          }
          break;
        default:
          this.actionsList.shift();
          break;
      }

      nextCommand = this.getCommandForAction(nextAction);
    }

    return nextCommand;
  }

  prepareActionList() {
    const actionList = [];
    let lastPortId = this.homePort.portId;
    // Если корабль не дома, возвращаемся
    if (! PathFinder.isPointsEqual(this.ship, this.homePort)) {
      actionList.push( this.Action().move( { to: this.homePort } ) );
    }

    // Получаем план самой выгодной продажи
    const plan = this.planGenerator.generate({
      productsObject: this.goodsInPort,
      portsObject:    this.remotePorts,
      remainingMoves: this.remainingMoves,
      piratesPathInfo: this.piratesPathInfo
    });

    if (! plan) return actionList;

    // Если на корабле уже есть товары, то сверяем их с планом и догружаем
    const existingProductsCount = Object.assign({}, this.ship.goods);
    Object.keys(existingProductsCount).forEach(productName => {
      const loadProduct = plan.loading.find(product => {
        return product.name === productName;
      });

      if (! loadProduct) return;

      if (loadProduct.count >= existingProductsCount[productName]) {
        loadProduct.count -= existingProductsCount[productName];
        existingProductsCount[productName] = 0;
      } else {
        existingProductsCount[productName] -= loadProduct.count;
        loadProduct.count = 0;
      }
    });

    // выгружаем излишки
    Object.keys(existingProductsCount).forEach(productName => {
      const product = {
        name: productName,
        count: existingProductsCount[productName]
      };
      if (product.count > 0) {
        actionList.push( this.Action().unload( product ) );
      }
    });

    // Загружаем товары
    for (const product of plan.loading) {
      if (product.count <= 0) continue;
      actionList.push( this.Action().loading( product ) );
    }

    for (const portIndex in plan.sale) {
      const remotePort = plan.route[portIndex];
      const sellProducts = plan.sale[portIndex];

      // Плывём до удалённого порта
      actionList.push( this.Action().move( {
        from: this.getPortById(lastPortId),
        to:   remotePort
      } ) );

      lastPortId = remotePort.portId;

      // и продаём товары
      sellProducts.forEach(productHash => {
        const product = plan.loading.find((p) => p.hash === productHash);
        actionList.push( this.Action().sell( product ) );
      });
    }

    // Возвращаемся домой
    actionList.push( this.Action().move( {
      from: this.getPortById(lastPortId),
      to:   this.homePort
    } ) );

    return actionList;
  }

  Action (args = {}) {
    return {
      move: ( { from = null, to } = {}) => {
        let track = null;
        if (from !== null) {
          track = from.routes[to.portId].track;
        } else {
          const ignore = Array.isArray(args.ignore) ? args.ignore : [];
          const weights = Array.isArray(args.weights) ? args.weights : [];
          track = this.pathFinder.find(this.ship, to, ignore, weights);
        }

        return {
          title: 'move',
          from:  from,
          to:    to,
          track: track,
          ...args
        };
      },
      loading: (product) => {
        return {
          title: 'load',
          name:  product.name,
          value: product.count,
          ...args
        };
      },
      unload: (product) => {
        return {
          title: 'unload',
          name:  product.name,
          value: product.count,
          ...args
        };
      },
      sell: (product) => {
        return {
          title: 'sell',
          name:  product.name,
          value: product.sales,
          ...args
        };
      },
      wait: () => {
        return {
          title: 'wait',
          ...args
        };
      }
    };
  }

  getCommandForAction (action) {
    let command = TradingBot.Commands.wait;
    switch (action.title) {
      case 'load':
        command = `${TradingBot.Commands.load} ${action.name} ${action.value}`;
        break;
      case 'sell':
        command = `${TradingBot.Commands.sell} ${action.name} ${action.value}`;
        break;
      case 'unload':
        command = `${TradingBot.Commands.unload} ${action.name} ${action.value}`;
        break;
      case 'move':
        const direction = PathFinder.vectorDirection(this.ship, action.nextPoint);
        if (direction.x === -1) {
          command = TradingBot.Commands.left;
        } else if (direction.x === 1) {
          command = TradingBot.Commands.right;
        } else if (direction.y === -1) {
          command = TradingBot.Commands.up;
        } else if (direction.y === 1) {
          command = TradingBot.Commands.down;
        }
        break;
    }
    return command;
  }

  static splitMapToArray(levelMap) {
    return levelMap.split("\n").map(line => {
      return Array.from(line, char => TradingBot.Legend[char]);
    });
  }
}

/**
 * При маневрировании строится хэш из всего что есть вокруг корабля. Этот хэш сравнивается с хэшами в таблице манёвров, полученными путём "обучения" с
 * помощью генетического алгоритма на синтетических данных. Если подходящего хэша нет, манёвр производится с помощью поиска пути.
 * Мне не нравится такая реализация маневрирования. Все варианты покрыть сложно и хэш таблица будет огромной, при этом высокая чувтсвительность к изменению данных.
 * Чистый поиск пути с обходом опасных клеток не эффективен с точки зрения количества ходов и имеет проблемы "залипания" в некоторых ситуациях.
 * А реализация с кучей if'ов разраслась настолько, что я и сам запутался в этом нагромождении деревьев.
 * Это самый эффективный компромис между эффекивностью и читаемостью который мне удался.
 */
class AntiPiracy {
  static HashesTable = {
    up: new Set([
      '00300400010',  '00303204310',  '00004343201',  '3404000000-1', '3402343400-1', '0430040430-1', '0434320430-1', '0004303230-1', '3404003400-1', '0000343230-1', '0040430040-1', '4003404000-1', '0003402340-1', '0430040000-1', '1430040000-1', '0431320430-1', '0000434320-1', '3414010000-1', '3002313010-1', '0004303230-1',
      '3414010000-1', '3400011110-1', '0430041110-1', '1004303230-1', '1040430040-1', '1000343230-1', '0431000000-1', '3410000110-1', '340231341-10', '0001303230-1', '3411011110-1', '1434320430-1', '04300400010',  '04343204310',  '14343204310',  '340234311-10', '000400011-10', '0430011110-1', '340234110-10', '300231301-10',
      '04300411110',  '0001343230-1', '300230110-10', '10303200310',  '0400004000-1', '1030320030-1', '3414000000-1', '3402313400-1', '3404001100-1', '3412343400-1', '0000313230-1', '1004303210-1', '1430000000-1', '341400000-10', '340231340-10', '0430040110-1', '3401000000-1', '3404011110-1', '0430000010-1', '3400010000-1',
      '300230311-10', '0430010000-1', '0431001100-1', '0430001000-1', '3414011110-1', '40034040110',  '3404000010-1', '0430000000-1', '000300111-10', '4003404110-1', '3400000110-1', '1003402340-1', '3002303110-1', '3404010110-1', '0430001010-1', '3400001010-1', '00043132301',  '400340110-10', '400340411-10', '4003404010-1',
      '0400000000-1', '3002303400-1', '0430434320-1', '0430040340-1', '0400004300-1', '0430040040-1', '0040343230-1', '0400000340-1', '0044303230-1', '400340400-10',
    ]),
    right: new Set([
      '00000004301',  '32343000010',  '40034040010',  '10100043001',  '32343032301', '3234303230-1', '00003412310',  '00003432310',  '00000043001',  '32303400110', '3230340110-1', '3230341110-1', '34023434010',  '30023034010',  '11143032310', '11043032310',  '11103432310',  '11003432310',  '11000404310',  '11100404310',
      '00013032301',  '11110404310',  '10043032310',  '10003432310',  '32343043001', '10043032301',  '11100411010',  '00043032310',  '40034041110',  '3234300040-1', '32343011110',  '32303401110',  '04300401110',  '3234300000-1', '32343001110', '40034011010',  '04300400110',  '34023431110',  '34023411010',  '14300400010',
      '00013432301',  '00043032301',  '10000404310',  '01103412310', '10043032101',  '32143000010',  '10043032110',  '32143000010',  '32343003401',  '43043032310', '00100401310',  '01100414301',  '11043032301',  '1340000000-1', '04334023410', '3231300000-1', '01100414310',  '32303411010',  '3400000010-1', '321430100-10',
      '3214300000-1', '32343000110',  '34023434110',  '30023011010',  '00000400010', '01103432310',  '32343404110',  '30023031110',  '01000400010',  '10000400010', '14043432310',  '1404343230-1', '00003032301',  '3234300010-1', '04334023410', '00014043401',  '323430100-10', '00000404310',  '32303000010',  '00034023410',
      '00000003001',  '32343011010',  '3234340410-1', '23434000010',  '00143032301', '04300411010',  '32343010010',  '11034023410',  '04043432310',  '34023030010', '00000400310',  '32343000410',  '04300443010',  '32303400010',  '32343043010', '32303000410',  '321430000-10', '10100400010',  '2303404000-1', '4340400000-1',
      '43003432310',  '43043032301',  '04300400410',  '32303043010',  '04300403410', '32343003410',  '04300440010',  '32343040010',  '32343404010',  '32303040010', '30034023410',  '4300343230-1', '03003432310',  '43404000010',  '3234300340-1', '3234304300-1',
    ]),
    down: new Set([
      '00404300401',  '40034040001',  '03400034001',  '40000034001', '40034140101',  '00404300410',  '340230300-10', '43204300001',  '34040034001',  '04303200301', '34023434001',  '32303400001',  '04300404301',  '04343204301',  '32343000001', '23434000001',  '00000404301',  '00040034101',  '30023130101',  '00010034001',
      '11100404301',  '43204300110',  '00040034001',  '11110404301',  '00010004301', '34023134101',  '340234340-10', '10040034001',  '00000014301',  '00000014301', '341401000-10', '10040034101',  '34023134001',  '10040034101',  '00000034101', '11110034001',  '34023134001',  '32143000001',  '00040134001',  '34123434001',
      '32143010001',  '10000404301',  '234340001-10', '00000014001', '32343404101',  '32343100001',  '10404300410',  '14303200310',  '23434000101',  '43000404301', '00100134001',  '11313200310',  '10000004301',  '11010404301',  '00140034001', '11313200301',  '10000034001',  '00100404301',  '23434000110',  '00100034001',
      '32303400101',  '43204310001',  '32343010001',  '00100104301',  '04303200310', '00303200310',  '300230300-10', '00303200301',  '10100034001',  '10100004301', '00000004101',  '23134000001',  '43204334010',  '00400034001',  '32343040001', '43204334001',  '43204304301',  '43204330001',  '43204300301',  '43040034001',
    ]),
    left: new Set([
      '110034323-10', '3230343230-1', '32303432301',  '0340001010-1', '3400000000-1', '00000043001',  '100034323-10', '4320430110-1', '000043432-10', '432043003-10', '4320430110-1', '3230311110-1', '103032003-10', '104043004-10', '111034323-10', '100430323-10', '110430323-10', '111430323-10', '100043432-10', '110043432-10',
      '111043432-10', '143432043-10', '000034323-10', '112043100-10', '10003432301',  '110400340-10', '340400111-10', '323034111-10', '100400340-10', '323034011-10', '323034000-10', '000400001-10', '323430000-10', '000400110-10', '323430111-10', '323430011-10', '000401101-10', '10004343201',  '3234311110-1', '000400340-10',
      '323430001-10', '32303411110',  '000400341-10', '000430323-10', '000400000-10', '111400340-10', '00003132301',  '100400341-10', '100430321-10', '011034123-10', '3230341100-1', '341400100-10', '01103412301',  '000400311-10', '311400000-10', '340400011-10', '340400000-10', '000400111-10', '00000034001',  '011400340-10',
      '001034323-10', '341401111-10', '323434041-10', '00103432301',  '001400340-10', '3230340010-1', '143032003-10', '140434323-10', '323034001-10', '011034323-10', '434041000-10', '432043000-10', '3234310110-1', '043432043-10', '000030323-10', '340400001-10', '4340410000-1', '323431000-10', '14043432301',  '432043100-10',
      '432043110-10', '432043011-10', '432043001-10', '43404100001',  '000400300-10', '040434323-10', '043032003-10', '434040000-10', '032043004-10', '323434040-10', '003032043-10', '004043004-10', '00403432301',  '00003432301',  '311401000-10', '0300343230-1', '004043032-10', '000040434-10', '323430400-10', '432043300-10',
      '323430034-10', '43003432301',  '432043340-10', '432043043-10', '3230340000-1'
    ]),
    wait: new Set([
      '00000003401',  '0340000000-1', '43204300010',  '110340234-10', '400340230-10', '03204300410',  '23434023401',  '4320430000-1', '43204343201',  '4320434320-1', '00034023401',  '00030023101',  '2313010000-1', '00010003401',  '4300011110-1', '11104343210',  '111340234-10', '11110303210',  '100340234-10', '11004343210',
      '11110303201',  '00010043001',  '2313410000-1', '10034023410',  '13204300010',  '43204311110',  '43204301110',  '10034023401',  '234340111-10', '13200300010', '10004343210',  '01104313210',  '4301000000-1', '00100301210',  '2343401100-1', '4300000010-1', '11110043001',  '100340231-10', '11004343201',  '03200300010',
      '0320030000-1', '000301101-10', '000340234-10', '400340111-10', '301401111-10', '001301111-10', '4300010000-1', '00100003401',  '4300001000-1', '00134023401', '1000434320-1', '00100103401',  '0340010000-1', '2343400010-1', '00100143001',  '10000043001',  '4300000000-1', '2343410110-1', '00000013401',  '001340234-10',
      '4320430010-1', '01400300010',  '10000003401',  '011340234-10', '230340411-10', '4300010110-1', '234340000-10', '00104343201',  '43204310010',  '11414303201', '400300000-10', '00400300010',  '00404303210',  '00004343210',  '00000303210',  '43204330010',  '00030023001',  '000300000-10', '00000300010',  '230300000-10',
      '43204304310',  '10100003401',  '4300001010-1', '2343402340-1', '10100004301',  '231340000-10', '00034123401',  '10034023101',  '00000003101',  '2313400000-1', '01104313201',  '231340100-10', '0340011110-1', '211300000-10', '0340000110-1', '43204300310',  '03200334010',  '000300211-10', '1400000000-1', '000300230-10',
      '4301001100-1', '43204311010',  '03200304310',  '04304343201',  '00404303201',  '00300043001',  '0340000030-1', '03200300310',  '0300000000-1', '00300003401', '0340000430-1', '11100043001',  '04300443001',  '0340003000-1', '04300403401',  '4320433400-1', '34000043001',  '4320430030-1', '0304003400-1', '0300040430-1',
      '04334023401', '4320430430-1', '2343400000-1'
    ])
  }
  constructor ({ actionFunction, pathFinder }) {
    this.Action = actionFunction;
    this.pathFinder = pathFinder;

    this.piratesInfo = [];
    this.allDangerousPoints = [];
    this.dangerousPoints = [];
    this.nextDangerousPoints = [];
    this.ship = {x: -1, y: -1};
    this.target = {x: -1, y: -1};
    this.nextShipPoint = {x: -1, y: -1};
  }

  update({ pirates, piratesPrev, piratesPath, shipPoint, nextShipPoint, target } = {}) {
    this.ship = shipPoint;
    this.nextShipPoint = nextShipPoint;
    this.target = target;
    this.dangerousPoints = [];
    this.nextDangerousPoints = [];
    this.piratesInfo = pirates.reduce(( result, pirate, index )=> {
      const piratePrev = piratesPrev[index];
      const pathInfo = piratesPath[index];
      const piratePoints = AntiPiracy.getPiratePoints(
        pirate, pathInfo, piratePrev
      );
      const dangerousPoints = PathFinder
                              .getNeighboringPoints(piratePoints.current);
      const nextDangerousPoints = PathFinder.getNeighboringPoints(piratePoints.next);

      this.dangerousPoints.push(...dangerousPoints)
      this.nextDangerousPoints.push(...nextDangerousPoints)

      result.push(
        { pirate, piratePoints, dangerousPoints, nextDangerousPoints, pathInfo }
      );
      return result;
    },[]);
    this.allDangerousPoints = [].concat(
      this.dangerousPoints,
      this.nextDangerousPoints
    );
  }

  isDanger() {
    return this.allDangerousPoints.some(point => {
     return PathFinder.isPointsEqual(point, this.nextShipPoint)
            || PathFinder.isPointsEqual(point, this.ship);
    });
  }

  maneuver() {
    const [, right, left, down, up] = PathFinder.getNeighboringPoints(this.ship);

    let hash = this.spaceArroundHash()
    const hashesTable = AntiPiracy.HashesTable;
    // Если поведение известно
    if (hashesTable.up.has(hash)) {
      return this.Action({ maneuver: true }).move({to: up});
    } else if (hashesTable.right.has(hash)) {
      return this.Action({ maneuver: true }).move({to: right});
    } else if (hashesTable.down.has(hash)) {
      return this.Action({ maneuver: true }).move({to: down});
    } else if (hashesTable.left.has(hash)) {
      return this.Action({ maneuver: true }).move({to: left});
    } else if (hashesTable.wait.has(hash)) {
      return this.Action({ maneuver: true }).wait();
    }

    // Иначе поиск пути
    const ignore = this.dangerousPoints.filter(point => {
      return ! PathFinder.isPointsEqual(point, this.ship);
    });

    const weights = this.nextDangerousPoints.map(point => {
      point.weight = 1;
      return point;
    });

    const action = this.Action({ maneuver: true, ignore, weights})
                   .move({to: this.target});

    if (action.track.length > 1) {
      return action;
    }

    // Если не пройти, ждём
    return this.Action({ maneuver: true }).wait();
  }

  /**
   * Возвращает хэш окружения корабля
   * @return {String}
   */
  spaceArroundHash() {
    const lookMatrix = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },  { x: 0, y: 0 },  { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
    ];

    let resultHash = lookMatrix.reduce(((hash, shift) => {
      const point = { x: this.ship.x + shift.x, y: this.ship.y + shift.y };
      // земля
      if (! this.pathFinder.checkCell(point)) {
        return hash += 1;
      }

      // корабль пиратов
      if (this.piratesInfo.some(pirate => {
        return PathFinder.isPointsEqual(point, pirate.piratePoints.current);
      })) {
        return hash += 2;
      }

      // опасные клетки
      if (this.piratesInfo.some(pirate => {
        return pirate.dangerousPoints.some(dangerousPoint => {
          return PathFinder.isPointsEqual(point, dangerousPoint);
        });
      })) {
        return hash += 3;
      }

      // клетки которые станут опасными на следующий ход
      if (this.piratesInfo.some(pirate => {
        return pirate.nextDangerousPoints.some(nextDangerousPoint => {
          return PathFinder.isPointsEqual(point, nextDangerousPoint);
        });
      })) {
        return hash += 4;
      }

      // свободная клетка
      return hash += 0;
    }), String())

    const movementDirection = PathFinder.vectorDirection(this.ship, this.nextShipPoint);

    resultHash += `${movementDirection.x}${movementDirection.y}`;

    return resultHash;
  }

  /**
   * Возвращает опасные клетки. current - клетки опасные для перехода. next - клетки которые станут опасными в следующем ходу.
   * @param  {Object} pirate     {x, y}
   * @param  {Array} pathInfo   piratesPathInfo
   * @param  {Object} piratePrev {x, y}
   * @return {Object}            { current: [{x, y}, ... ], next: [{x, y}, ... ] }
   */
  static getPiratePoints (pirate, pathInfo, piratePrev) {
    let currentPiratePoint;
    let nextPiratePoint;
    if (! pathInfo.closed) {
      currentPiratePoint = pirate;
      let direction = PathFinder.vectorDirection(piratePrev, pirate);
      nextPiratePoint = {
        x: currentPiratePoint.x + direction.x,
        y: currentPiratePoint.y + direction.y,
        dx: direction.x,
        dy: direction.x
      };
    } else {
      currentPiratePoint = pathInfo.path[pathInfo.moves % pathInfo.path.length];
      nextPiratePoint = pathInfo.path[(pathInfo.moves + 1) % pathInfo.path.length];
    }

    return {
      current: currentPiratePoint,
      next: nextPiratePoint
    };
  }
}

/**
 * Реализация A-star поиск кратчайшего пути по графу
 */
class PathFinder {
  /**
   * @param {Array} mapMatrix [[[0],[0]], [[0],[0]]]
   * @param {Mixed} land      элемент с типом, содержащимся в ячейке mapMatrix
   *                          обозначающий преграду
   */
  constructor(mapMatrix, land) {
    this.mapSize = { width: mapMatrix[0].length, height: mapMatrix.length };
    this.land = land;
    this.mapObjects = mapMatrix.reduce((mapObjects, line, y) => {
      line.forEach((cell, x) => {
        mapObjects.push({
          x, y,
          type: cell,
          weight: 10,
          parent: null,
          info: []
        });
      });
      return mapObjects;
    }, []);
  }

  static isPointsEqual(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  static distance(a, b) {
    return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
  }

  /**
   * @return {Object}        {x: Number, y: Number}
   */
  static vectorDirection (a, b) {
    return { x: b.x - a.x, y: b.y - a.y };
  }

  /**
   * Получает соседние клетки по горизонтали и вертикали включая текущую
   * @param  {Object} point {x: Number, y: Number}
   * @return {Array}       point
   */
  static getNeighboringPoints(point) {
    return [
      { x: point.x, y: point.y },
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 },
    ];
  }

  /**
   * Поиск кратчайшего пути от точки start до точки end
   * @param  {Object} start  Объект содержащий поля x, y
   * @param  {Object} end    Объект содержащий поля x, y
   * @param  {Array} ignore=[]  Массив объектов с полями x, y, эти точки будут проигнорированы при поиске пути
   * @param  {Array} weights=[]  Массив объектов с полями x, y, weight, поиск через эти точки будет замедлен
   * @return {Array}         Массив объектов с полями x, y содержащий маршрут от точки start до точки end
   */
  find (start, end, ignore = [], weights = []) {
    this._resetMapObject();
    const queue = [];
    const ignoreSet = new Set(ignore.map(point => this.mapIndex(point)));
    const weightsSet = new Set(weights.map(point => this.mapIndex(point)));
    const visitedSet = new Set();
    const queueSet = new Set();
    let cell = this.mapObjects[this.mapIndex(start)];
    do {
      visitedSet.add(this.mapIndex(cell));
      if (this._match(cell, end)) {
        break;
      }
      const cellsArround = this._getNeighbours({
        cell,
        end,
        queue,
        weights,
        weightsSet,
        ignoreSet,
        queueSet,
        visitedSet
      });
      queue.push(...cellsArround);
      queue.sort((a, b) => b.weight - a.weight);
      cell = queue.pop();
    } while (cell !== undefined);
    return this._getTrack(end);
  }

  /**
   * @return {Boolean} Вернёт true если клетка проходима
   */
  checkCell(cell) {
    const index = this.mapIndex(cell);
    const mapPoint = this.mapObjects[index];
    return (mapPoint && mapPoint.type !== this.land);
  }

  /**
   * Возвращает индекс по которому находятся координаты в массиве карты
   * @param  {[type]} x [description]
   * @param  {[type]} y [description]
   * @return {[type]}   [description]
   */
  mapIndex({ x, y } = {}) {
    if (
      x < 0 || x > this.mapSize.width ||
      y < 0 || y > this.mapSize.height
    ) {
      return -1;
    }
    return x + (this.mapSize.width * y);
  }

  _resetMapObject() {
    this.mapObjects = this.mapObjects.map(cell => {
      cell.weight = 10;
      cell.parent = null;
      cell.info = [];
      return cell;
    });
  }

  _getTrack(end) {
    let parent = null;
    let cell = this.mapObjects[this.mapIndex(end)];
    let count = 0;
    const track = [cell];
    do {
      parent = cell.parent;
      cell = parent;
      if (parent) {
        track.push(parent);
      }
    } while(parent);
    return track.slice(0).reverse();
  }

  _getNeighbours({cell, end, weights, queue, weightsSet, ignoreSet, queueSet, visitedSet} = {}) {
    const neighbors = {
      top:    { x: cell.x, y: cell.y - 1 },
      right:  { x: cell.x + 1, y: cell.y },
      bottom: { x: cell.x, y: cell.y + 1 },
      left:   { x: cell.x - 1, y: cell.y },
    };

    const result = Object.values(neighbors).reduce((result, neighbor) => {
      const index = this.mapIndex(neighbor);
      function isExist(point) {
        return point.x === neighbor.x && point.y === neighbor.y;
      }

      const mapPoint = this.mapObjects[index];
      if (
        mapPoint &&
        ! visitedSet.has(index) &&
        ! ignoreSet.has(index) &&
        mapPoint.type !== this.land &&
        neighbor.x < this.mapSize.width &&
        neighbor.y < this.mapSize.height &&
        neighbor.x >= 0 &&
        neighbor.y >= 0
      ) {

        const parentWeight = cell.weight;
        const distanceWeight = this._distance(cell, end);
        let weightModifier = 0;
        if (weightsSet.has(index)) {
          weightModifier = weights.find((point) => this._match(point, neighbor)).weight;
        }
        const mainWeight = mapPoint.weight + weightModifier;
        const weight = Math.round(parentWeight + (mainWeight * distanceWeight));
        if (queueSet.has(index)) {
          const alredyCell = queue.find(point => this._match(point, neighbor));
          if (alredyCell !== undefined && alredyCell.weight <= weight) {
            return result;
          }
        }
        mapPoint.parent = cell;
        mapPoint.weight = weight;
        mapPoint.info = [
          parentWeight,
          mainWeight,
          distanceWeight,
          weight
        ];
        queueSet.add(index);
        result.push(mapPoint);
      }
      return result;
    }, []);
    return result;
  }

  _match(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  _distance(a, b) {
    return Math.ceil(Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)) * 100 ) / 100;
  }
}

/**
 * Подбор самого выгодного варианта загрузки и продажи товаров
 */
class PlanGenerator {
  /**
   * @param {Number} maxVolume Максимальная вместимость корабля
   * @param {Object} homePort  Объект домашнего порта
   */
  constructor(maxVolume, homePort) {
    this.maxVolume = maxVolume;
    this.maxGoods = 3; // Максимальное количество товаров для загрузки на корабль
    this.maxPorts = 1; // Максимальное число посещаемых портов
    this.homePortId = homePort.portId;
    this.piratesPath = [];
  }

  get maxPorts() {
    return this._maxPorts || 0;
  }

  set maxPorts(value) {
    if (value > this.maxGoods) {
      value = this.maxGoods;
    }
    this._maxPorts = value;
  }

  /**
   * Возвращает объект с самым выгодным вариантом погрузки - маршрута - продажи
   * @param  {Object} productsObject Товары в домашнем порту.
   *                                 { fabric: { name: String, amount: Number,
   *                                   volume: Number, prices: Array } }
   * @param  {Object} portsObject
   * @param  {Number} remainingMoves Оставшееся количество ходов
   * @param  {Array} piratesPathInfo
   * @return {Object} { route: [{portId: 3, x: 2, y: 9, prices: {…}, routes: {…}}],
   *                    loading: [{name: "fish", count: 368, sales: 368, hash: 3143256}],
   *                    sale: [[3143256]], earning: 5888, moves: 16, movesIrrevocable: 9,
   *                    weight: 0.002717391304347826
   */
  generate ({ productsObject, portsObject, remainingMoves, piratesPathInfo } = {}) {
    this.piratesPath = piratesPathInfo.reduce((result, PathInfo) => {
      result.push(PathInfo.path);
      return result;
    }, []);

    const hashesMap = {}; // Таблица соответсвий хэшей товара с их названиями

    const products = Object.values(productsObject)
                    .map((product) => {
                      const hash = this._hash(product.name);
                      hashesMap[hash] = product.name;
                      product.hash = hash;
                      return product;
                    })
                    .filter(product => Object.keys(product.prices).length);

    const ports = Object.values(portsObject);
    const loadingVariants = [];
    const routeVariants = [];
    const planVariants = [];

    for (let i = 1; i<=this.maxGoods; i++) {
      loadingVariants.push(...this._getLoadingVariants(products, this.maxVolume, i));
    }
    for (let i = 1; i <=this.maxPorts; i++) {
      routeVariants.push(...this._getRouteVariants(ports, i));
    }
    for (const loadingVariant of loadingVariants) {
      planVariants.push(...this._getPlanVariants(loadingVariant, routeVariants, hashesMap));
    }
    return this._getMostProfitablePlan(planVariants, remainingMoves);
  }

  _getMostProfitablePlan(plans, remainingMoves) {
    if (plans.length === 0) return null;
    plans.sort((a, b) => a.weight - b.weight);

    let foundPlan = null;

    // Количество рейсов, которое можно совершить по самому выгодному тарифу
    const moveIndex = remainingMoves / plans[0].moves;
    if (moveIndex < 1.25) {
      // Выборка вклчает варианты с доставкой в одну сторону.
      // Сортируем не по весу, а по заработку
      foundPlan = plans.slice(0).filter(plan => {
        return plan.movesIrrevocable <= remainingMoves;
      }).sort((a, b) => b.earning - a.earning).shift();
    } else {
      // Выборка не вклчает варианты с доставкой в одну сторону.
      foundPlan = plans.slice(0).filter(plan => {
        return plan.moves <= remainingMoves;
      }).shift();
    }

    return foundPlan || null;
  }

  _getPlanVariants(loadingVariant, routeVariants, hashesMap) {
    const planVariants = [];
    const saleCombinations = this._getSaleCombinations(loadingVariant);

    // Отфильтровываем варианты маршрутов, в которых портов больше чем
    // загруженных товаров
    routeVariants = routeVariants.filter((routes) => {
      return routes.length === loadingVariant.length;
    });

    for (const routeVariant of routeVariants) {
      for (const saleVariant of saleCombinations) {
        if (routeVariant.length !== saleVariant.length) continue;
        const plan = this._getPlanVariant(loadingVariant, routeVariant, saleVariant, hashesMap);
        if (plan === null) {
          continue;
        }
        planVariants.push(plan);
      }
    }

    return planVariants;
  }

  _getPlanVariant(loadingVariant, routeVariant, saleVariant, hashesMap) {
    const plan = {
      route: routeVariant,
      loading: loadingVariant,
      sale: saleVariant,
      earning: 0,
      moves: 0,
      movesIrrevocable: 0, // Количество ходов без возврата домой
      weight: 0
    };

    plan.moves += loadingVariant.length * 2;
    let lastPortId = this.homePortId;

    for (let index = 0; index < saleVariant.length; index++) {
      const products = saleVariant[index];
      const port = routeVariant[index];

      // Если порт не покупает такой товар, то вариант не подходящий
      if (products.some(productHash => port.prices[hashesMap[productHash]] === undefined)) {
        return null;
      }

      plan.earning += products.reduce((earning, productHash) => {
        return port.prices[hashesMap[productHash]]
               * loadingVariant.find(product => product.hash === productHash).count;
      }, 0);

      plan.moves += port.routes[lastPortId].length;
      plan.moves += this._meetingWithPirates(port.routes[lastPortId].track);
      lastPortId = port.portId;
    }

    plan.movesIrrevocable = plan.moves;

    const routeToHome = routeVariant[routeVariant.length - 1].routes[this.homePortId];
    plan.moves += routeToHome.length;
    plan.moves += this._meetingWithPirates(routeToHome.track);
    plan.weight = plan.moves / plan.earning;
    return plan;
  }

  /**
   * [getSaleCombinations description]
   * @param  {[type]} products [description]
   * @param  {[type]} sales    [[ 3178592 ],[ 3178592, -895954139 ]]
   * @return {[type]}          [description]
   */
  _getSaleCombinations(products) {
    const saleVariants = this._getSaleVariants(products);
    let combinations = [];
    for (let i = 1; i <=this.maxPorts; i++) {
      combinations.push(...this._getCombination(saleVariants, i));
    }

    // Отфильтровываем сочетания с повторными товарами для каждого порта
    // Например 3 товара 2 порта [ [ 113097447 ], [ 113097447, 3178592 ] ]
    // Продажа 113097447 и в первом и во втором порту невозможна
    combinations = combinations.filter(combination => {
      const processed = new Set();
      for (let portProducts of combination) {
        const isDuplicate = portProducts.some((productHash) => {
          if (! processed.has(productHash)) {
            processed.add(productHash);
            return false;
          }
          return true;
        })
        if (isDuplicate) {
          return false;
        }
      }
      return true;
    })
    return combinations;
  }

  _getCombination (input, depth) {
    return input.reduce((resultArray, element) => {
      const currentLevelElements = [element];

      // Если последний уровень
      if (depth <= 1) {
        resultArray.push(currentLevelElements);
        return resultArray;
      }

      // Если не последний
      // Получаем очередной уровень
      const subLevel = this._getCombination(input, depth - 1);

      // Складывае все результаты уровня с элементом текущей итерации
      const subResults = subLevel.reduce((subArray, subElement) => {
        // Игнорируем подуровни содержащие основной элемент
        if (!subElement.includes(element)) {
          subArray.push(currentLevelElements.concat(subElement));
        }
        return subArray;
      }, []);

      resultArray.push(...subResults);
      return resultArray;
    }, []);
  }

  /**
   * Возвращает массив со всеми вариантами продажи загруженных товаров
   * @param  {Array} products
   * @return {Array}          [ [ 'fabric' ], [ 'fish' ] ] для 2 товаров и 2 портов
   */
  _getSaleVariants(products) {
    const maxVariantsDeepth = this.maxPorts;
    let saleVariants = [];
    let uniqHahses = new Set();
    for (let i = 1; i <= maxVariantsDeepth; i++) {
      let saleVariant = this._getSaleVariant(products, i)
      // Оставляем только уникальные комбинации для добавления в итоговый массив
      saleVariant = saleVariant.filter((sale) => {
        // Общий хэш массива сумма хэшей каждого элемента, коллизий на возможной выборке товара быть не может
        const variantHash = sale.reduce((hash, productHash) => hash + productHash, 0);
        if (uniqHahses.has(variantHash)) {
          return false;
        }
        uniqHahses.add(variantHash);
        return true;
      })
      saleVariants.push(...saleVariant)
    }
    return saleVariants;
  }

  /**
   * Возвращает массив с хэшами вариантов продажи данных товаров
   * @param  {Array} products  Массив товаров
   * @param  {Number} [depth=1] Число элементов в сочетании
   * @return {Array}           [[3143256], [3143256, 4143256]]
   */
  _getSaleVariant(products, depth = 1) {
    return products.reduce((resultArray, product) => {
      const currentLevelElements = [product.hash];
      // Если последний уровень
      if (depth <= 1) {
        resultArray.push(currentLevelElements);
        return resultArray;
      }
      // Если не последний
      // Получаем очередной уровень
      const subLevel = this._getSaleVariant(products, depth - 1);
      // Складывае все результаты уровня с элементом текущей итерации
      const subResults = subLevel.reduce((subArray, subElement) => {
        // Игнорируем подуровни содержащие основной элемент
        if (!subElement.includes(product.hash)) {
          subArray.push(currentLevelElements.concat(subElement));
        }
        return subArray;
      }, []);
      resultArray.push(...subResults);
      return resultArray;
    }, []);
  }

  /**
   * Возвращает все возможные варианты загрузки товаров
   * @param  {Array} products  [description]
   * @param  {Number} maxVolume максимальный объём
   * @param  {Number} [depth=1] максимальное количество товаров
   * @return {Array}  [ { name: 'fabric', count: 122 }, { name: 'fish', count: 2 } ]
   */
  _getLoadingVariants(products, maxVolume, depth = 1) {
    return products.reduce((resultArray, product) => {
      // Рассчитываем макимально возможное количество товара, которое можно загрузить на корабль
      let count = Math.floor(maxVolume / product.volume);
      if (count > product.amount) {
        count = product.amount;
      }

      // Если товар не влезает, или места на корабле не осталось, пропускаем итерацию
      if (count <= 0 || maxVolume <= 0) {
        return resultArray;
      }

      const variant = {
        name: product.name,
        count: count,
        sales: count,
        hash: product.hash
      };

      const currentLevelElements = [variant];

      // Если последний уровень, просто возвращаем вариант
      if (depth <= 1) {
        resultArray.push(currentLevelElements);
        return resultArray;
      }

      // Если не последний, получаем товары очередного уровня
      const remainingDepth = depth - 1;
      const totalVolume = product.volume * count;
      const remainingVolume = (maxVolume - totalVolume);
      const subLevel = this._getLoadingVariants(products, remainingVolume, remainingDepth);

      // Складывае все результаты уровня с продуктом текущей итерации
      const subResults = subLevel.reduce((subArray, subProducts) => {
        // Игнорируем подуровни содержащие основной продукт
        if (!subProducts.some((item) => item.name === product.name)) {
          subArray.push(currentLevelElements.concat(subProducts));
        }
        return subArray;
      }, []);

      resultArray.push(...subResults);
      return resultArray;
    }, []);
  }

  /**
   * Возвращает список всех возможных для посещения портов
   * @param  {Array} ports [description]
   * @param  {Number} [depth=1] максимальное количество портов
   * @return {Array} [{ portId: 1... }, { portId: 2... }]
   */
  _getRouteVariants(ports, depth = 1) {
    return ports.reduce((resultArray, port) => {
      const currentLevelElements = [port];

      // Если последний уровень
      if (depth <= 1) {
        resultArray.push(currentLevelElements);
        return resultArray;
      }

      // Если не последний
      // Получаем очередной уровень
      const subLevel = this._getRouteVariants(ports, depth - 1);

      // Складывае все результаты уровня с элементом текущей итерации
      const subResults = subLevel.reduce((subArray, subPort) => {
        // Игнорируем подуровни содержащие основной элемент
        if (!subPort.includes(port)) {
          subArray.push(currentLevelElements.concat(subPort));
        }
        return subArray;
      }, []);

      resultArray.push(...subResults);
      return resultArray;
    }, []);
  }

  /**
   * Возвращает количество вхождений корабля на пиратскую территорию
   */
  _meetingWithPirates(track) {
    const meetings = this.piratesPath.reduce((result, points) => {
      if (points.some(piratePoint => track.some(point => {
        return PathFinder.isPointsEqual(piratePoint, point);
      }))) {
        result += 1;
      }
      return result;
    }, 0);
    return meetings;
  }

  _hash (str) {
    let hash;
    for(let i = 0; i < str.length; i++) {
      hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return hash;
  }
}
