var boardGameCore = function(exportTarget, key){
    var BoardGame = exportTarget[key] = function(){
        var BG = {};
        BG.dataFiles = {};
        BG.setUpPlayers = function(data, mainTile){
            let players = [];
            for(let i = 0; i < data.users.length; i++){
                let loc = [2, 6]; //[mainTile.loc[0], mainTile.loc[1]]
                let player = BG.GameController.createObject(
                    "Player", 
                    {
                        x: loc[0] * (BG.c.tileW + BG.c.tileOffset) + BG.c.tileW,
                        y: 1.25,
                        z: loc[1] * (BG.c.tileH + BG.c.tileOffset) + BG.c.tileH * 1.1
                    }, 
                    {
                    playerId: data.users[i].id,
                    name: "Player " + data.users[i].id,
                    loc: loc,
                    money: data.mapData.modes[data.settings.mode].startMoney,
                    netValue: data.mapData.modes[data.settings.mode].startMoney,
                    color: data.users[i].color,
                    shops: [],//Keeps a list of all the shops the player owns
                    items: [],//Stores the consumables and set items.
                    itemEffects: [],//Active item effects
                    stocks: new Array(data.mapData.districts.length).fill(0),//Keeps track of how many stock in each district the player owns
                    rank: 1,
                    exp: 0, //At 100 exp, gain 1 rank
                    maxItems: 3//Should be 2 + 1 * player.rank
                    //Etc... Add more as I think of more. TODO
                });
                players.push(player);
                //TEMP to give free warp
                player.p.items.push("Warp");
                player.p.items.push("Hops");
            }
            return players;
        };
        BG.setUpGameState = function(data){
            let state = {};
            state.map = BG.MapController.generateMap(data.mapData, data.settings);
            state.players = BG.setUpPlayers(data, state.map.mainTile);
            //Bonus pool is a pool that gets added after sales/other events. When a player cashes in a set, they get the bonus.
            state.bonusPool = 0;
            state.turn = 1;
            state.round = 1;
            state.menus = [];
            state.dice = [];
            //Only generate random numbers on the server.
            if(BG.Utility.isServer()){
                let randSeed = Math.random();
                state.random = new Math.seedrandom(randSeed);
                state.initialSeed = randSeed;
                state.turnOrder = state.players;//BG.Utility.shuffleArray(state.players);
            }
            
            return state;
        };

        BG.Utility = {
            //Scales the w (Game is not designed for horizontal screens)
            getScaleFromResolution : function(){
                let wRes = 1920;
                //let hRes = 1080;
                let wSize = BG.Q.width;
                //let hSize = BG.Q.height;
                let wRatio = wSize / wRes;
                //let hRatio = hRes / hSize;
                return wRatio;
            },
            getSingleInput: function(inputs){
                return Object.keys(inputs)[0];
            },
            convertDirToCoord: function(dir){
                switch(dir){
                    case "up": return [0, -2];
                    case "right": return [2, 0];
                    case "down": return [0, 2];
                    case "left": return [-2, 0];
                }
            },
            convertCoordToDir: function(coord){
                if(coord[1] === 2) return "down";
                if(coord[1] === -2) return "up";
                if(coord[0] === 2) return "right";
                if(coord[0] === -2) return "left";
            },
            getOppositeDir: function(dir){
                switch(dir){
                    case "left": return "right";
                    case "up": return "down";
                    case "right": return "left";
                    case "down": return "up";
                }
            },
            compareLocsForDirection: function(loc1, loc2){
                let difX = loc1[0] - loc2[0];
                let difY = loc1[1] - loc2[1];
                let dir = [0, 0];
                if(difX > 1 || difX < -1){
                    if(difX < 0) dir[0] = 2;
                    else dir[0] = -2;
                }
                if (difY > 1 || difY < -1) {
                    if(difY < 0) dir[1] = 2;
                    else dir[1] = -2;
                }
                return dir;
            },
            getDeepValue: function(obj, path){
                for (var i = 0, path = path.split('.'), len = path.length; i < len; i++){
                    obj = obj[path[i]];
                }
                return obj;
            },
            setDeepValue: function(obj, path, value){
                for (var i = 0, path = path.split('.'), len = path.length - 1; i < len; i++){
                    obj = obj[path[i]];
                }
                obj[path[i]] = value;
            },
            getLoc: function(x, y){
                return [
                    ~~(x / (BG.c.tileW + BG.c.tileOffset)),
                    ~~(y / (BG.c.tileH + BG.c.tileOffset))
                ];
            },
            getXZ: function(loc){
                return {
                    x:loc[0] * (BG.c.tileW + BG.c.tileOffset),
                    z:loc[1] * (BG.c.tileH + BG.c.tileOffset)
                };
            },
            setXZ: function(obj, loc){
                loc = loc || obj.p.loc;
                obj.p.x = loc[0] * (BG.c.tileW + BG.c.tileOffset);
                obj.p.z = loc[1] * (BG.c.tileH + BG.c.tileOffset);
            },
            createArray: function(value, width, height) {
                let array = [];
                for (let i = 0; i < height; i++) {
                    array.push([]);
                    for (let j = 0; j < width; j++) {
                        array[i].push(value);
                    }
                }
                return array;
            },
            shuffleArray: function(a){
                var j, x, i;
                for (i = a.length - 1; i > 0; i--) {
                    j = ~~(Math.random() * (i + 1));
                    x = a[i];
                    a[i] = a[j];
                    a[j] = x;
                }
                return a;
            },
            locsMatch: function(loc1, loc2){
                return loc1[0] === loc2[0] && loc1[1] === loc2[1];
            },
            locInBounds: function(loc, w, h){
                return loc[0] >= 0 && loc[0] < w && loc[1] >= 0 && loc[1] < h;
            },
            isActiveUser: function(){
                return !BG.Utility.isServer() && BG.user.id === BG.state.turnOrder[0].p.playerId;
            },
            isServer: function() {
                return ! (typeof window != 'undefined' && window.document);
            },
            //Clones a material within an object so that it can be updated without affecting other instances.
            cloneMaterial: function(obj, name){
                obj.traverse((node) => {
                    if (node.isMesh) {
                        //Clone a specific material (can be an array of names)
                        
                        //THIS DOESN'T WORK. INDIVIDUAL MATERIAL IS NOT CLONING. DEFAULT TO CLONE ALL FOR NOW.
                        if(false/*name*/){
                            if(!Array.isArray(name)){
                                name = [name];
                            }
                            for(let i = 0; i < name.length; i++){
                                for(let j = 0 ; j < node.material.length; j++){
                                    if(name[i] === node.material[j].name){
                                        node.material[j] = node.material[j].clone();
                                    }
                                }
                            }
                        } 
                        //Clone all
                        else {
                            node.material = node.material.map((mat) => {
                                return mat.clone();
                            });
                        }
                    }
                  });
            },
            //Changes a material by name. Also returns the material, just in case.
            updateMaterial: function(obj, name, set){
                for(let i = obj.children.length - 1; i >= 0; i--){
                    if(obj.children[i].material){
                        for(let j = obj.children[i].material.length - 1; j >= 0; j--){
                            if(obj.children[i].material[j].name === name){
                                if(set){
                                    obj.children[i].material[j] = set;
                                    obj.children[i].material[j].name = name;
                                }
                                return obj.children[i].material[j];
                            }
                        }
                    }
                }
            }
        };
        BG.MapController = {
            //Checks to see if anything should be reset when going back to a tile.
            checkResetPassByTile: function(state, tile){
                let boardActions = state.currentBoardActions;
                let actionsIdxs = [];
                for(let i = 0; i < boardActions.length; i++){
                    if(boardActions[i][0].loc[0] === tile.loc[0] && boardActions[i][0].loc[1] === tile.loc[1]){
                        actionsIdxs.push(i);
                    }
                }
                actionsIdxs.forEach((idx) => {
                    let action = boardActions[idx];
                    BG.GameController[action[1]](...action[2]);
                });
                actionsIdxs.reverse().forEach((idx) => {boardActions.splice(idx, 1);});
            },
            //Checks if anything should happen when this player passes by this tile (also occurs if he lands on the tile).
            //Return true if we don't want to move to the next action (end turn or next step)
            checkPassByTile: function(state, player){
                let tile = player.p.tileTo;
                switch(tile.type){
                    //At the main tile, the player can exchange sets and buy stock.
                    case "main":
                        let set = BG.GameController.hasCompleteSet(player, tile.set.items);
                        if(set) {
                            BG.MenuController.makeMenu(state, {
                                menu: "askExchangeSets",
                                set: tile.set.items,
                                value: tile.set.value,
                                display: "dialogue"
                            });
                        } else {
                            BG.MenuController.makeMenu(state, {
                                menu: "askIfBuyingStock",
                                display: "dialogue"
                            });
                        }
                        return true;

                    case "vendor":
                        //There can be 0, 1, or 2 options.
                        let options = [];
                        //If the vendor has an exchange, figure out if the player has the item to exchange.
                        if(tile.exchange){
                            //For exchanges, needed is always an item.
                            if(player.hasItem(tile.exchange[0])){
                                options.push("exchange");
                            }
                        }
                        //If the vendor has a purchase, figure out if the player has enough money to purchase (this is somtimes free)
                        if(tile.purchase){
                            let needed = tile.purchase[1];
                            //needed can only be a money amount.
                            if(player.p.money >= needed){
                                options.push("purchase");
                            }
                            
                        }
                        if(options.length){
                            let text;
                            if(options.length === 2){
                                text = [tile.text.b];
                                BG.MenuController.makeMenu(state, {
                                    menu: "askVendorHereFor",
                                    text: text, 
                                    tileText: tile.text,
                                    display: "dialogue",
                                    tile: tile
                                });
                                return true;
                            } else if(options[0] === "purchase"){
                                text = [tile.text.p];
                                BG.MenuController.makeMenu(state, {
                                    menu: "askVendorBuyItem",
                                    text: text, 
                                    tileText: tile.text,
                                    display: "dialogue",
                                    item: tile.purchase
                                });
                                return true;
                            } else if(options[0] === "exchange"){
                                text = [tile.text.e];
                                BG.MenuController.makeMenu(state, {
                                    menu: "askVendorExchangeItem",
                                    text: text, 
                                    tileText: tile.text,
                                    display: "dialogue",
                                    item: tile.exchange
                                });
                                return true;
                            }
                        }
                        return false;
                        
                    case "itemshop":
                        state.tileTo = tile;
                        BG.MenuController.makeMenu(state, {menu: "askIfWantToBuyItem", display: "dialogue"});
                        return true;
                    case "toll":
                        let addMove = 1;
                        BG.GameController.addBoardAction(state, "prev", "addMovementNum", [state], [addMove]);
                        
                        //Pay the toll.
                        let tollAmount = state.round * 5;
                        BG.GameController.addBoardAction(state, "prev", "changePlayerMoney", [player], [-tollAmount]);
                        BG.GameController.addBoardAction(state, "prev", "changeBonusPool", [state], [tollAmount]);
                        break;
                    case "stockbroker":
                        BG.MenuController.makeMenu(state, {
                            menu: "askIfBuyingStock",
                            display: "dialogue"
                        });
                        return true;
                }
            },
            //Run when the player presses a directional input while moving their dice roll.
            processPlayerMovement: function(state, inputs, id){
                let invalidForwardLoc;
                let player = BG.GameController.getPlayer(state, id);
                let tileOn = BG.MapController.getTileAt(state, player.p.loc);
                let input = BG.Utility.getSingleInput(inputs);
                let tileTo = tileOn.dir[input];
                //If the input wasn't a valid directional input, don't do anything.
                if(!tileTo) return false;
                player.p.tileTo = tileTo;
                let props = {
                    func: "playerMovement",
                    loc: tileTo.loc,
                    passBy: false
                };

                //If the tile is not equal to the lastTile (the tile that the player landed on from last turn)
                if(state.currentMovementPath.length > 1 || tileTo !== player.p.lastTile){

                    //If the tile that the player is on can only go certain directions, make sure that the user has pressed a valid direction.
                    if(tileOn.dirs){
                        let dirs = tileOn.dirs.slice();
                        let allowDir = BG.Utility.convertCoordToDir(BG.Utility.compareLocsForDirection(tileOn.loc, tileTo.loc));
                        //Only allow it if the previous tile is equal to the tile to
                        if(state.currentMovementPath.length > 1 && BG.Utility.locsMatch(tileTo.loc, state.currentMovementPath[state.currentMovementPath.length - 2].loc)){
                            dirs.push(allowDir);
                        }
                        if(!dirs.includes(input)){
                            return false;
                        }
                    }
                    if(tileTo.dirs && tileTo.dirs.length === 1 && tileTo.dirs[0] === BG.Utility.getOppositeDir(input)){
                        invalidForwardLoc = true;
                    }

                    //If the player has gone back a tile
                    if(state.currentMovementPath.length > 1 && tileTo === state.currentMovementPath[state.currentMovementPath.length - 2]){
                        state.currentMovementPath.pop();
                        props.direction = "back";
                    } 
                    //If the player has gone forward a tile.
                    else {
                        if(!invalidForwardLoc){
                            if(state.currentMovementPath.length <= state.currentMovementNum){
                                state.currentMovementPath.push(tileTo);
                            } else {
                                return false;
                            }
                            props.direction = "forward";
                        }
                    }
                    if(!props.direction) return false;
                    BG.GameController.movePlayer(player, tileTo);

                    if(props.direction === "forward"){
                        if(BG.MapController.checkPassByTile(state, player)){
                            props.passBy = true;
                            return props;
                        }
                    } else if(props.direction === "back"){
                        BG.MapController.checkResetPassByTile(state, tileTo);
                        return props;
                    }
                } else {
                    return false;
                }
                return props;
            },

            getTileAt: function(state, loc){
                if(loc[0] >= 0 && loc[1] >= 0) return state.map.grid[loc[1]][loc[0]];
            },
            addToGrid: function(x, y, w, h, arr, add){
                for(let i = 0; i < h; i++){
                    for(let j = 0; j < w; j++){
                        arr[y + i][x + j] = add;
                    }
                } 
            },
            getShopsOwnedInDistrict: function(state, shop){
                return state.map.districts[shop.district].tiles.filter((s) => {return shop.ownedBy === s.ownedBy;});
            },
            generateShopValue: function(value, rank, investedCapital){
                return value * rank + investedCapital;
            },
            generateShopCost: function(value, rank, investedCapital, numberOfShopsInDistrict){
                // 20 - 25 - 30 - 35 - 40
                return ~~((value * rank + investedCapital) * (0.2 + (rank - 1) * 0.05 + numberOfShopsInDistrict * 0.05));
            },
            //Initial value plus half of an initial value for every rank. Minus the capital that has already been invested.
            generateShopMaxCapital: function(value, rank, investedCapital){
                return ~~(value + (value / 2 * rank)) - investedCapital;
            },
            //Pass the map data and return the fully generated map inside a tile w*h tile grid.
            generateMap: function(mapData, settings){
                let map = {
                    data: mapData,
                    tiles: [],
                    districts: [],
                    grid: BG.Utility.createArray(false, mapData.map.h, mapData.map.w),
                    minX: 0, //Use the min/max to determine center (used for view map)
                    maxX: 0,
                    minY: 0,
                    maxY:0
                };
                mapData.districts.forEach((d, i) => {
                    map.districts.push({
                        id: i,
                        name: "District " + i,
                        color: d.color,
                        tiles: [],
                        stockPrice: 0, //The cost per stock in a district. This goes up with value and rank.
                        stockAvailable: 0, //How much stock can be purchased in a district. This goes up with value and rank.
                        totalStock: 0, //The total number of stocks in this district (bought or unbought)
                        value: 0, //The total value of all shops in a district
                        rank: 0, //The average rank of shops in the district (rounded down)
                        totalRanks: 0 //The sum of all shop ranks (so we don't have to recalculate it everytime a shop rank changes)
                    });
                });
                function updateMinMax(pos){
                    map.minX = Math.min(pos.x, map.minX);
                    map.maxX = Math.max(pos.x, map.maxX);
                    map.minY = Math.min(pos.y, map.minY);
                    map.maxY = Math.max(pos.y, map.maxY);
                }
                function setCenterMinMax(map){
                    map.centerX = (map.minX + map.maxX) / 2;
                    map.centerY = (map.minY + map.maxY) / 2;
                } 
                function generateTile(data){
                    let tile = {
                        loc: [data.x, data.y],
                        type: data.type,
                        dirs: data.dirs
                    };
                    //Do different things based on the tile type.
                    switch(tile.type){
                        case "shop":
                            tile.initialValue = data.value;
                            tile.rank = data.rank;
                            tile.investedCapital = 0;
                            tile.name = data.name;
                            tile.district = data.district;
                            tile.value = BG.MapController.generateShopValue(tile.initialValue, tile.rank, tile.investedCapital);
                            tile.cost = BG.MapController.generateShopCost(tile.initialValue, tile.rank, tile.investedCapital, 1);
                            tile.maxCapital = BG.MapController.generateShopMaxCapital(tile.initialValue, tile.rank, tile.investedCapital);
                            map.districts[tile.district].tiles.push(tile);
                            break;
                        case "main":
                            map.mainTile = tile;
                            tile.name = data.name;
                            tile.image = data.image;
                            tile.set = data.set;
                            break;
                        case "vendor":
                            tile.name = data.name;
                            tile.exchange = data.e;
                            tile.purchase = data.p;
                            tile.text = data.text;
                            break;
                        case "itemshop":
                            tile.items = data.items.map((item) =>{
                                return {cost: item[1], name: item[0]};
                            });
                            break;
                        case "warp":
                            tile.exit = data.exit;
                            tile.name = data.name;
                            tile.image = data.image;
                            break;
                        case "toll":
                            tile.name = data.name;
                            tile.image = data.image;
                            break;
                        case "roll-again":
                            tile.name = data.name;
                            tile.image = data.image;
                            break;
                        case "bingo":
                            tile.name = "Bingo";
                            tile.image = "bingo.jpg";
                            break;
                        case "stockbroker":
                            tile.name = "Stockbroker";
                            tile.image = "stockbroker.jpg";
                            break;
                        case "interest":
                            tile.name = "Interest";
                            tile.image = "interest.jpg";
                            break;
                        case "arcade":
                            tile.name = "Arcade";
                            tile.image = "arcade.jpg";
                            break;
                    }
                    return tile;
                }
                function addTileToGame(tile){
                    map.tiles.push(tile);
                    BG.MapController.addToGrid(tile.loc[0], tile.loc[1], BG.c.tileW * BG.c.tileSize, BG.c.tileH * BG.c.tileSize, map.grid, tile);
                }
                function generateDistrictValues(districts){
                    for(let i = 0; i < districts.length; i++){
                        let district = districts[i];
                        BG.GameController.updateDistrictValues(district);
                        //The number of stock available is equal to the district value / 10
                        district.stockAvailable = Math.ceil(district.value / 10);
                        district.totalStock = district.stockAvailable;
                    }
                }

                function generateTileDirections(tile){
                    //The dir idx of any tiles around this tile
                    let tilesAroundAt = {};
                    let dirIdxs = BG.c.dirIdxs.all;
                    //This can be optimized to only check the necessary directions that are saved on the tile object.
                    //Loop all 16 directions to find tiles
                    for(let j = 0; j < dirIdxs.length; j++){
                        let checkAt = [tile.loc[0] + dirIdxs[j][0], tile.loc[1] + dirIdxs[j][1]];
                        //Make sure the loc is above 0 and less than maxX/Y
                        if(BG.Utility.locInBounds(checkAt, mapData.map.w, mapData.map.h)){
                            let tileOn = map.grid[checkAt[1]][checkAt[0]];
                            if(tileOn && BG.Utility.locsMatch(tileOn.loc, checkAt)){
                                tilesAroundAt[j] = tileOn;
                            }
                        }
                    }
                    return tilesAroundAt;
                }
                function removeDiagonals(tilesAroundAt){
                    //Remove diagonals if there is an adjacent.
                    //Optimization: do this with a loop
                    if(tilesAroundAt[2]){
                        delete tilesAroundAt[0];
                        delete tilesAroundAt[4];
                    }
                    if(tilesAroundAt[6]){
                        delete tilesAroundAt[4];
                        delete tilesAroundAt[8];
                    }
                    if(tilesAroundAt[10]){
                        delete tilesAroundAt[8];
                        delete tilesAroundAt[12];
                    }
                    if(tilesAroundAt[14]) {
                        delete tilesAroundAt[12];
                        delete tilesAroundAt[0];
                    }
                }
                function convertDirIdxs(tilesAroundAt){
                    let dirObj = {};
                    //Convert all dir idxs to button inputs.
                    //Do all adjacent and offset, and then if there are overlapping diagonals, deal with them.
                    let order = [1, 3, 5, 7, 9, 11, 13, 15, 2, 6, 10, 14, 0, 4, 8, 12];
                    for(let j = 0; j < order.length; j++){
                        //If there's a tile at this idx
                        if(tilesAroundAt[order[j]]){
                            //Get the direction
                            if(order[j] >= 1 && order[j] <= 3){
                                dirObj.up = tilesAroundAt[order[j]];
                            } else if(order[j] >= 5 && order[j] <= 7){
                                dirObj.right = tilesAroundAt[order[j]];
                            } else if(order[j] >= 9 && order[j] <= 11){
                                dirObj.down = tilesAroundAt[order[j]];
                            } else if(order[j] >= 13 && order[j] <= 15){
                                dirObj.left = tilesAroundAt[order[j]];
                            }

                            if(order[j] === 0){
                                if(dirObj.left){
                                    dirObj.up = tilesAroundAt[order[j]];
                                } else {
                                    dirObj.left = tilesAroundAt[order[j]];
                                }
                            } else if(order[j] === 4){
                                if(dirObj.up){
                                    dirObj.right = tilesAroundAt[order[j]];
                                } else {
                                    dirObj.up = tilesAroundAt[order[j]];
                                }
                            } else if(order[j] === 8){
                                if(dirObj.right){
                                    dirObj.down = tilesAroundAt[order[j]];
                                } else {
                                    dirObj.right = tilesAroundAt[order[j]];
                                }
                            } else if(order[j] === 12){
                                if(dirObj.down){
                                    dirObj.left = tilesAroundAt[order[j]];
                                } else {
                                    dirObj.down = tilesAroundAt[order[j]];
                                }
                            }
                        }
                    }
                    return dirObj;
                }

                //Generate the tiles.
                for(let i = 0; i < mapData.tiles.length; i++){
                    updateMinMax(mapData.tiles[i]);
                    addTileToGame(generateTile(mapData.tiles[i]));
                }
                map.maxX += BG.c.tileSize;
                map.maxY += BG.c.tileSize;
                generateDistrictValues(map.districts);
                setCenterMinMax(map);
                //Once the tiles are generated, check the tiles neighbours to determine which directions the player can go on each tile.
                for(let i = 0; i < map.tiles.length; i++){
                    let tilesAroundAt = generateTileDirections(map.tiles[i]);
                    removeDiagonals(tilesAroundAt);
                    map.tiles[i].dir = convertDirIdxs(tilesAroundAt);

                    //Dir IDX Positions - [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-2, -1]]
                    //Dir IDXS - 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15

                    //Diagonal - 0 4 8 12           (i * 4)
                    //Offset   - 1 3 5 7 9 11 13 15 (i * 4 + 2)
                    //Adjacent - 2 6 10 14          (i * 2 + 1)

                    //Up    - 0 1 2 3 4
                    //Right - 4 5 6 7 8
                    //Down  - 8 9 10 11 12
                    //Left  - 12 13 14 15 0

                    /* Visualization
                     * 0   1   2   3   4  
                     * 15  x   x   x   5
                     * 14  x   C   x   6
                     * 13  x   x   x   7
                     * 12  11  10  9   8
                     */
                }
                return map;
            }
        };
        BG.MenuController = {
            //Any menus that have the persist property must be removed manually.
            //removeMenus is run when any menu is created. It overrides the previous menu usually.
            removeMenus: function(state){
                for(let i = state.menus.length - 1; i >= 0; i--){
                    if(!state.menus[i].persist) state.menus.splice(i, 1);
                }
            },
            makeCustomMenu: function(state, menu, props){
                BG.MenuController.removeMenus(state);
                //These are all custom menus,so do all of the "makeMenu" code here.
                switch(menu){
                    case "investMenu":
                        BG.MenuController.initializeNumberCycler(state, menu, props);
                        state.menus[0].data.shop = props.shop;
                        props.menu = menu;
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("investMenu", 2, props);
                        }

                        break;
                    case "upgradeMenu":
                        BG.MenuController.initializeConfirmer(state, menu);
                        state.menus[0].data.shop = props.shop;
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("upgradeMenu", 2, props);
                        }

                        break;
                    case "auctionMenu":
                        BG.MenuController.makeMenu(state, {menu: "auctionMenu", display: "dialogue"});
                        state.menus[0].data.shop = props.shop;
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("auctionMenu", 3, props);
                        }
                        break;
                    case "districtMenu":
                        if(!BG.Utility.isServer()){
                            let stage = BG.Q.stage(2);
                            BG.state.mapMenu = stage.insert(new BG.Q.MapMenu({player: BG.state.turnOrder[0]}));
                            BG.Q.stage(1).hide();
                        }
                        BG.MenuController.makeMenu(state, {...{menu: "districtMenu", display: "dialogue", sceneNum: -1}, ...props});
                        break;
                    case "buyStockCyclerMenu":
                        BG.MenuController.initializeNumberCycler(state, menu, props);
                        state.menus[0].data.district = state.map.districts[props.district];
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("buyStockCyclerMenu", 2, props);
                        }
                        break;
                    case "sellStockCyclerMenu":
                        BG.MenuController.initializeNumberCycler(state, menu, props);
                        state.menus[0].data.district = state.map.districts[props.district];
                        if(!BG.Utility.isServer()){
                            var stage = BG.Q.stage(2);
                            var digits = props.cycler;
                            var currentItem = props.currentItem || [digits - 1, 0];
                            stage.insert(new BG.Q.NumberCyclerMenu({
                                type: "sellStock",
                                digits: digits, 
                                select: currentItem, 
                                district: BG.state.map.districts[props.district],
                                stocksOwned: BG.state.turnOrder[0].p.stocks[props.district]
                            }));
                        }
                        break;
                    case "checkStockMenu":
                        BG.MenuController.initializeConfirmer(state, menu);
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("checkStockMenu", 2);
                        }
                        break;
                    case "setsMenu":
                        BG.MenuController.initializeConfirmer(state, menu);
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("setsMenu", 2);
                        }
                        break;
                    case "dealList":
                        BG.MenuController.makeMenu(state, {menu: "dealListRequested", persist: true});
                        BG.MenuController.makeMenu(state, {menu: "dealListTrade", persist: true});
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("dealMenu", 3, props);
                        }
                        break;
                    case "dealMenu":
                        BG.MenuController.makeMenu(state, {...{menu: "dealMenu", display: "dialogue"}, ...props});
                        state.currentDeal = {
                            requested: [],
                            requestedG: 0,
                            trade: [],
                            tradeG: 0,
                            dealWith: props.player,
                            currentSelection: "requested"
                        };  
                        break;
                }
                state.menus[0].data.menu = menu;
                
                return {func: "makeCustomMenu", menu: menu, props: props};
            },
            clearMenus: function(state, type){
                if(type === "all"){
                    state.menus = [];
                } else {
                    type.forEach((t) => {
                        for(let i = state.menus.length - 1; i >=0; i --){
                            if(state.menus[i].name === t) state.menus.splice(i, 1);
                        }
                    });
                }
                return {func: "clearMenus", type: type};
            },
            makeMenu: function(state, props){
                let menu = props.menu;
                let display = props.display;
                BG.MenuController.removeMenus(state);
                props.sceneNum = props.sceneNum || 2;
                let data = {...BG.MenuController.inputStates[menu], ...props};
                BG.MenuController.initializeMenu(state, data, props);
                if(data.preDisplay) data.preDisplay(state);
                if(!BG.Utility.isServer() && display){
                    BG.Q.stageScene(display, props.sceneNum, props.menuProps);
                }
                return {func: "makeMenu", props: props};
            },
            switchMenu: function(state, props){
                let menu = props.menu;
                for(let i = 0; i < state.menus.length; i++){
                    if(state.menus[i].name === menu){
                        state.menus.unshift(state.menus.splice(i, 1)[0]);
                    }
                }
                if(!BG.Utility.isServer()){
                    //Hover the correct item???
                }
                return {func: "switchMenu", props: props};
            },
            makeMoveShopSelector: function(state, confirmType, backFunc, startPos, selType){
                let goBack, finish, selectType;
                if(selType) selectType = selType;
                switch(confirmType){
                    case "invest":
                        finish = function(state, shop){
                            if(!shop) return {func: "invalidAction"};
                            return BG.GameController.finishMoveShopSelector(state, "investMenu", shop, {cycler: 6});
                        };
                        selectType = "currentOwned";
                        break;
                    case "upgrade":
                        finish = function(state, shop){
                            if(!shop) return {func: "invalidAction"};
                            return BG.GameController.finishMoveShopSelector(state, "upgradeMenu", shop);
                        };
                        selectType = "currentOwned";
                        break;
                    case "auction":
                        finish = function(state, shop){
                            if(!shop) return {func: "invalidAction"};
                            return BG.GameController.finishMoveShopSelector(state, "auctionMenu", shop);
                        };
                        selectType = "currentOwned";
                        break;
                    case "warpPlayerTo":
                        finish = function(state, tile){
                            if(!tile) return {func: "invalidAction"};
                            return BG.GameController.finishMoveShopSelector(state, "warpPlayerTo", tile);
                        };
                        break;
                    case "viewBoard":
                        finish = function(state, tile){
                            return false;
                        };
                        break;
                    case "confirmSellShop": 
                        finish = function(state, tile){
                            return BG.GameController.finishMoveShopSelector(state, "confirmSellShop", tile);
                        };
                        selectType = "currentOwned";
                        break;
                }
                switch(backFunc){
                    case "toShopsMenu":
                        goBack = function(state, backOption){
                            let backOpt = backOption === "invest" ? [0, 0] : backOption === "upgrade" ? [0, 1] : [0, 2];
                            state.shopSelector = false;
                            return [
                                {func: "setBGValue", path: "preventMultipleInputs", value: true}, 
                                {func: "removeItem", item: "shopSelector"}, 
                                BG.MenuController.inputStates.playerTurnMenu.showShopsMenu(state, backOpt)
                            ];
                        };
                        break;
                    case "toViewMenu":
                        goBack = function(state, backOption){
                            let backOpt = [0, 0];
                            state.shopSelector = false;
                            return [
                                {func: "setBGValue", path: "preventMultipleInputs", value: true}, 
                                {func: "removeItem", item: "shopSelector"},
                                BG.MenuController.inputStates.playerTurnMenu.showViewMenu(state, backOpt)
                            ];
                        };
                        break;
                    case "forceSellAsset":
                        goBack = function(state){
                            return BG.MenuController.makeMenu(state, {menu: "forceSellAsset", display: "dialogue"});
                        };
                        break;
                    default: 
                        goBack = function(state){
                            return {func: "invalidAction"};
                        };
                        break;
                }
                state.menus[0].data = {
                    func: "moveShopSelector", 
                    goBack: goBack,
                    finish: finish,
                    backOption: confirmType
                };
                state.shopSelector =  BG.GameController.createObject("ShopSelector", startPos, {state: state, type: selectType});
                if(!BG.Utility.isServer()){
                    BG.preventMultipleInputs = false;
                    BG.scene.add(state.shopSelector);
                }
                return [
                    {func: "clearStage", num: 2}, 
                    {func: "makeMoveShopSelector", confirmType: confirmType, backFunc: backFunc, startPos: startPos}
                ];
            },
            convertArrayToMenuOptions: function(array, textProp, func){
                return array.map((itm) => {
                    return [itm[textProp], func];
                });
            },
            inputStates: {
                investMenu: {
                    func: "controlNumberCycler",
                    cycler: 6,
                    confirm: (state) => {
                        let investAmount = BG.MenuController.getValueFromNumberCycler(state);
                        let maxCapital = state.menus[0].data.shop.maxCapital;
                        let playerMoney = state.turnOrder[0].p.money;
                        //If the invest amount is greater than allowed, set the amount to the allowed amount.
                        if(investAmount > maxCapital || investAmount > playerMoney){
                            let newAmount = Math.min(maxCapital, playerMoney);
                            return BG.MenuController.setNumberCyclerValue(state, newAmount);
                        }
                        //Otherwise, invest that amount into the shop.
                        else {
                            BG.GameController.investInShop(state, investAmount);
                            return [
                                {func: "finalizeInvestInShop", investAmount: investAmount},
                                BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], sound: "purchase-item", display: "menu"})
                            ];
                        }
                    },
                    goBack: (state) => {
                        return BG.MenuController.inputStates.shopsMenu.cursorSelectShop(state, "invest", "toShopsMenu", state.menus[0].data.shop.loc);
                    }
                },
                upgradeMenu: {
                    func: "confirmer",
                    confirm: (state) => {
                        let player = state.turnOrder[0];
                        let shop = state.menus[0].data.shop;

                        //Give a 10% discount for every player level above 1 (10, 20, 30, etc...)
                        let cost = shop.value - ((player.p.rank - 1) * shop.value / 10);
                        let playerMoney = player.p.money;
                        let rankUp = 1;
                        if(playerMoney >= cost && shop.rank < 5){
                            BG.GameController.upgradeShop(state, rankUp, cost);
                            return [
                                {func: "finalizeUpgradeShop", cost: cost, rankUp: rankUp},
                                BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], sound: "purchase-item", display: "menu"})
                            ];
                        } else {
                            return {func: "invalidAction"};
                        }
                    },
                    goBack: (state) => {
                        return BG.MenuController.inputStates.shopsMenu.cursorSelectShop(state, "upgrade", "toShopsMenu", state.menus[0].data.shop.loc);
                    }
                },
                auctionMenu: {
                    func: "navigateMenu",
                    text: ["How would you like to auction this shop?"],
                    options: [
                        ["Normal", "normalAuction"],
                        ["Blind", "blindAuction"],
                        ["Back", "goBack"]
                    ],
                    getValidParticipants: (players, shop) => {
                        //If there are 1+ players who have enough money to bid, start the bidding process, otherwise sell to the bank for 0.75 of the value.

                        let validParticipants = [];
                        //Start at 1 since 0 is the active player.
                        for(let i = 1; i < players.length; i++){
                            if(players[i].money >= shop.value){
                                validParticipants.push(players[i]);
                            }
                        }
                        return validParticipants;
                    },
                    sellToBank: (state, shop) => {
                        let value = ~~(shop.value * 0.75);
                        let sellTo = false;
                        BG.GameController.sellShop(state, shop, value, sellTo);
                        return {func: "sellShop", value: value, loc: shop.loc, sellTo: sellTo};
                    },
                    normalAuction: (state) => {
                        //Players bid until the timer goes down to 0. Bids set the timer to 5 seconds.
                        let players = state.turnOrder;
                        let shop = state.menus[0].data.shop;
                        let valid = BG.MenuController.inputStates.auctionMenu.getValidParticipants(players, shop);
                        if(valid.length >= 1){
                            //TODO blind auction first. This is that with an extra step.
                        } 
                        else {
                            return [
                                {func: "clearStage", num: 2},
                                {func: "clearStage", num: 3},
                                BG.MenuController.inputStates.auctionMenu.sellToBank(state, shop),
                                BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], sound: "purchase-item", display: "menu"})
                            ];
                        }
                    },
                    blindAuction: (state) => {
                        //Players get one bid and whoever bids the highest gets the shop.
                        //All forced shop auctions are this type.
                        let players = state.turnOrder;
                        let shop = state.menus[0].data.shop;
                        let valid = BG.MenuController.inputStates.auctionMenu.getValidParticipants(players, shop);
                        if(valid.length >= 1){
                            //TODO: show the auction scene.
                            //1. Ask all players if they'd like to participate
                            //2a. If no one want to participate, the bank buys it for 0.75x
                            //2b. If one person wants to participate, they auto buy it for the 100% value (25% goes to the bank).
                            //2c. If multiple people want in, allow each entrant to say how much they want to bid.
                            //3. Whoever bids the highest gets to buy the shop (25% still goes to the bank).

                            //Procedure:
                            //1. Answer yes or no to wanting in to the bid.
                            //2. Once all players have decided, show a number cycler on each screen.
                            //3. Each player submits their bid before the time runs out (20 seconds)
                            //3a. If the time runs out (server tracks it), then submit the current number on the cycler.
                            //4. Once all players have submitted their bid, a message is sent to all players with the result.
                            //4a. Losers show a "you lost" message, and the winner gets a "you win" message.
                            //5. The shop changes ownership and values are changed.
                        }
                        else {
                            return [
                                {func: "clearStage", num: 2},
                                {func: "clearStage", num: 3},
                                BG.MenuController.inputStates.auctionMenu.sellToBank(state, shop),
                                BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], sound: "purchase-item", display: "menu"})
                            ];
                        }
                    },
                    goBack: (state) => {
                        return [
                            {func: "clearStage", num: 2},
                            BG.MenuController.inputStates.playerTurnMenu.showViewMenu(state, [0, 2])
                        ];
                    }
                },
                askExchangeSets: {
                    func: "navigateMenu",
                    text: [""],
                    preDisplay: function(state){
                        let set = state.menus[0].data.set;
                        let value = state.menus[0].data.value;
                        let setString = "";
                        for(let i = 0 ;i < set.length; i++){
                            if(i !== 0) setString += ", ";
                            if(i === set.length - 1) setString += "and ";
                            setString += set[i];
                        }
                        state.menus[0].data.text = ["Would you like to exchange " + setString + " for " + value + "G?"];
                    },
                    /*onHoverOption: (option) => {
                        option.stage.setsMenu.hoverSet(option);
                    },
                    onLoadMenu: (stage) => {
                        stage.setsMenu = stage.insert(new BG.Q.SetsMenu({player: BG.state.turnOrder[0]}));
                    },*/
                    options:[
                        ["Yes", "purchaseSet"],
                        ["No", "confirmFalse"]
                    ],
                    purchaseSet: (state) => {
                        //Go to buy stock menu TODO
                        BG.GameController.exchangeForSet(state, state.menus[0].data.set, state.turnOrder[0].p.playerId);
                        
                        let props = [
                            {func: "exchangeForSet", set: state.menus[0].data.set},
                            {func: "clearStage", num: 2}
                        ];
                        let finish = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(finish) props = props.concat(finish);
                        return props;
                    },
                    confirmFalse: (state) => {
                        //Go to buy stock menu TODO
                        
                        
                        let props = [{func: "clearStage", num: 2}];
                        let move = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(move){
                            props.push(move);
                        }
                        return props;
                    }
                },
                askVendorHereFor: {
                    func: "navigateMenu",
                    text: ["What are you here for?"],
                    options:[
                        ["Purchase", "confirmPurchase"],
                        ["Exchange", "confirmExchange"],
                        ["Nothing", "confirmFalse"]
                    ],
                    preDisplay: (state) => {
                        //If the item is free, change purchase text.
                    },
                    confirmPurchase: (state) => {
                        return BG.MenuController.makeMenu(state, {
                            menu: "askVendorBuyItem",
                            text: [state.menus[0].data.tileText.p], 
                            tileText: state.menus[0].data.tileText,
                            display: "dialogue",
                            item: state.menus[0].data.tile.purchase
                        });
                    },
                    confirmExchange: (state) => {
                        return BG.MenuController.makeMenu(state, {
                            menu: "askVendorExchangeItem",
                            text: [state.menus[0].data.tileText.e], 
                            tileText: state.menus[0].data.tileText,
                            display: "dialogue",
                            item: state.menus[0].data.tile.exchange
                        });
                    },
                    confirmFalse: (state) => {
                        let props = [{func: "clearStage", num: 2}];
                        let move = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(move){
                            props.push(move);
                        }
                        return props;
                    }
                },
                askVendorExchangeItem: {
                    func: "navigateMenu",
                    text: [""],
                    options:[
                        ["Yes", "confirmTrue"],
                        ["No", "confirmFalse"]
                    ],
                    preDisplay: (state) => {
                        let dollarString = Number.isInteger(state.menus[0].data.item[1]) ? "G" : "";
                        state.menus[0].data.text = ["Would you like to exchange your \n" + state.menus[0].data.item[0] + " for " + state.menus[0].data.item[1] + dollarString + "?"];
                    },
                    confirmTrue: (state) => {
                        let itemNeeded = state.menus[0].data.item[0];
                        let exchangeFor = state.menus[0].data.item[1];
                        BG.GameController.exchangeItem(state, itemNeeded, exchangeFor, state.turnOrder[0].p.playerId);
                        let props = [
                            {func: "exchangeItem", itemNeeded: itemNeeded, exchangeFor: exchangeFor},
                            {func: "clearStage", num: 2}
                        ];
                        let finish = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(finish) props = props.concat(finish);
                        return props;
                    },
                    confirmFalse: (state) => {
                        let props = [{func: "clearStage", num: 2}];
                        let move = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(move){
                            props.push(move);
                        }
                        return props;
                    }
                },
                askVendorBuyItem: {
                    func: "navigateMenu",
                    options:[
                        ["Yes", "confirmTrue"],
                        ["No", "confirmFalse"]
                    ],
                    confirmTrue: (state) => {
                        let item = state.menus[0].data.item[0];
                        let cost = state.menus[0].data.item[1];
                        BG.GameController.purchaseItem(state, item, cost, state.turnOrder[0].p.playerId);
                        let props = [
                            {func: "purchaseItem", item: item, cost: cost},
                            {func: "clearStage", num: 2}
                        ];
                        let finish = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(finish) props = props.concat(finish);
                        return props;
                    },
                    confirmFalse: (state) => {
                        let props = [{func: "clearStage", num: 2}];
                        let move = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(move){
                            props.push(move);
                        }
                        return props;
                    }
                },
                buyItemsMenu: {
                    func: "navigateMenu",
                    text: ["What would you like to buy?"],
                    options: [],
                    preDisplay: (state) => {
                        state.tileTo.items.map((item) => {
                            return [item.name + " (" + item.cost + ")", "confirmBuyItem", [item]];
                        }).forEach((item) => {
                            state.menus[0].itemGrid.push([item]);
                        });
                        state.menus[0].itemGrid.push([["Back", "goBack"]]);
                    },
                    onHoverOption: (option) => {
                        console.log(option)
                    },
                    onLoadMenu: (stage) => {
                        //TODo: custom item menu
                    },
                    confirmBuyItem: (state) => {
                        let player = state.turnOrder[0];
                        let item = state.menus[0].itemGrid[state.menus[0].currentItem[1]][state.menus[0].currentItem[0]][2][0]; 
                        let itemName = item.name;
                        let itemCost = item.cost;
                        if(player.p.money >= itemCost){
                            BG.GameController.purchaseItem(state, itemName, itemCost, player.p.playerId);
                            let props = [
                                {func: "purchaseItem", item: itemName, cost: itemCost}, 
                                {func: "clearStage", num: 2}
                            ];
                            let finish = BG.GameController.checkFinishMove(state, player);
                            if(finish) props = props.concat(finish);
                            return props;
                        } else {
                            return {func: "invalidAction"};
                        }
                    },
                    goBack: (state) => {
                        let player = state.turnOrder[0];
                        let props = [{func: "clearStage", num: 2}];
                        let finish = BG.GameController.checkFinishMove(state, player);
                        if(finish) props = props.concat(finish);
                        return props;
                    }
                },
                askIfWantToBuyItem: {
                    func: "navigateMenu",
                    options:[
                        ["Yes", "confirmTrue"],
                        ["No", "confirmFalse"]
                    ],
                    text: ["Would you like to buy an item?"],
                    confirmTrue: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "buyItemsMenu", display: "dialogue"});
                    },
                    confirmFalse: (state) => {
                        let response = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(response){
                            response = [{func: "clearStage", num: 2}, response];
                        } else {
                            response = {func: "clearStage", num: 2};
                        }
                        return response;
                    }
                },
                playerTurnMenu: {
                    func: "navigateMenu",
                    options:[
                        ["Roll", "rollDie"],
                        ["Shops", "showShopsMenu"],
                        ["Stocks", "showStocksMenu"],
                        ["Items", "showItemsMenu"],
                        ["Make a Deal", "showDealMenu"],
                        ["View", "showViewMenu"]
                    ],
                    rollDie: (state) => {
                        if(BG.Utility.isServer()){
                            let extraDie = BG.GameController.getItemEffect(state, state.turnOrder[0], "Extra Die");
                            let rolls = 1 + (extraDie ? 1: 0);
                            let dieMin = 1; 
                            let dieMax = 6;
                            let roll = 0;
                            let rollsNums = [];
                            for(let i = 0; i < rolls; i++){
                                let num = ~~(state.random() * (dieMax + 1 - dieMin)) + dieMin;
                                roll += num;
                                //roll = 1;
                                rollsNums.push(num);
                            }
                            state.currentMovementNum = roll;
                            state.menus[0].data = {func: "rollDie", roll: roll, self: true, rollsNums: rollsNums};
                        }
                        return [
                            {func: "clearStage", num: 2},
                            state.menus[0].data
                        ];
                    },
                    showShopsMenu: (state, selected) => {
                        return BG.MenuController.makeMenu(state, {menu: "shopsMenu", selected: selected || [0, 0], sound: "change-menu", display: "menu"});
                    },
                    showStocksMenu: (state, selected) => {
                        return BG.MenuController.makeMenu(state, {menu: "stocksMenu", selected: selected || [0, 0], sound: "change-menu", display: "menu"});
                    },
                    showItemsMenu: (state, selected) => {
                        return BG.MenuController.makeMenu(state, {menu: "itemsMenu", selected: selected || [0, 0], sound: "change-menu", display: "menu"});
                    },
                    showDealMenu: (state) => {
                        return BG.MenuController.makeMenu(state, {
                            menu: "selectAPlayerMenu",
                            next: "setUpDeal",
                            prev: ["playerTurnMenu", [0, 4], "menu"], 
                            display: "dialogue"
                        });
                    },
                    showViewMenu: (state, selected) => {
                        return BG.MenuController.makeMenu(state, {menu: "viewMenu", selected: [0, 0] || selected, sound: "change-menu", display: "menu"});
                    }
                },
                shopsMenu: {
                    func: "navigateMenu",
                    preDisplay: (state) => {
                        let player = state.turnOrder[0];
                        //TODO: check against the allowed for this turn (deafult is one time)
                        if(player.p.auctioned > 0){
                            state.menus[0].itemGrid[2][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[2][0][1] = "cursorSelectShop";
                        }
                        if(player.p.upgraded > 0){
                            state.menus[0].itemGrid[1][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[1][0][1] = "cursorSelectShop";
                        }
                        if(player.p.invested > 0){
                            state.menus[0].itemGrid[0][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[0][0][1] = "cursorSelectShop";
                        }
                    },
                    options:[
                        ["Invest", "cursorSelectShop", ["invest", "toShopsMenu"]],
                        ["Upgrade", "cursorSelectShop", ["upgrade", "toShopsMenu"]],
                        ["Auction", "cursorSelectShop", ["auction", "toShopsMenu"]],
                        ["Back", "goBack"]
                    ],
                    invalidAction: () => {
                        return {func: "invalidAction"};
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 1], sound: "change-menu", display: "menu"});
                    },
                    //Gives the active player a cursor that they can move around the map to select a shop.
                    //What happens after selecting the shop is determined by the passed in type
                    cursorSelectShop: (state, finish, goBack, startPos) => {
                        return BG.MenuController.makeMoveShopSelector(state, finish, goBack, startPos);
                    }
                },
                stocksMenu: {
                    func: "navigateMenu",
                    preDisplay: (state) => {
                        let player = state.turnOrder[0];
                        /*if(player.p.soldStock > 0){
                            state.menus[0].itemGrid[0][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[0][0][1] = "showBuyStockMenu";
                        }
                        if(player.p.boughtStock > 0){
                            state.menus[0].itemGrid[1][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[1][0][1] = "showSellStockMenu";
                        }*/
                    },
                    options:[
                        ["Sell Stock", "showSellStockMenu"],
                        ["Check Stock", "showCheckStockMenu"],
                        ["Back", "goBack"]
                    ],
                    showSellStockMenu: (state, selected) => {
                        return BG.MenuController.makeCustomMenu(state, "districtMenu", {type: "sellStock", prev: ["stocksMenu", [0, 0], "menu"], selected: selected});
                    },
                    showCheckStockMenu: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "checkStockMenu", {type: "checkStock", prev: ["stocksMenu", [0, 1], "menu"]});
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 2], sound: "change-menu", display: "menu"});
                    }
                },
                districtMenu: {
                    func: "navigateMenu",
                    preDisplay: (state) => {
                        state.map.districts.forEach((d, i) => {
                            state.menus[0].itemGrid.push([[d.name, "selectDistrict", [i]]]);
                        });
                        //state.menus[0].itemGrid.push([["Back", "goBack"]]);
                        switch(state.menus[0].data.type){
                            case "buyStock":
                                state.menus[0].data.text = ["Select a district to buy stock in."];
                                break;
                            case "sellStock":
                                state.menus[0].data.text = ["Select the district you want to sell stock in."];
                                break;
                            case "viewMap":
                                state.menus[0].data.text = ["This text is hidden... Same with above..."];
                                break;
                        }
                    },
                    options: [],
                    text: ["Placeholder (text should be set in preDisplay)."],
                    onHoverOption: (option, idx) => {
                        if(idx < BG.state.map.districts.length){
                            BG.state.mapMenu.pulseDistrictTiles(idx);
                            BG.state.mapMenu.displayDistrictData(idx);
                        }
                    },
                    selectDistrict: (state, itemIdx) => {
                        switch(state.menus[0].data.type){
                            case "buyStock":
                                return [
                                    BG.MenuController.makeCustomMenu(state, "buyStockCyclerMenu", {cycler: 4, district: itemIdx})
                                ];
                            case "sellStock":
                                return [
                                    BG.MenuController.makeCustomMenu(state, "sellStockCyclerMenu", {cycler: 4, district: itemIdx})
                                ];
                            //Don't even need a case for viewMap
                        }
                    },
                    goBack: (state) => {
                        return [
                            {func: "clearStage", num: 2},
                            {func: "showHUD"},
                            BG.MenuController.makeMenu(state, {menu: state.menus[0].data.prev[0], selected: state.menus[0].data.prev[1], sound: "change-menu", display: state.menus[0].data.prev[2]})
                        ];
                    }
                },
                askIfBuyingStock: {
                    func: "navigateMenu",
                    options:[
                        ["Yes", "confirmTrue"],
                        ["No", "confirmFalse"]
                    ],
                    text: ["Would you like to buy stock?"],
                    confirmTrue: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "districtMenu", {type: "buyStock", prev: ["askIfBuyingStock", [0, 0], "dialogue"], selected: 0});
                    },
                    confirmFalse: (state) => {
                        let props = [{func: "clearStage", num: 2}];
                        let move = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                        if(move){
                            props.push(move);
                        }
                        return props;
                    }
                    
                },
                buyStockCyclerMenu: {
                    func: "controlNumberCycler",
                    confirm: (state) => {
                        let stockNumber = BG.MenuController.getValueFromNumberCycler(state);
                        let district = state.menus[0].data.district;
                        //If the invest amount is greater than allowed, set the amount to the allowed amount.
                        let stockCost = stockNumber * district.stockPrice;
                        let player = state.turnOrder[0];
                        let maxPurchasable = ~~(player.p.money / district.stockPrice);
                        if(stockNumber > district.stockAvailable || stockCost > player.p.money){
                            let newAmount = Math.min(district.stockAvailable, maxPurchasable);
                            return BG.MenuController.setNumberCyclerValue(state, newAmount);
                        }
                        else {
                            if(stockNumber === 0){
                                return BG.MenuController.inputStates.buyStockCyclerMenu.goBack(state);
                            } else {
                                BG.GameController.addBoardAction(state, "prev", "changePlayerStock", [player, district], [stockNumber, -stockCost]);
                                
                                let props = [
                                    {func: "finalizeBuyStock", num: stockNumber, cost: -stockCost, district: district.id, playerId: player.p.playerId},
                                    {func: "clearStage", num: 2}
                                ];
                                let finish = BG.GameController.checkFinishMove(state, state.turnOrder[0]);
                                if(finish) props = props.concat(finish);
                                return props;
                            }
                        }
                    },  
                    goBack: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "districtMenu", {type: "buyStock", prev: ["askIfBuyingStock", [0, 0], "dialogue"], selected: [0, state.menus[0].data.district.id]});
                    }
                },
                sellStockCyclerMenu: {
                    func: "controlNumberCycler",
                    confirm: (state) => {
                        let stockNumber = BG.MenuController.getValueFromNumberCycler(state);
                        let district = state.menus[0].data.district;
                        //If the invest amount is greater than allowed, set the amount to the allowed amount.
                        let stockCost = stockNumber * district.stockPrice;
                        let player = state.turnOrder[0];
                        if(stockNumber > player.p.stocks[district.id]){
                            let newAmount = player.p.stocks[district.id];
                            return BG.MenuController.setNumberCyclerValue(state, newAmount);
                        }
                        else {
                            if(stockNumber === 0){
                                return BG.MenuController.inputStates.sellStockCyclerMenu.goBack(state);
                            } else {
                                let response = [
                                    {func: "finalizeSellStock", num: -stockNumber, cost: stockCost, district: state.menus[0].data.district.id, playerId: player.p.playerId},
                                    {func: "removeItem", item:"NumberCyclerMenu", stage: 2},
                                    {func: "removeItem", item:"MapMenu", stage: 2},
                                    {func: "showHUD"}
                                ];
                                BG.GameController.changePlayerStock(player, district, -stockNumber, stockCost);
                                
                                //BG.GameController.addBoardAction(state, "prev", "changePlayerStock", [player, district], [-stockNumber, stockCost]);
                                if(state.forceSellAssets){
                                    if(player.p.money >= 0){
                                        response.push(BG.GameController.endTurn(state));
                                    } else {
                                        response.push(BG.MenuController.makeMenu(state, {menu: "forceSellAsset", display: "dialogue"}));
                                    }
                                } else {
                                    response.push(BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], sound: "purchase-item", display: "menu"}));
                                }
                                return response;
                            }
                        }
                    },  
                    goBack: (state) => {
                        return [
                            {func: "removeItem", item:"NumberCyclerMenu", stage: 2},
                            {func: "removeItem", item:"MapMenu", stage: 2},
                            BG.MenuController.inputStates.stocksMenu.showSellStockMenu(state, [0, state.menus[0].data.district.id])
                        ];
                    }
                },
                checkStockMenu: {
                    func: "confirmer",
                    confirm: (state) => {
                        return BG.MenuController.inputStates.checkStockMenu.goBack(state);
                    },
                    goBack: (state) => {
                        return BG.MenuController.inputStates.playerTurnMenu.showStocksMenu(state, [0, 1]);
                    }
                },
                itemsMenu: {
                    func: "navigateMenu",
                    preDisplay: (state) => {
                        state.turnOrder[0].p.items.forEach((item, i) => {
                            state.menus[0].itemGrid.push([[item, "useItem", [i]]]);
                        });
                        state.menus[0].itemGrid.push([["Back", "goBack"]]);
                    },
                    options: [],
                    useItem: (state, itemIdx) => {
                        //Open a minimenu to to confirm item use.
                        return BG.MenuController.makeMenu(state, {
                            display: "menu",
                            menu: "confirmer",
                            sceneNum: 3,
                            menuProps: {
                                boxX: 200,
                                boxY: 50,
                                boxW: 160,
                                text: "Use " + state.turnOrder[0].p.items[itemIdx] + "?",
                                textLines: 1
                            },
                            props: {
                                itemIdx: itemIdx,
                                menuIdx: itemIdx
                            },
                            confirm: (state, itemIdx) => {
                                return BG.GameController.useItem(state, itemIdx);
                            },
                            goBack: (state, menuIdx) => {
                                return [
                                    {func: "clearStage", num: 3},
                                    BG.MenuController.inputStates.playerTurnMenu.showItemsMenu(state, [0, menuIdx || 0])
                                ]
                            }
                        });
                        
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 3], sound: "change-menu", display: "menu"});
                    }
                },
                //A small yes/no box with passed in confirm and goBack functions
                confirmer: {
                    func: "navigateMenu",
                    preDisplay: (state) => {  
                        state.menus[0].itemGrid[0][0][2][0] = state.menus[0].data.props.itemIdx;
                        state.menus[0].itemGrid[1][0][2][0] = state.menus[0].data.props.menuIdx;
                    },
                    options:[
                        ["Yes", "confirm", [0]],
                        ["No", "goBack", [0]]
                    ],
                },
                viewMenu: {
                    func: "navigateMenu",
                    options:[
                        ["View Board", "viewBoard"],
                        ["View Map", "viewMap"],
                        ["View Standings", "viewStandings"],
                        ["Back", "goBack"]
                    ],
                    viewBoard: (state) => {
                        let player = state.turnOrder[0];
                        return BG.MenuController.makeMoveShopSelector(state, "viewBoard", "toViewMenu", player.p.loc, "all");
                    },
                    viewMap: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "districtMenu", {type: "viewMap", prev: ["viewMenu", [0, 1], "menu"]});
                    },
                    viewStandings: (state) => {
                        
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 5], sound: "change-menu", display: "menu"});
                    }
                },
                selectAPlayerMenu: {
                    func: "navigateMenu",
                    preDisplay: (state) => {
                        let activePlayer = state.turnOrder[0];
                        state.players.forEach((player) => {
                            if(player.p.playerId !== activePlayer.p.playerId){
                                state.menus[0].itemGrid.push([[player.p.name, "selectPlayer", [player.p.playerId]]]);
                            }
                        });
                        state.menus[0].itemGrid.push([["Back", "goBack"]]);
                    },
                    options:[],
                    text: ["Select a player to make a deal with."],
                    selectPlayer: (state, idx) => {
                        switch(state.menus[0].data.next){
                            case "setUpDeal":
                                return [
                                    BG.MenuController.makeCustomMenu(state, "dealList", {player: idx}),
                                    BG.MenuController.makeCustomMenu(state, "dealMenu", {player: idx})
                                ];
                        }
                    },
                    goBack: (state) => {
                        return [
                            {func: "clearStage", num: 2},
                            BG.MenuController.makeMenu(state, {menu: state.menus[0].data.prev[0], selected: state.menus[0].data.prev[1], sound: "change-menu", display: "menu"})
                        ];
                    }
                },
                //Once the user presses selectTrade, go to the trade items column.
                dealMenu: {
                    func: "navigateMenu",
                    text: ["Select requested items."],
                    options: [
                        ["Add Item", "addItem"],
                        ["Remove Item", "removeItem"],
                        ["Edit Item", "editItem"],
                        ["Select Trade", "selectTrade"],
                        ["Cancel Deal", "goBack"]
                    ],
                    addItem: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "showDealItemTypes", display: "dialogue"});
                    },
                    removeItem: (state) => {
                        console.log(state.currentDeal)
                        if(state.currentDeal[state.currentDeal.currentSelection].length){
                            if(state.currentDeal.currentSelection === "requested"){
                                return BG.MenuController.switchMenu(state, {menu:"dealListRequested", type: "remove"});
                            } else {
                                return BG.MenuController.switchMenu(state, {menu:"dealListTrade", type: "remove"});
                            }
                        } else {
                            return {func: "invalidAction"};
                        }
                    },
                    editItem: (state) => {
                        if(state.currentDeal[state.currentDeal.currentSelection].length){
                            if(state.currentDeal.currentSelection === "requested"){
                                return BG.MenuController.switchMenu(state, {menu:"dealListRequested", type: "edit"});
                            } else {
                                return BG.MenuController.switchMenu(state, {menu:"dealListTrade", type: "edit"});
                            }
                        } else {
                            return {func: "invalidAction"};
                        }
                    },
                    selectTrade: (state) => {
                        state.currentDeal.currentSelection = "trade";
                        return [
                            {func:"setStateValue", path: "currentDeal.currentSelection", value: "trade"}, 
                            BG.MenuController.makeMenu(state, {menu: "tradeDealMenu", display: "dialogue"})
                        ];
                    },
                    goBack: (state) => {
                        return [
                            {func: "clearStage", num: 2},
                            {func: "clearStage", num: 3},
                            BG.MenuController.clearMenus(state, "all"),
                            BG.MenuController.makeMenu(state, {
                                menu: "selectAPlayerMenu", 
                                next: "setUpDeal",
                                prev: ["playerTurnMenu", [0, 4], "menu"],
                                display: "dialogue"
                            })
                        ];
                    }
                },
                dealListRequested:{
                    func: "navigateMenu",
                    options: [],
                    selectItem: (state, itemIdx) => {

                    },
                    goBack: (state) => {
                        return BG.MenuController.switchMenu(state, { menu:"dealMenu" }); 
                    }
                },
                dealListTrade: {
                    func: "navigateMenu",
                    options: [],
                    selectItem: (state, itemIdx) => {

                    },
                    goBack: (state) => {
                        return BG.MenuController.switchMenu(state, { menu:"dealMenu" }); 
                    }
                },
                tradeDealMenu: {
                    func: "navigateMenu",
                    text: ["Select trade items."],
                    options: [
                        ["Add Item", "addItem"],
                        ["Remove Item", "removeItem"],
                        ["Edit Item", "editItem"],
                        ["Negotiate Terms", "negotiate"],
                        ["Select Requested", "selectRequested"]
                    ],
                    addItem: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "showDealItemTypes", display: "dialogue"});
                    },
                    removeItem: (state) => {
                        if(state.currentDeal[state.currentDeal.currentSelection].length){
                            //Switch the menu controls to another menu
                            return BG.MenuController.switchMenu(state, "selectCurrentDealItem", [0, 0], {removing: true});
                        } else {
                            return {func: "invalidAction"};
                        }
                    },
                    editItem: (state) => {
                        if(state.currentDeal[state.currentDeal.currentSelection].length){
                            return BG.MenuController.switchMenu(state, "selectCurrentDealItem", [0, 0], {editing: true});
                        } else {
                            return {func: "invalidAction"};
                        }
                    },
                    negotiate: (state) => {
                        //Only allow negotiate if there's at least one thing selected.
                        if(!state.currentDeal["requested"].length && !state.currentDeal["trade"].length){
                            return {func: "invalidAction"};
                        } else {
                            //First, show an animation and allow for one more menu to confirm the trade.
                            //Then, send the request to the other player
                        }
                    },
                    selectRequested: (state) => {
                        state.currentDeal.currentSelection = "requested";
                        return [
                            {func:"setStateValue", path: "currentDeal.currentSelection", value: "requested"}, 
                            BG.MenuController.makeMenu(state, {
                                menu: "dealMenu",
                                player: state.currentDeal.dealWith, 
                                display: "dialogue"
                            })
                        ];
                    }
                },
                showDealItemTypes: {
                    func: "navigateMenu",
                    text: ["Select the type"],
                    options: [
                        ["Shop", "selectShop"],
                        ["Stock", "selectStock"],
                        ["Money", "selectMoney"],
                        ["Item", "selectItem"],
                        ["Set Piece", "selectSetPiece"],
                        ["Back", "goBack"]
                    ],
                    selectShop: (state) => {

                    },
                    selectStock: (state) => {

                    },
                    selectMoney: (state) => {

                    },
                    selectItem: (state) => {
                        let response = BG.MenuController.makeMenu(state, {
                            menu: "showPlayerItems",
                            type: "selectForDeal", 
                            display: "dialogue"
                        });
                        return response;
                    },
                    selectSetPiece: (state) => {
                        let response = BG.MenuController.makeMenu(state, {
                            menu: "showPlayerSetPieces",
                            type: "selectForTrade",
                            display: "dialogue"
                        });
                        return response;
                    },
                    goBack: (state) => {
                        return [
                            BG.MenuController.makeCustomMenu(state, "dealMenu", {player: state.currentDeal.dealWith})
                        ];
                    }
                },
                showPlayerItems: {
                    func: "navigateMenu",
                    text: ["Placeholder"],
                    preDisplay: (state) => {
                        switch(state.menus[0].data.type){
                            case "selectForDeal":
                                let id = state.currentDeal.currentSelection === "requested" ? state.currentDeal.dealWith : state.turnOrder[0].p.playerId;
                                let player = BG.GameController.getPlayer(state, id);

                                for(let i = 0; i < player.p.items.length; i++){
                                    state.menus[0].itemGrid.push([[player.p.items[i].name, "selectItem", [i]]]);
                                }
                                state.menus[0].itemGrid.push([["Back", "goBack"]]);

                                state.menus[0].data.text = ["Select an item to add to the deal."];
                                break;
                        }
                    },
                    options:[],
                    selectItem: (state, itemIdx) => {
                        let id = state.currentDeal.currentSelection === "requested" ? state.currentDeal.dealWith : state.turnOrder[0].p.playerId;
                        let player = BG.GameController.getPlayer(state, id);
                        let itemProps = {
                            type: "item",
                            item: player.p.items[itemIdx],
                            idx: itemIdx,
                            g: 0
                        };
                        return [
                            BG.GameController.addToDeal(state, itemProps),
                            BG.MenuController.makeMenu(state, {
                                menu: state.currentDeal.currentSelection === "requested" ? "dealMenu" : "tradeDealMenu",
                                player: id,
                                display: "dialogue"
                            })
                        ];
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {
                            menu: "showDealItemTypes",
                            selected: [0, 3],
                            display: "dialogue"
                        });
                    }
                },
                showPlayerSetPieces: {
                    func: "navigateMenu",
                    text: ["Select a Set Piece."],
                    preDisplay: (state) => {
                        let id = state.currentDeal.currentSelection === "requested" ? state.currentDeal.dealWith : state.turnOrder[0].p.playerId;
                        let player = BG.GameController.getPlayer(state, id);
                        
                        //TODO: look through player.p.items
                        
                        /*let keys = Object.keys(player.setPieces);
                        for(let i = 0; i < keys.length; i++){
                            state.menus[0].itemGrid.push([[keys[i], "selectPiece", [i]]]);
                        }*/
                        state.menus[0].itemGrid.push([["Back", "goBack"]]);
                    },
                    options:[],
                    selectPiece: (state, itemIdx) => {
                        let id = state.currentDeal.currentSelection === "requested" ? state.currentDeal.dealWith : state.turnOrder[0].p.playerId;
                        let player = BG.GameController.getPlayer(state, id);
                        
                        
                        //TODO: look through player.p.items
                        
                        let keys = Object.keys(player.setPieces);
                        let itemProps = {
                            type: "setPiece",
                            item: keys[itemIdx],
                            idx: itemIdx,
                            g: 0
                        };
                        return [
                            BG.GameController.addToDeal(state, itemProps),
                            BG.MenuController.makeMenu(state, {
                                menu: state.currentDeal.currentSelection === "requested" ? "dealMenu" : "tradeDealMenu",
                                player: id,
                                display: "dialogue"
                            })
                        ];
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {
                            menu: "showDealItemTypes",
                            selected: [0, 4],
                            display: "dialogue"
                        });
                    }
                },
                setsMenu: {
                    func: "confirmer",
                    confirm: (state) => {
                        return BG.MenuController.inputStates.setsMenu.goBack(state);
                    },
                    goBack: (state) => {
                        return BG.MenuController.inputStates.playerTurnMenu.showViewMenu(state, [0, 2]);
                    }
                },
                menuMovePlayer: {
                    func: "navigateMenu",
                    text: ["Would you like to end your roll here?"],
                    options:[
                        ["Yes", "confirmTrue"],
                        ["No", "confirmFalse"]
                    ],
                    confirmTrue: (state) => {
                        return BG.GameController.playerConfirmMove(state, state.turnOrder[0].p.playerId);
                    },
                    confirmFalse: (state) => {
                        let loc = BG.GameController.playerGoBackMove(state, state.turnOrder[0].p.playerId);
                        state.menus[0].data = {func: "playerMovement", loc: loc};
                        return [
                            {func: "clearStage", num: 2},
                            {func: "playerGoBackMove", loc: loc}
                        ];
                    }
                },
                askBuyShop: {
                    func: "navigateMenu",
                    text: ["Would you like to buy this shop?"],
                    preDisplay: (state) => {
                        let coupon25 = state.turnOrder[0].hasItem("25% off Coupon");
                        if(coupon25){
                            state.menus[0].itemGrid.splice(1, 0, [["Use 25% off coupon", "confirmTrue", ["25% off Coupon"]]]);
                        }
                        let coupon50 = state.turnOrder[0].hasItem("50% off Coupon");
                        if(coupon50){
                            state.menus[0].itemGrid.splice(1, 0, [["Use 50% off coupon", "confirmTrue", ["50% off Coupon"]]]);
                        }
                    },
                    options:[
                        ["Yes", "confirmTrue"],
                        ["No", "confirmFalse"]
                    ],
                    confirmTrue: (state, couponItemName) => {
                        let player = state.turnOrder[0];
                        let couponValue = 0;
                        let itemIdx = -1;
                        if(couponItemName){
                            itemIdx = player.p.items.indexOf(player.p.items.find((item) => {return item === couponItemName;}));
                            player.p.items.splice(itemIdx, 1);
                            couponValue = BG.GameController.getItemData(couponItemName).discount;
                        }
                        let tileOn = BG.MapController.getTileAt(state, player.p.loc);
                        BG.GameController.buyShop(state, player, tileOn, couponValue);

                        BG.GameController.endTurn(state);
                        return {func: "buyShop", loc: player.p.loc, itemIdx: itemIdx, couponValue: couponValue};
                    },
                    confirmFalse: (state) => {
                        return BG.GameController.endTurn(state);
                    }
                },
                askBuyOutShop: {
                    func: "navigateMenu",
                    text: ["Would you like to buy out this shop?"],
                    options:[
                        ["Yes", "confirmTrue"],
                        ["No", "confirmFalse"]
                    ],
                    confirmTrue: (state) => {
                        let player = state.turnOrder[0];
                        let tileOn = BG.MapController.getTileAt(state, player.p.loc);
                        let ownedBy = tileOn.ownedBy;
                        BG.GameController.buyOutShop(state, player, tileOn);
                        BG.GameController.endTurn(state);
                        return [
                            {func: "buyOutShop", loc: player.p.loc},
                            {func: "endTurn"}
                        ];
                    },
                    confirmFalse: (state) => {
                        return BG.GameController.endTurn(state);
                    }
                },
                forceSellAsset: {
                    func: "navigateMenu",
                    text: ["You're out of cash! \nSell some stock or shops."],
                    options: [
                        ["Sell Stock", "sellStock"],
                        ["Sell Shop", "sellShop"]
                    ],
                    preDisplay: (state) => {
                        state.forceSellAssets = true;
                        let player = state.turnOrder[0];
                        if(player.p.shops.length === 0){
                            state.menus[0].itemGrid.splice(1, 1);
                        }
                        //Pretty sure this doesn't work anymore
                        if(BG.GameController.getNumberOfStocks(player) === 0){
                            state.menus[0].itemGrid.splice(0, 1);
                        }
                        if(!state.menus[0].itemGrid.length){
                            state.menus[0].data.text = ["You don't have any more assets. \nYou lose!"];
                            state.menus[0].itemGrid.push([["Done", "loseGame"]]);
                        }
                    },
                    sellStock: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "districtMenu", {type: "sellStock", prev: ["stocksMenu", [0, 0], "menu"]});
                    },
                    sellShop: (state) => {
                        return BG.MenuController.makeMoveShopSelector(state, "confirmSellShop", "forceSellAsset", state.turnOrder[0].p.loc);
                    },
                    loseGame: (state) => {
                        state.turnOrder.splice(0, 1);
                        //Change this eventually to check the bankruptcy limit set in the map.
                        if(state.turnOrder.length === 1){
                            BG.GameController.gameOver();
                            return {func: "gameOver"};
                        }
                    }
                },
                confirmSellShop: {
                    func: "navigateMenu",
                    text: ["Are you sure you want to sell this shop?"],
                    options: [
                        ["Yes", "sellShop"],
                        ["No", "goBack"]
                    ],
                    sellShop: (state) => {
                        let response = [
                            BG.MenuController.inputStates.auctionMenu.sellToBank(state, state.menus[0].data.shop)
                        ];
                        if(state.forceSellAssets){
                            //This just sells the shop to the bank at 0.75 rate. 
                            response.push(BG.GameController.endTurn(state));
                        }
                        return response;
                    },
                    goBack: (state) => {
                        if(state.forceSellAssets){
                            return [
                                {func: "clearStage", num: 3},
                                BG.MenuController.makeMenu(state, {menu: "forceSellAsset", display: "dialogue"})
                            ];

                        } else {
                            return [
                                {func: "clearStage", num: 3},
                                BG.MenuController.makeMenu(state, {menu: state.menus[0].data.prev[0], selected: state.menus[0].data.prev[1], sound: "change-menu", display: "menu"})
                            ];
                        }
                    }
                }
            },
            //Confirmer does not take directional inputs. Only confirm/back
            initializeConfirmer: function(state, menu){
                state.menus.push({
                    currentItem: [0, 0],
                    itemGrid: [[[0, "confirm"]]],
                    data:BG.MenuController.inputStates[menu]
                });
            },
            initializeNumberCycler: function(state, menu, props){
                let newMenu = {
                    currentItem:props.currentItem || [props.cycler - 1, 0],
                    itemGrid:[[]],
                    data: BG.MenuController.inputStates[menu]
                };
                for(let i = 0 ; i < props.cycler; i++){
                    newMenu.itemGrid[0].push([0, "confirm"]);
                }
                state.menus.push(newMenu);
            },
            initializeMenu: function(state, data, props){
                let menu = {
                    currentItem: props.selected || [0, 0],
                    itemGrid:[],
                    name: props.menu,
                    persist: props.persist,
                    data: data
                };
                for(let i = 0 ; i < data.options.length; i++){
                    menu.itemGrid.push([data.options[i]]);
                }
                state.menus.unshift(menu);
            },
            confirmMenuOption: function(state){
                let option = state.menus[0].itemGrid[state.menus[0].currentItem[1]][state.menus[0].currentItem[0]];
                option[2] = option[2] !== undefined ? option[2] : [];
                return state.menus[0].data[option[1]](state, ...option[2]);
            },
            pressBackInMenu: function(state){
                if(state.menus[0].data.goBack){
                    return state.menus[0].data.goBack(state);
                }
                return false;
            },
            keepInRange: function(state, coord){
                let currentItem = state.menus[0].currentItem;
                currentItem[0] += coord[0];
                currentItem[1] += coord[1];
                let itemGrid = state.menus[0].itemGrid;
                let maxX, maxY;

                function getMaxY(){
                    let num = 0;
                    for(let i = 0; i < itemGrid.length; i++){
                        if(itemGrid[i] && itemGrid[i][currentItem[0]]) num++;
                    }
                    return num - 1;
                }
                if(coord[0]) maxX = itemGrid[currentItem[1]].length - 1;
                if(coord[1]) maxY = getMaxY();
                if(currentItem[0] > maxX) return [0, currentItem[1]];
                if(currentItem[1] > maxY) return [currentItem[0], 0];
                if(currentItem[0] < 0) return [maxX, currentItem[1]];
                if(currentItem[1] < 0) return [currentItem[0], maxY];
                return currentItem;
            },
            setNumberCyclerValue: function(state, value){
                let itemGrid = state.menus[0].itemGrid;
                let strValue = value.toString();
                let dif = itemGrid[0].length - strValue.length;
                for(let i = itemGrid[0].length - 1; i >= 0; i--){
                    let value = strValue[i - dif] || 0;
                    itemGrid[0][i][0] = parseInt(value);
                    if(state.menus[0].currentCont){
                        state.menus[0].currentCont.p.menuButtons[i][0].changeLabel(state.menus[0].itemGrid[0][i][0]);
                    }
                }
                return {func: "controlNumberCycler", value: value};
            },
            getValueFromNumberCycler: function(state){
                let itemGrid = state.menus[0].itemGrid;
                let value = "";
                for(let i = 0; i < itemGrid[0].length; i++){
                    value += itemGrid[0][i][0];
                }
                return parseInt(value);
            },
            adjustNumberCyclerPosition: function(state, coord){
                let currentItem = state.menus[0].currentItem;
                let itemGrid = state.menus[0].itemGrid;
                //Move up/down
                if(coord[1]){
                    itemGrid[currentItem[1]][currentItem[0]][0] += coord[1];
                    if(itemGrid[currentItem[1]][currentItem[0]][0] < 0) itemGrid[currentItem[1]][currentItem[0]][0] = 9;
                    else if(itemGrid[currentItem[1]][currentItem[0]][0] > 9) itemGrid[currentItem[1]][currentItem[0]][0] = 0;
                    return {func: "controlNumberCycler", num: itemGrid[currentItem[1]][currentItem[0]][0]};
                } 
                //Move left/right
                else if(coord[0]){
                    do {
                        currentItem = this.keepInRange(state, coord);
                    }
                    while(!itemGrid[currentItem[1]][currentItem[0]]);
                    state.menus[0].currentItem = currentItem;
                    return {func: "controlNumberCycler", item: state.menus[0].currentItem};
                }

            },
            setMenuPosition: function(state, coord){
                if(state.menus[0].currentCont) state.menus[0].currentCont.hoverButton(coord);
                state.menus[0].currentItem = coord;
            },
            adjustMenuPosition: function(state, coord){
                let currentItem = state.menus[0].currentItem;
                let itemGrid = state.menus[0].itemGrid;
                do {
                    currentItem = this.keepInRange(state, coord);
                }
                while(!itemGrid[currentItem[1]][currentItem[0]]);
                this.setMenuPosition(state, currentItem);
                return {item: state.menus[0].currentItem, func: "navigateMenu"};
            },
            processShopSelectorInput: function(state, inputs){
                if(inputs.confirm){
                    //Make sure the tile is valid
                    let tile = BG.MapController.getTileAt(state, BG.Utility.getLoc(state.shopSelector.position.x, state.shopSelector.position.z));
                    if(!tile) return;
                    let valid = false;
                    switch(state.shopSelector.p.type){
                        case "currentOwned":
                            if(state.turnOrder[0] === tile.ownedBy) valid = true;
                            break;
                        case "unowned":
                            if(!tile.ownedBy) valid = true;
                            break;
                        case "unownedByCurrent":
                            if(state.turnOrder[0] !== tile.ownedBy) valid = true;
                            break;
                        case "vendor":
                            if(tile.type === "vendor") valid = true;
                            break;
                        case "shop":
                            if(tile.type === "shop") valid = true;
                            break;
                        case "itemshop":
                            if(tile.type === "itemshop") valid = true;
                            break;
                        case "all":
                            valid = true;
                            break;
                    }
                    if(valid){
                        return state.menus[0].data.finish(state, tile);
                    } else {
                        return {func: "invalidAction"};
                    }
                } else if(inputs.back){
                    return state.menus[0].data.goBack(state, state.menus[0].data.backOption);
                } else {
                    state.shopSelector.dispatchEvent({type: "moved", inputs: inputs});
                    if(state.shopSelector.position.x !== state.shopSelector.p.lastX || state.shopSelector.position.z !== state.shopSelector.p.lastZ){
                        let props = [state.shopSelector.position.x, state.shopSelector.position.z];
                        if(state.shopSelector.atTile){
                            props.push(true);
                        } else if(state.shopSelector.changedShop){
                            props.push("details");
                        }
                        return {func: "moveShopSelector", move: props};
                    }
                }
            },
            processConfirmerInput: function(state, inputs){
                if(inputs.confirm){
                    return BG.MenuController.confirmMenuOption(state);
                } else if(inputs.back){
                    return BG.MenuController.pressBackInMenu(state);
                }
            },
            processNumberCyclerInput: function(state, inputs){
                if(inputs.confirm){
                    return BG.MenuController.confirmMenuOption(state);
                } else if(inputs.back) { 
                    return BG.MenuController.pressBackInMenu(state);
                } else if(inputs.up) { 
                    return this.adjustNumberCyclerPosition(state, [0, 1]);
                } else if(inputs.down) { 
                    return this.adjustNumberCyclerPosition(state, [0, -1]);
                } else if(inputs.left) { 
                    return this.adjustNumberCyclerPosition(state, [-1, 0]);
                } else if(inputs.right) { 
                    return this.adjustNumberCyclerPosition(state, [1, 0]);
                }
            },
            processMenuInput: function(state, inputs){
                if(inputs.confirm){
                   return BG.MenuController.confirmMenuOption(state);
                } else if(inputs.back) { 
                   return BG.MenuController.pressBackInMenu(state);
                } else if(inputs.up){
                   return this.adjustMenuPosition(state, [0, -1]);
                } else if(inputs.down){
                   return this.adjustMenuPosition(state, [0, 1]);
                }
            },
            processRollDieInput: function(state, inputs){
                if(inputs.confirm){
                    let rollsNums = state.menus[0].data.rollsNums;
                    BG.GameController.throwDice(state, state.currentMovementNum, rollsNums);
                    return [{func: "throwDice", currentMovementNum: state.currentMovementNum, rollsNums: rollsNums}];
                } else if(inputs.back){
                    if(state.menus[0].data.forceRoll){
                        return {func: "invalidAction"};
                    } else {
                        state.currentMovementNum = false;
                        return [
                            {func: "removeItem", item: "dice"}, 
                            {func:"setStateValue", path: "currentMovementNum", value: false}, 
                            BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], display: "menu"})
                        ];
                    }
                }
            }
        };
        BG.GameController = {
            addBoardAction: function(state, tile, action, props, reverse){
                //Do the initial action
                BG.GameController[action](...props.concat(reverse));
                //If the effect is done when going to the tile before this one.
                if(tile === "prev") tile = state.currentMovementPath[state.currentMovementPath.length - 2];
                //Add the action to the list.
                state.currentBoardActions.push([tile, action, props.concat(reverse.map((p) => {return -p;}))]);
            },
            addMovementNum: function(state, num){
                state.currentMovementNum += num;
            },
            movementIsFinished: function(state){
                return state.currentMovementPath.length === state.currentMovementNum + 1;
            },
            getItemEffect: function(state, player, effect){
                return player.p.itemEffects.filter((e) => {
                    return e.name === effect;
                }).length;
            },
            getItemData: function(itemName){
                return BG.c.items.find((itm) => {return itm.name === itemName;});
            },
            warpPlayerTo: function(state, player, tileTo, subdueConfirmMove){
                player.p.loc = tileTo.loc;
                player.p.tileTo = tileTo;
                state.currentMovementPath = [];
                player.p.skipFinish = true;
                player.p.finish = true;
                if(!BG.Utility.isServer()){
                    player.moveTo(tileTo.loc);
                }
                if(subdueConfirmMove) return {func: "warpPlayerTo", loc: tileTo.loc, subdue: subdueConfirmMove};
                let props = {
                    func: "playerMovement",
                    loc: tileTo.loc,
                    passBy: false,
                    finish: player.p.finish,
                    skipFinish: player.p.skipFinish
                };
                if(BG.MapController.checkPassByTile(state, player)){
                    props.passBy = true;
                    return props;
                }
                return BG.GameController.playerConfirmMove(state, player.p.playerId);
            },
            finishMoveShopSelector: function(state, key, tile, props){
                let response = [{func: "setBGValue", path: "preventMultipleInputs", value: true}, {func: "removeItem", item: "shopSelector"}, {func: "finishMoveShopSelector", key: key, loc: tile.loc, props: props}];
                switch(key){
                    case "investMenu":
                    case "upgradeMenu":
                    case "auctionMenu":
                        BG.MenuController.makeCustomMenu(state, key, Object.assign({shop: tile}, props));
                        break;
                    case "warpPlayerTo":
                        response = response.concat(BG.GameController.warpPlayerTo(state, state.turnOrder[0], tile));
                        break;
                    case "confirmSellShop":
                        response.push(BG.MenuController.makeMenu(state, {menu: "confirmSellShop", display: "dialogue"}));
                        state.menus[0].data.shop = tile;
                        break;
                }
                return response;
            },
            useItem: function(state, itemIdx){
                //If we want to have items that have number of uses (block the next 3 shop fees, etc...), 
                //a new property should be added called "uses" and it should be decreased on use.
                //Right now, the items that last one time just get removed at the start of the user's next turn.
                
                

                let player = state.turnOrder[0];
                
                let item = BG.GameController.getItemData(player.p.items[itemIdx]);
                if(item && item.usable){
                    /* Delayed use items (add an item effect for activation later) */
                    /* Extra Die
                     * Double Turn
                     * Invisible
                     * Double Stock
                     * Commision
                     * Big Commision
                     * Stock Stealer
                     */
                    if(item.turns){
                        let effect = {
                            turns: item.turns,
                            name: item.name
                        };
                        player.p.itemEffects.push(effect);
                        BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], display: "menu"});
                        if(!BG.Utility.isServer()){
                            BG.AudioController.playSound("use-item");
                        }
                    } 

                    /* Immediate use items (don't add an item effect) */
                    /* Warp
                     * Steal Set Piece
                     * Thief
                     * Steal Item
                     * Bingo Player
                     */
                    else {
                        switch(item.name){
                            case "Warp":
                                BG.MenuController.makeMoveShopSelector(state, "warpPlayerTo", false, player.p.loc, "all");
                                break;
                        }

                    };

                    player.p.items.splice(itemIdx, 1);
                    return [
                        {func: "clearStage", num: 2},
                        {func: "clearStage", num: 3},
                        {func: "useItem", itemIdx: itemIdx}
                    ];
                } else {
                    /* Non-usable items (Items that are prompted to use at a later time and not used from the menu)*/
                    /* 25% off Shop Coupon
                     * 50% off Item Coupon 
                     */
                     return {func: "invalidAction"};
                }
            },
            exchangeForSet: function(state, set, playerId){
                let player = BG.GameController.getPlayer(state, playerId);
                let bonus = state.bonusPool;
                let amount = set.value + bonus;
                
                BG.GameController.addBoardAction(state, "prev", "changePlayerMoney", [player], [amount]);
                BG.GameController.addBoardAction(state, "prev", "changePlayerNetValue", [player], [amount]);
                set.items.forEach((item) => {
                    BG.GameController.addBoardAction(state, "prev", "changePlayerItem", [player, item], [-1]);
                });
                BG.GameController.addBoardAction(state, "prev", "changePlayerEXP", [player], [50]);
                BG.GameController.addBoardAction(state, "prev", "changeBonusPool", [player], [-bonus]);

            },
            exchangeItem: function(state, itemNeeded, exchangeFor, playerId){
                let player = BG.GameController.getPlayer(state, playerId);
                BG.GameController.addBoardAction(state, "prev", "changePlayerItem", [player, itemNeeded], [-1]);
                //Exchanging for money
                if(Number.isInteger(exchangeFor)){
                    BG.GameController.addBoardAction(state, "prev", "changePlayerMoney", [player], [exchangeFor]);
                    BG.GameController.addBoardAction(state, "prev", "changePlayerNetValue", [player], [exchangeFor]);
                } 
                //Exchanging for an item.
                else {
                    BG.GameController.addBoardAction(state, "prev", "changePlayerItem", [player, exchangeFor], [1]);
                }
            },
            purchaseItem: function(state, itemName, itemCost, playerId){
                let player = BG.GameController.getPlayer(state, playerId);
                BG.GameController.addBoardAction(state, "prev", "changePlayerItem", [player, itemName], [1]);
                BG.GameController.addBoardAction(state, "prev", "changePlayerMoney", [player], [-itemCost]);
                BG.GameController.addBoardAction(state, "prev", "changePlayerNetValue", [player], [-itemCost]);
            },
            changePlayerItem: function(player, item, add){
                if(add > 0){
                    player.p.items.push(item);
                } else {
                    player.p.items.splice(player.p.items.indexOf(item), 1);
                }
            },
            addPlayerInterestEffect: function(player, percentage, turns){
                let effect = {
                    turns: turns,
                    name: "Interest",
                    amount: percentage
                };
                player.p.itemEffects.push(effect);
            },
            checkPlayerHasEffect: function(player, effect){
                return player.p.itemEffects.filter((e) => {
                    return e.name === effect;
                }).length ? true : false;
            },
            getAllPlayersWithEffect: function(players, effect){
                return players.filter((player) => {
                    return BG.GameController.checkPlayerHasEffect(player, effect);
                });
            },
            //Returns an object of the players that get interest with the amount that they get
            getPlayersThatGetInterest: function(players){
                return players.filter((player) => {
                    return player.p.itemEffects.filter((effect) => {
                        return effect.name === "Interest";
                    }).length ? true : false;
                }).map((player) => {
                    let interestPercentage = 0;
                    player.p.itemEffects.forEach((effect) => {
                        if(effect.name === "Interest") interestPercentage += effect.amount;
                    });
                    return {player: player, percentage: interestPercentage};
                });
            },
            changePlayerStock: function(player, district, num, price){
                district.stockAvailable -= num;
                player.p.stocks[district.id] += num;
                BG.GameController.changePlayerMoney(player, price);
                
            },
            changeBonusPool: function(state, amount){
                state.bonusPool += amount;
            },
            changePlayerEXP: function(player, exp){
                player.p.exp += exp;
                //Adding to exp, so check to add level
                if(exp > 0){
                    if(player.p.exp >= 100){
                        BG.GameController.changePlayerRank(player, 1);
                        player.p.exp -= 100;
                    }
                } 
                //If reducing exp (from going back), check to reduce level.
                else {
                    if(player.p.exp < 0){
                        BG.GameController.changePlayerRank(player, -1);
                        player.p.exp += 100;
                    }
                }
                    
            },
            changePlayerRank: function(player, rank){
                player.p.rank += rank;
            },
            //TODO: use player.p.items
            changeSetItemQuantity: function(player, itemName, number){
                if(!player.setPieces[itemName]) player.setPieces[itemName] = 0;
                player.setPieces[itemName] += number;
            },
            
            changePlayerMoney: function(player, amount){
                player.p.money += amount;
                if(!BG.Utility.isServer()){
                    player.sprite.dispatchEvent({type: "moneyChanged"});
                }
            },
            changePlayerNetValue: function(player, amount){
                player.p.netValue += amount;
                if(!BG.Utility.isServer()){
                    player.sprite.dispatchEvent({type: "netValueChanged"});
                }
            },
            hasCompleteSet: function(player, items){
                return items.every((item) => {
                    return player.p.items.filter((itm) => {return itm.name === item;}).length;
                });
            },
            startRollingDie: function(state, rollsNums, player){
                state.dice = [];
                let playerPos = BG.Utility.getXZ(player.p.loc);
                let scene = BG.scene;
                for(let i = 0; i < rollsNums.length; i++){
                    let die = BG.GameController.createObject("Die", {
                        x: playerPos.x + BG.c.tileW - rollsNums.length / 2 + i,
                        y: 2.88,
                        z: playerPos.z + BG.c.tileH
                    }, {roll: rollsNums[i]});
                    scene.add(die);
                    state.dice.push(die);
                    
                }
                function soundOn(){
                    if(state.dice.length && !state.currentMovementNum){
                        if(!BG.AudioController.checkSoundIsPlaying("roll-die")){
                            BG.AudioController.playSound("roll-die", soundOn);
                        }
                    }
                }
                soundOn();
            },
            //Removes all dice
            removeDice: function(state){
                if(state.dice.length){
                    state.dice.forEach((die) => {die.remove();});
                    state.dice = [];
                }
            },
            playerMovement: function(state, inputs, id){
                let obj = BG.MapController.processPlayerMovement(state, inputs, id);
                obj.finish = BG.GameController.movementIsFinished(state);
                if(obj.finish && !obj.passBy){
                    BG.GameController.askFinishMove(state, BG.GameController.getPlayer(state, id));
                    obj = [obj, {func: "removeItem", item: "moveArrows"}];
                }
                return obj;
            },
            throwDice: function(state, num, rollsNums){
                state.rollsNums = rollsNums;
                state.currentMovementNum = num;
                state.currentMovementPath = [BG.MapController.getTileAt(state, state.turnOrder[0].p.loc)];
                state.menus[0].data = {func: "playerMovement"};
                //On the client, show the throw dice animation and then allow movement.
                if(!BG.Utility.isServer()){
                    BG.AudioController.stopSound("roll-die");
                    BG.AudioController.playSound("throw-die");
                    state.diceFinished = 0;
                    state.dice.forEach((die, i) => die.roll(rollsNums[i]));
                    //state.disableInputs = true;
                    state.disableInputs = false; //TEMP to skip animation of dice
                    state.counter = BG.GameController.createObject("MoveCounter", state.turnOrder[0].sprite.position, {state: BG.state, roll: state.currentMovementNum});//TEMP to add the counter right away.
                    BG.scene.add(state.counter);
                }
            },
            checkFinishMove: function(state, player){
                let finish = BG.GameController.movementIsFinished(state);
                let skipFinish = player.p.skipFinish;
                if(skipFinish){
                    return BG.GameController.playerConfirmMove(state, player.p.playerId);
                } else if(finish){
                    return BG.GameController.askFinishMove(state, player);
                } else {
                    state.menus[0].data = {func: "playerMovement"};
                }
            },
            
            //TODO: test that PayBlock and Interest work with 3+ players.
            payOwnerOfShop: function(state, player, tileOn){
                let district = tileOn.district;
                let totalAmount = tileOn.cost;
                //First, see if the player can block some of the amount owed with an item effect
                if(BG.GameController.checkPlayerHasEffect(player, "PayBlock")){
                    let blockedPercentage = 0;
                    player.p.itemEffects.forEach((effect) => {
                        if(effect.name === "PayBlock") blockedPercentage += effect.amount;
                    });
                    totalAmount -= ~~(totalAmount * blockedPercentage);
                    //Cut the function short as there's no money exchange.
                    if(totalAmount === 0){
                        return {func: "payOwnerOfShop", loc: tileOn.loc};
                    }
                };
                
                //The player that landed on the tile must pay the full amount
                BG.GameController.changePlayerMoney(player, -totalAmount);
                BG.GameController.changePlayerNetValue(player, -totalAmount);
                
                //Tax the total amount
                let tax = ~~(totalAmount * (tileOn.rank * 0.01));
                //Add the tax to the bonus pool
                BG.GameController.changeBonusPool(state, tax);
                
                //Here's the new value after tax is taken.
                let amount = totalAmount - tax;
                
                //Give players interest that have the effect
                let interestPlayers = BG.GameController.getAllPlayersWithEffect(state.turnOrder, "Interest");
                //Interest is a percentage. It's organised by turn order, so the closer the player is to the active player, the more of the percentage they get.
                interestPlayers.forEach((player) => {
                    let interestPercentage = 0;
                    player.p.itemEffects.forEach((effect) => {
                        if(effect.name === "Interest") interestPercentage += effect.amount;
                    });
                    let interestAmount = ~~(amount * interestPercentage);
                    BG.GameController.changePlayerMoney(player, interestAmount);
                    BG.GameController.changePlayerNetValue(player, interestAmount);
                    amount -= interestAmount;
                });
                
                
                //The total stocks available in the district (includes stock that has been bought)
                let totalStock = state.map.districts[district].totalStock;
                
                //Once interest is given out, split 50% of the remaining amount between shareholders (player's who own stock in the district)
                //If there are any stock that are not bought, they functionaly go to the shop owner.
                let shareholderShare = ~~(amount / 2);
                //Give the stockholders their share.
                state.turnOrder.forEach((p) => {
                    let sharePercent = p.p.stocks[district] / totalStock;
                    let shareAmount = Math.round(sharePercent * shareholderShare);
                    BG.GameController.changePlayerMoney(p, shareAmount);
                    BG.GameController.changePlayerNetValue(p, shareAmount);
                    
                    //Reduce the final amount by the amount given to the shareholder.
                    amount -= shareAmount;
                });
                
                
                //The owner of the shop gets his share after the interest is taken care of.
                BG.GameController.changePlayerMoney(tileOn.ownedBy, amount);
                BG.GameController.changePlayerNetValue(tileOn.ownedBy, amount);
                
                return {func: "payOwnerOfShop", loc: tileOn.loc};
            },
            askToBuyShop: function(state, player, tileOn){
                //If the player doesn't have enough money, skip this step and end the turn
                if(player.p.money < tileOn.value){
                    return BG.GameController.endTurn(state);
                }
                return BG.MenuController.makeMenu(state, {menu: "askBuyShop", display: "dialogue"});
            },
            resetRoll: function(state, player, chooseDirection){
                if(chooseDirection) {
                    player.p.lastTile = false;
                } else {
                    player.p.lastTile = state.currentMovementPath[state.currentMovementPath.length - 2];
                }
                state.currentMovementPath = [];
                state.currentBoardActions = [];
                state.menus[0].data.forceRoll = true;
            },
            //After the player says "yes" to stopping here.
            playerConfirmMove: function(state, id){
                let player = this.getPlayer(state, id);
                let tileOn = BG.MapController.getTileAt(state, player.p.loc);
                switch(tileOn.type){
                    case "shop":
                        //Pay the owner and then give the option to buy out
                        if(tileOn.ownedBy){
                            //If the tile is owned by the player (do nothing???)
                            if(tileOn.ownedBy === player){
                                return BG.GameController.endTurn(state);
                            } 
                            //Pay the owner
                            else {
                                let response = [];
                                response.push(BG.GameController.payOwnerOfShop(state, player, tileOn));
                                //Ask for buyout
                                if(player.p.money >= tileOn.value * 5){
                                    response.push(BG.MenuController.makeMenu(state, {menu: "askBuyOutShop", display: "dialogue"}));
                                } else {
                                    response.push(BG.GameController.endTurn(state));
                                }
                                return response;
                            }
                        } 
                        //Ask if the player would like to buy it.
                        else {
                            return BG.GameController.askToBuyShop(state, player, tileOn);
                        }
                    case "main":
                        BG.GameController.resetRoll(state, player, true);
                        BG.MenuController.inputStates.playerTurnMenu.rollDie(state);
                        return [
                            {func: "resetRoll", choose: true}, 
                            {func: "clearStage", num: 2}, 
                            {func: "rollDie", rollsNums: state.menus[0].data.rollsNums}
                        ];
                    case "vendor":
                        return BG.GameController.endTurn(state);
                    case "itemshop":
                        return BG.GameController.endTurn(state);
                    case "warp":
                        return [BG.GameController.warpPlayerTo(state, player, BG.MapController.getTileAt(state, tileOn.exit), true), BG.GameController.endTurn(state)];
                    case "roll-again":
                        BG.GameController.resetRoll(state, player);
                        BG.MenuController.inputStates.playerTurnMenu.rollDie(state);
                        return [
                            {func: "resetRoll"}, 
                            {func: "clearStage", num: 2},
                            {func: "rollDie", rollsNums: state.menus[0].data.rollsNums}
                        ];
                    case "toll":
                        return BG.GameController.endTurn(state);
                    case "bingo":
                        return BG.GameController.chooseBingoCard();//TODO
                    case "stockbroker":
                        return BG.GameController.endTurn(state);
                    case "arcade":
                        return BG.GameController.startArcade();//TODO
                    case "interest":
                        return BG.GameController.addPlayerInterestEffect(player, Math.min(0.05 * player.rank, 0.5), 1);
                }
            },
            playerGoBackMove: function(state, id){
                let player = this.getPlayer(state, id);
                state.currentMovementPath.pop();
                let tileTo = state.currentMovementPath[state.currentMovementPath.length - 1];
                BG.GameController.movePlayer(player, tileTo);
                BG.MapController.checkResetPassByTile(state, tileTo);
                if(!BG.Utility.isServer()){
                    BG.GameController.tileDetails.displayShop(tileTo);
                    BG.state.counter.updateRoll(player.sprite.position, BG.state.currentMovementNum - (BG.state.currentMovementPath.length - 1), player.p.finish);
                }
                return tileTo.loc;
            },  
            //When the player steps onto the last tile of the movement
            askFinishMove: function(state){
                return BG.MenuController.makeMenu(state, {menu: "menuMovePlayer", display: "dialogue"});
            },
            movePlayer: function(player, tileTo){
                player.p.loc = tileTo.loc;
                if(!BG.Utility.isServer()){
                    player.moveTo(tileTo.loc);
                    BG.AudioController.playSound("step-on-tile");
                }
            },
            getPlayer: function(state, id){
                return state.turnOrder.find(player => { return player.p.playerId === id;});
            },
            //Reduce the active turns for each item effect by 1. If the item is at 0, remove the effect.
            reduceItemTurns: function(player){
                for(let i = player.p.itemEffects.length - 1; i >= 0; i--){
                    let effect = player.p.itemEffects[i];
                    effect.turns --;
                    if(!effect.turns){
                        player.p.itemEffects.splice(i, 1);
                        //Could do something else when certain items wear off (revert player colour, etc..)
                    }
                }
            },
            //Functions that happen when the current player ends the turn
            endTurn: function(state){
                if(!BG.Utility.isServer()){
                    if(BG.state.counter) BG.scene.remove(BG.state.counter);
                    
                }
                //If the player doesn't have any ready cash at the end of his turn, force him to sell shops or stocks.
                //Once he's above 0, run this endTurn function again and it'll go past this.
                if(state.turnOrder[0].p.money < 0){
                    return BG.MenuController.makeMenu(state, {menu: "forceSellAsset", display: "dialogue"});
                }

                state.turnOrder[0].p.lastTile = state.currentMovementPath[state.currentMovementPath.length - 2];
                state.turnOrder.push(state.turnOrder.shift());
                state.turn ++;
                state.round = Math.ceil(state.turn / state.turnOrder.length);
                BG.GameController.startTurn(state);
                return {func: "endTurn"};
            },
            //Functions that happen when the new current player starts his turn
            startTurn: function(state){
                state.currentMovementNum = false;
                state.currentBoardActions = [];
                state.forceSellAssets = false;
                let player = state.turnOrder[0];
                player.p.turn = true;
                player.p.invested = 0;
                player.p.upgraded = 0;
                player.p.auctioned = 0;
                player.p.tileTo = false;
                player.p.skipFinish = false;
                BG.GameController.reduceItemTurns(player);
                

                BG.preventMultipleInputs = true;
                if( !state.doIt){
                    let stock = 20;
                    BG.GameController.changePlayerStock(state.players[0], state.map.districts[0], stock, -state.map.districts[0].stockPrice * stock)
                    //BG.GameController.buyShop(state, player, BG.MapController.getTileAt(state, [6, 4]), 1);
                    //BG.GameController.buyShop(state, state.turnOrder[0], BG.MapController.getTileAt(state, [6, 4]), 0)
                    //BG.GameController.buyStock(state.turnOrder[0], 10, state.map.districts[0].stockPrice * 10, state.map.districts[0]);
                    if(!BG.Utility.isServer()){
                        setTimeout(function(){
                            BG.Q.inputs["down"] = true;
                        setTimeout(function(){
                            BG.Q.inputs["down"] = true;
                        setTimeout(function(){
                            BG.Q.inputs["confirm"] = true;
                            
                        setTimeout(function(){
                            BG.Q.inputs["confirm"] = true;
                        }, 100);
                        }, 100);
                        }, 100);
                        }, 100);
                    }
                    state.doIt = true;
                }
                
                BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], display: "menu"});
                if(!BG.Utility.isServer()){
                    BG.camera.moveTo({obj: player.sprite, zOffset: 4});
                    //BG.Q.stage(1).insert(new BG.TurnAnimation());
                    //BG.inputs["confirm"] = false;
                }
            },
            gameOver: function(state){
                //Once the game is over, show the final stats.
            },
            buyShop: function(state, player, shop, couponPercentage){
                let couponValue = ~~(shop.value * couponPercentage);
                let cost = shop.value - couponValue;
                BG.GameController.changePlayerMoney(player, -cost);
                BG.GameController.changePlayerNetValue(player, couponValue);
                shop.ownedBy = player;
                BG.GameController.adjustShopValues(state, shop);
                player.p.shops.push(shop);//This needs to be reversable
                if(!BG.Utility.isServer()){
                    shop.sprite.updateTile({type: "purchased", player: player});
                    BG.GameController.tileDetails.displayShop(shop);
                    BG.AudioController.playSound("purchase-item");
                }
            },
            buyOutShop: function(state, player, shop){
                BG.GameController.changePlayerMoney(shop.ownedBy, shop.value * 3);
                BG.GameController.changePlayerNetValue(shop.ownedBy, shop.value * 3);
                BG.GameController.changePlayerMoney(player, -shop.value * 5);
                BG.GameController.changePlayerNetValue(player, -shop.value * 4);
                if(!BG.Utility.isServer()){
                    shop.sprite.updateTile({type: "boughtOut", player: player, from: shop.ownedBy});
                    BG.AudioController.playSound("purchase-item");
                }
                shop.ownedBy.p.shops.splice(shop.ownedBy.p.shops.indexOf(shop), 1);
                shop.ownedBy = player;
                player.p.shops.push(shop);//This needs to be reversable
                BG.GameController.adjustShopValues(state, shop);
                BG.GameController.adjustShopValues(state, shop);
            },
            sellShop: function(state, shop, price, sellTo){
                BG.GameController.changePlayerMoney(shop.ownedBy, price);
                BG.GameController.changePlayerNetValue(shop.ownedBy, -shop.value + price);
                BG.GameController.adjustShopValues(state, shop);
                shop.ownedBy.p.shops.splice(shop.ownedBy.p.shops.indexOf(shop), 1);

                shop.ownedBy = sellTo;
                if(shop.ownedBy){
                    BG.GameController.changePlayerMoney(shop.ownedBy, -price);
                    BG.GameController.changePlayerNetValue(shop.ownedBy, -price + shop.value);
                    BG.GameController.adjustShopValues(state, shop);

                } else {
                    shop.cost = BG.MapController.generateShopCost(shop.initialValue, shop.rank, shop.investedCapital, 1);
                    shop.maxCapital = BG.MapController.generateShopMaxCapital(shop.initialValue, shop.rank, shop.investedCapital);
                    if(!BG.Utility.isServer()){
                        shop.sprite.updateTile({type: "sold", player: sellTo});
                    }
                }
                if(!BG.Utility.isServer()){
                    //BG.AudioController.playSound("purchase-item");
                }
            },
            //Changes the value of shops in the district based on the number that the player owns.
            //This is done when buying a shop.
            adjustShopValues: function(state, curShop){
                let shopsOwned = BG.MapController.getShopsOwnedInDistrict(state, curShop);
                if(shopsOwned.length > 1){
                    shopsOwned.forEach((shop) => {
                        BG.GameController.updateShopValues(state, shop);
                    });
                }
            },
            //Updates the shop to the current values.
            updateShopValues: function(state, shop){
                let shopsOwned = shop.ownedBy ? BG.MapController.getShopsOwnedInDistrict(state, shop).length : 1;
                shop.value = BG.MapController.generateShopValue(shop.initialValue, shop.rank, shop.investedCapital);
                shop.cost = BG.MapController.generateShopCost(shop.initialValue, shop.rank, shop.investedCapital, shopsOwned);
                shop.maxCapital = BG.MapController.generateShopMaxCapital(shop.initialValue, shop.rank, shop.investedCapital);
                //Update the district's stock price.
                BG.GameController.updateDistrictValues(state.map.districts[shop.district]);
                if(!BG.Utility.isServer()){
                    shop.sprite.updateTile({type: "value"});
                }
            },
            updateDistrictValues: function(district){
                let ranks = 0;
                let value = 0; 
                for(let j = 0; j < district.tiles.length; j++){
                    let tile = district.tiles[j];
                    ranks += tile.rank;
                    value += tile.value;
                }
                //The district rank is the average rank of all tiles in the district.
                district.rank = ~~(ranks / district.tiles.length);
                //For every 250 value, add 1G
                //For every 1 rank, add 5G
                district.stockPrice = Math.ceil(value / 250) + district.rank * 5;
                district.totalRanks = ranks;
                district.value = value;
            },
            investInShop: function(state, investAmount){
                if(!investAmount) return;
                state.menus[0].data.shop.maxCapital -= investAmount;
                state.menus[0].data.shop.investedCapital += investAmount;
                BG.GameController.updateShopValues(state, state.menus[0].data.shop);
                BG.GameController.changePlayerMoney(state.turnOrder[0], -investAmount);
                state.turnOrder[0].p.invested++;
            },
            upgradeShop: function(state, rankUp, cost){
                state.menus[0].data.shop.rank += rankUp;
                BG.GameController.changePlayerMoney(state.turnOrder[0], -cost);
                BG.GameController.updateShopValues(state, state.menus[0].data.shop);
                state.turnOrder[0].p.upgraded++;
            },
            //Processes the input on the server
            processInputs: function(state, inputs){
                if(!state) return;
                switch(state.menus[0].data.func){
                    case "navigateMenu":
                        return BG.MenuController.processMenuInput(state, inputs);
                    case "rollDie": 
                        return BG.MenuController.processRollDieInput(state, inputs);
                    case "playerMovement":
                        return BG.GameController.playerMovement(state, inputs, state.turnOrder[0].p.playerId);
                    case "moveShopSelector":
                        return BG.MenuController.processShopSelectorInput(state, inputs);
                    case "controlNumberCycler":
                        return BG.MenuController.processNumberCyclerInput(state, inputs);
                    case "confirmer":
                        return BG.MenuController.processConfirmerInput(state, inputs);
                }
            },
            getNumberOfStocks: function(player){
                return player.p.stocks.reduce((a, i) => a + i, 0);
            },
            addToDeal: function(state, itemProps){
                state.currentDeal[state.currentDeal.currentSelection].push(itemProps);
                let name = state.currentDeal.currentSelection === "requested" ? "dealListRequested" : "dealListTrade";
                let dealMenu = state.menus.find((menu) => {return menu.name === name;});
                dealMenu.itemGrid.push([[itemProps.item, "selectItem"]]);
                state.currentDeal[state.currentDeal.currentSelection + "G"] += itemProps.g;
                return {func: "addToDeal", props:itemProps};
            },
            
            createObject: function(type, position, props){
                return new BG.Objects[type](position, props);
            }
        };
        BG.Objects = {
            Player: function(position, props){
                if(!BG.Utility.isServer()){ 
                    //this.sprite = BG.ObjectData["player.gltf"].scene.children[0].clone();
                    this.sprite = BG.ObjectData["player.gltf"].scene;
                    this.sprite.position.x = position.x;
                    this.sprite.position.y = position.y;
                    this.sprite.position.z = position.z;
                    this.sprite.directionArrows = [];
                }
                this.p = props;
                //Shows which way the player can move from a tile (Client only).
                this.showMovementDirections = function(){
                    this.p.allowMovement = true;
                    
                    let lastTile = BG.state.currentMovementPath[BG.state.currentMovementPath.length - 2];
                    let tileOn = BG.MapController.getTileAt(BG.state, this.p.loc);
                    let dirs = tileOn.dirs ? tileOn.dirs.slice() : Object.keys(tileOn.dir);
                    //Force the player to continue along the path that they were on from last turn.
                    if(BG.state.currentMovementPath.length <= 1) {
                        lastTile = this.p.lastTile;
                        for(let i = dirs.length - 1; i >= 0; i--){
                            if(tileOn.dir[dirs[i]] === lastTile){
                                dirs.splice(i, 1);
                            }
                        };
                    } else {
                        //Check all potential tiles and make sure that if any of them are one-way, don't allow this tile to go there.
                        for(let i = dirs.length -1; i >= 0; i--){
                            let dir = dirs[i];
                            let tile = tileOn.dir[dir];
                            if(tile && (!lastTile || !BG.Utility.locsMatch(lastTile.loc, tile.loc))){
                                let toDir = BG.Utility.convertCoordToDir(BG.Utility.compareLocsForDirection(tile.loc, tileOn.loc));
                                if(tile.dirs && tile.dirs.includes(toDir)){
                                    dirs.splice(i, 1);
                                }
                            }
                        }
                        //Allow going back if it's the last tile
                        if(tileOn.dirs){
                            if(lastTile){
                                let allowDir = BG.Utility.convertCoordToDir(BG.Utility.compareLocsForDirection(tileOn.loc, lastTile.loc));
                                dirs.push(allowDir);
                            }
                        }
                    }
                    for(let i = 0; i < dirs.length; i++){
                        let arrow = BG.GameController.createObject("DirectionArrow", this.sprite.position, {state: BG.state, dir: dirs[i]});
                        BG.scene.add(arrow);
                        this.sprite.directionArrows.push(arrow);
                    }
                    
                };
                //Moves the player to a certain location.
                this.moveTo = function(loc){
                    let pos = BG.Utility.getXZ(loc);
                    this.sprite.position.x = pos.x + BG.c.tileW;
                    this.sprite.position.z = pos.z + BG.c.tileH;
                    BG.camera.moveTo({obj: this.sprite, zOffset: 4});
                    this.sprite.directionArrows.forEach((arrow) => arrow.remove());
                    this.sprite.directionArrows = [];
                    if(!this.p.finish){
                        this.showMovementDirections();
                    }
                };
                this.hasItem = function(itemName){
                    return this.p.items.find((itm) => {return itm === itemName;});
                };
            },
            DirectionArrow: function(position, props){
                let object = BG.ObjectData["direction-arrow.obj"].clone();
                object.position.x = position.x;
                object.position.y = position.y + 2;
                object.position.z = position.z;
                switch(props.dir){
                    case "up":
                        object.position.z -= 0.25;
                        object.rotation.y = Math.PI;
                        break;
                    case "right":
                        object.position.z += 0.5;
                        object.position.x += 0.75;
                        object.rotation.y = Math.PI * 0.5;
                        break;
                    case "down":
                        object.position.z += 1.25;
                        break;
                    case "left":
                        object.position.z += 0.5;
                        object.position.x -= 0.75;
                        object.rotation.y = Math.PI * 1.5;
                        break;
                }
                object.remove = function(){
                    BG.scene.remove(this);
                };
                return object;
            },
            //Displays the current roll and counts down or up based on if the player moved forward or backward.
            MoveCounter: function(position, props){
                let object = BG.DisplayController.createText({
                    color: 0x000000,
                    message: "" + props.roll, 
                    drawFrom: "middle",
                    size: 1,
                    position: {
                        x: position.x,
                        y: position.y + 3,
                        z: position.z
                    }
                });
                object.updateRoll = function(position, roll, finish){
                    if(!finish){
                        this.visible = true;
                        this.position.set(position.x, position.y + 3, position.z);
                        this.geometry = BG.DisplayController.generateTextGeometry({message: "" + roll, size: 1, drawFrom: "middle"});
                    } else {
                        this.visible = false;
                    }
                };
                return object;
            },
            Die: function(position, props){
                function initialize(pos, p){
                    let visual = BG.ObjectData["die.obj"].clone();
                    let obj = new Physijs.BoxMesh(
                        visual.children[0].geometry,
                        visual.children[0].material
                    );
                    obj.position.set(pos.x, pos.y, pos.z);
                    obj.p = p;
                    return obj;
                };
                let object = initialize(position, props);
                //Shuffle the die
                object.animate = function(){
                    
                };
                //Throw the die
                object.roll = function(num){
                    let rollsPhysics = {
                        1: [
                            [0.09308455553947596, 0.039127131442402076, 0.025334880255568536],
                            [0.043814017026984196, 0.057013101212549544, 0.03949256561541477],
                            [0.04128835460619238, 0.030169001324348233, 0.0879609080801282]
                        ],
                        2: [
                            [0.06079496819689227, 0.08587294537350432, 0.03242592902200736],
                            [0.021426631894882142, 0.08602279104036434, 0.0482834049250835],
                            [0.08690277427310537, 0.04426811639491186, 0.08961960423154858]
                        ],
                        3: [
                            [0.07681349373802812, 0.041178994488635226, 0.00949560056909784],
                            [0.06414543610242884, 0.05940693124196741, 0.02383788829407596],
                            [0.06604212359189054, 0.04053697655527773, 0.029725450408243016]
                        ],
                        4: [
                            [0.0892888826226536, 0.04155870096641372, 0.0050714553356242306],
                            [0.085532533703079, 0.023707228088409926, 0.06849390608804565],
                            [0.04623770158622402, 0.06561972514753216, 0.0424069373485477]
                        ],
                        5: [
                            [0.0025440679086278896, 0.05390833510660427, 0.05293093971023266],
                            [0.006321399375469694, 0.04821195204739805, 0.05156987827613611],
                            [0.005818885108297289, 0.06386366077875887, 0.05177123737819047]
                        ],
                        6: [
                            [0.032985061885791624, 0.06754718678958953, 0.026898750489373936],
                            [0.03352264924810844, 0.09858700314992486, 0.049112568238820466],
                            [0.0462565294078507, 0.03557387884596559, 0.06719235784697022]
                        ]
                    };
                    
                    
                    let force = new THREE.Vector3(0, 7, -1);
                    /*
                    let offsetX = Math.random() / 10;
                    let offsetY = Math.random() / 10;
                    let offsetZ = Math.random() / 10;
                    console.log("[" + offsetX + ", " + offsetY + ", " + offsetZ + "]")
                    let offsets = [offsetX, offsetY, offsetZ];*/
                    let offsets = rollsPhysics[num][~~Math.random() * rollsPhysics[num].length];
                    let offset = new THREE.Vector3(offsets[0], offsets[1], offsets[2]);
                    this.applyImpulse(force, offset);
                    function checkForStopped(){
                        var epsilon = 0.0001; // or any small enough value for your purposes
                        if ( object.getLinearVelocity().lengthSq() < epsilon &&
                            object.getAngularVelocity().lengthSq() < epsilon ) {
                            BG.state.diceFinished++;
                            if(BG.state.diceFinished === BG.state.rollsNums.length){
                                BG.state.turnOrder[0].showMovementDirections();
                                BG.state.disableInputs = false;
                                BG.scene.removeEventListener('update', checkForStopped);  
                            }
                        }
                    }
                    //Figure out if the die has stopped (it will surely take longer than 200ms)
                    //This is check for this frame (when the velocity is still 0), which is why it needed to be offset.
                    setTimeout(function(){
                        BG.scene.addEventListener('update', checkForStopped);  
                    }, 200);
                };
                //Gets rid of this die.
                object.remove = function(){
                    BG.scene.remove(this);
                };
                return object;
            },
            Tile: function(position, props){
                let object = new BG.THREE.Object3D();
                object.p = props;
                object.pos = position;
                //When a tile is hovered, change the border colour. Otherwise set to default.
                object.updateHovering = function(hover){
                    if(this.hovering !== hover){
                        if(hover){
                            BG.Utility.updateMaterial(this.tileStructure, "Selected", new THREE.MeshStandardMaterial( { color: "red"} ));
                        } else {
                            BG.Utility.updateMaterial(this.tileStructure, "Selected", new THREE.MeshStandardMaterial( { color: "white"} ));
                        }
                    }
                    this.hovering =  hover;
                };
                //When a tile is created.
                object.initialize = function(){
                    let type = this.p.type;
                    switch(type){
                        case "shop":
                            this.tileStructure = BG.ObjectData["tile-shop.obj"].clone();
                            this.p.ownedBy = false;
                            BG.Utility.updateMaterial(this.tileStructure, "Selected", new THREE.MeshStandardMaterial( { color: "white"} ));
                            break;
                        default:
                            this.tileStructure = BG.ObjectData["tile-special.obj"].clone();
                            break;
                    }
                    BG.Utility.cloneMaterial(this.tileStructure, "Main");
                    BG.Utility.cloneMaterial(this.tileStructure, "Selected");
                    this.tileStructure.position.x = position.x;
                    this.tileStructure.position.y = position.y;
                    this.tileStructure.position.z = position.z;
                    this.tileStructure.castShadow = true;
                    this.tileStructure.reveiveShadow = true;
                };
                object.addObject = function(type, props){
                    switch(type){
                        case "signpost":
                            var signpost = BG.ObjectData["signpost.obj"].clone();
                            signpost.position.y = 0.1;
                            signpost.position.z -= BG.c.tileH / 2;
                            signpost.name = "signpost"; 
                            this.tileStructure.add(signpost);
                            this.valueText = BG.DisplayController.createText({
                                color: 0x000000,
                                message: "" + props.value, 
                                drawFrom: "middle",
                                size: 0.3,
                                position: {
                                    x: 0, 
                                    y: 0.6,
                                    z: 0.08
                                }
                            });
                            this.valueText.rotation.set( Math.PI / - 5, 0, 0 );
                            signpost.add( this.valueText );
                            break;
                        case "shop-building":
                            var building = BG.ObjectData["shop-" + props.rank + ".obj"].clone();
                            building.position.y = 0.1;
                            building.position.z -= BG.c.tileH / 4;
                            building.name = "shop-building";
                            this.tileStructure.add(building);
                            
                            this.valueText = BG.DisplayController.createText({
                                color: 0xFFFFFF,
                                message: "" + props.value, 
                                drawFrom: "middle",
                                size: 0.3,
                                position: {
                                    x: this.pos.x, 
                                    y: this.pos.y + 0.11,
                                    z: this.pos.z + BG.c.tileH - 0.17
                                }
                            });
                            this.add(this.valueText);
                            break;
                    }
                };
                //Should overwrite the previous props and show the current tile state.
                object.displayTile = function(object){
                    let type = object.p.type;
                    switch(type){
                        case "shop":
                            this.addObject("signpost", {value: this.p.value});
                            //TODO: if the player already owns a shop when the game start (maybe this won't happen).
                            
                            break;
                        //Vendor gets an image of the product.
                        case "vendor":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top",
                                BG.TextureData[props.purchase[0].toLowerCase() + ".jpg"], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                    
                            object.tileStructure.add( BG.DisplayController.createText({
                                color: 0xFFFFFF,
                                message: "Vendor", 
                                drawFrom: "middle",
                                size: 0.25,
                                position: {
                                    x: 0, 
                                    y: 0.11,
                                    z: BG.c.tileH / 1.2
                                }
                            }) );
                            break;
                        case "main":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData[object.p.image], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            object.tileStructure.add( BG.DisplayController.createText({
                                color: 0xFFFFFF,
                                message: "Main Tile", 
                                drawFrom: "middle",
                                size: 0.25,
                                position: {
                                    x: 0, 
                                    y: 0.11,
                                    z: BG.c.tileH / 1.2
                                }
                            }) );
                            break;
                        case "itemshop":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData["item-shop.png"], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            object.tileStructure.add( BG.DisplayController.createText({
                                color: 0xFFFFFF,
                                message: "Item Shop", 
                                drawFrom: "middle",
                                size: 0.25,
                                position: {
                                    x: 0, 
                                    y: 0.11,
                                    z: BG.c.tileH / 1.2
                                }
                            }) );
                            break;
                        case "warp":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData[object.p.image], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            break;
                        case "toll":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData[object.p.image], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            break;
                        case "roll-again":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData[object.p.image], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            break;
                        case "bingo":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData["bingo.jpg"], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            break;
                        case "stockbroker":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData["stockbroker.jpg"], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            break;
                        case "interest":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData["interest.jpg"], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            
                            break;
                        case "arcade":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData["arcade.png"], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            
                            break;
                    }
                    if(object.p.dirs){
                        object.p.dirs.forEach((dir) => {
                            var geometry = new THREE.PlaneGeometry(3, 3);
                            var material = new THREE.MeshBasicMaterial( {map: BG.TextureData["arrow.png"], transparent: true, renderOrder: 1} );
                            var filterPlane = new THREE.Mesh( geometry, material );
                            filterPlane.rotation.x = Math.PI * 1.5;
                            filterPlane.position.y = 0.11;
                            switch(dir){
                                case "up":
                                    filterPlane.rotation.z = 0;
                                    break;
                                case "right":
                                    filterPlane.rotation.z = Math.PI * 1.5;
                                    break;
                                case "down":
                                    filterPlane.rotation.z = Math.PI * 1;

                                    break;
                                case "left":
                                    filterPlane.rotation.z = Math.PI * 0.5;
                                    break;
                            }
                            object.tileStructure.add(filterPlane);
                        });
                    }
                };
                object.updateTile = function(props){
                    switch(props.type){
                        case "purchased":
                            this.addObject("shop-building", {value: this.p.cost, rank: this.p.rank});
                            this.tileStructure.remove(this.tileStructure.getObjectByName("signpost"));
                            this.color = props.player.p.color;
                            BG.Utility.updateMaterial(this.tileStructure, "Main", new THREE.MeshStandardMaterial( { color: this.color} ));
                            break;
                        case "sold":
                            this.remove(this.valueText);
                            this.addObject("signpost", {value: this.p.value});
                            this.tileStructure.remove(this.tileStructure.getObjectByName("shop-building"));
                            this.color = "teal";
                            BG.Utility.updateMaterial(this.tileStructure, "Main", new THREE.MeshStandardMaterial( { color: this.color} ));
                            break;
                        case "boughtOut":
                            this.color = props.player.p.color;
                            BG.Utility.updateMaterial(this.tileStructure, "Main", new THREE.MeshStandardMaterial( { color: this.color} ));
                            break;
                        case "value":
                            this.valueText.geometry = BG.DisplayController.generateTextGeometry({message: "" + this.p.cost, size: 0.3, drawFrom: "middle"});
                            break;
                    }
                };
                object.initialize();
                object.displayTile(object);
                object.add(object.tileStructure);
                
                return object;
            },
            ShopSelector: function(position, props){
                let object = new BG.THREE.Object3D();
                object.p = props;
                object.position = position;
                object.initialize = function(p){
                    let pos = BG.Utility.getXZ(p.pos || p.state.turnOrder[0].p.loc);
                    this.position.x = pos.x + BG.c.tileW;
                    this.position.y = 2;
                    this.position.z = pos.z + BG.c.tileH;
                    this.acceptedInput = false;
                    this.animating = false;
                    this.timerSet = false;
                    this.atTile = true;
                    object.addEventListener("moved", object.moved);
                };
                object.display = function(){
                    this.visual = BG.ObjectData["selector.obj"].clone();
                    this.visual.position.x = 0;
                    this.visual.position.y = 0;
                    this.visual.position.z = 0;
                    //Todo: change the actual shopSelector in some way when hovering? Animation???
                    //Maybe the animation plays faster when moving, and slows when stationary?
                    this.visual.updateHovered = function(hovering){
                        
                    };
                    
                    object.add(this.visual);
                    BG.camera.moveTo({obj: this, zOffset: 4});
                    
                };
                //TODO: set up dx,dy, etc
                object.moveToTile = function(){
                    let tile = this.shopOn;
                    if(tile){
                        if(!this.animating){
                            let pos = BG.Utility.getXZ(tile.loc);
                            let toX = pos.x + BG.c.tileW;
                            let toY = pos.z + BG.c.tileH;

                            this.p.dx = toX - this.position.x;
                            this.p.dy = toY - this.position.z;
                            this.p.destX = toX;
                            this.p.destY = toY;
                            this.animating = true;
                            this.p.dt = new Date().getTime();
                            this.p.stepDelay = 0.08;
                            this.p.stepWait = this.p.stepDelay;
                        } else {
                            let now = new Date().getTime();
                            let dt = (now - this.p.dt) / 1000;
                            this.p.stepWait -= dt;
                            this.position.x += this.p.dx * dt / this.p.stepDelay;
                            this.position.z += this.p.dy * dt / this.p.stepDelay;
                            this.p.dt = now;
                            if(this.p.stepWait > 0) {return; }
                            this.position.x = this.p.destX;
                            this.position.z = this.p.destY;
                            this.animating = false;
                            this.atTile = true;
                        }
                    }
                };
                object.dehoverShop = function(){
                    this.p.hovering = false;
                    if(this.visual) this.visual.updateHovered(this.p.hovering);
                };
                object.hoverShop = function(){
                    this.p.hovering = true;
                    if(this.visual){
                        this.visual.updateHovered(this.p.hovering);
                        BG.AudioController.playSound("hover-shop");
                    }
                };
                object.showShopDetails = function(){
                    if(!BG.Utility.isServer()){
                        BG.GameController.tileDetails.displayShop(BG.MapController.getTileAt(this.p.state, BG.Utility.getLoc(this.position.x, this.position.z)));
                    }
                };
                object.moved = function(event){
                    let inputs = event.inputs;
                    this.changedShop = false;
                    let lastShopOn = this.shopOn;
                    this.p.lastX = this.position.x;
                    this.p.lastZ = this.position.z;
                    let coord = [0, 0];
                    let keys = Object.keys(inputs);
                    keys.forEach((key) => {
                        let newCoord = BG.Utility.convertDirToCoord(key);
                        if(newCoord){
                            if(newCoord[0]) coord[0] = newCoord[0];
                            if(newCoord[1]) coord[1] = newCoord[1];
                        }
                    });
                    if(coord[0] || coord[1]){
                        let speed = 0.09;
                        let x = this.position.x + coord[0] * speed;
                        let z = this.position.z + coord[1] * speed;
                        this.moveTo(x, z);
                        this.acceptedInput = true;
                        this.atTile = false;
                        this.dehoverShop();
                        
                        let loc = BG.Utility.getLoc(this.position.x, this.position.z);
                        if(BG.Utility.locInBounds(loc, this.p.state.map.maxX, this.p.state.map.maxY)){
                            this.shopOn = BG.MapController.getTileAt(this.p.state, loc);
                            if(!BG.Utility.isServer()){
                                BG.GameController.tileDetails.displayShop(this.shopOn);
                            }
                        } else {
                            this.shopOn = false;
                            if(!BG.Utility.isServer()){
                                BG.GameController.tileDetails.displayShop(this.shopOn);
                            }
                        }
                    }
                    this.checkSeekTile();
                    if(this.shopOn !== lastShopOn){
                        this.changedShop = true;
                    }
                };
                object.moveTo = function(x, z, hover){
                    this.position.x = x;
                    this.position.z = z;
                    if(hover){
                        if(hover === "details"){
                            this.showShopDetails();
                        } else {
                            this.hoverShop();
                        }
                    } else {
                        this.dehoverShop();
                    }
                    
                    if(!BG.Utility.isServer()){
                        BG.camera.centerOn({obj: this, zOffset: 4});
                    }
                    
                    /*
                    * Uncomment to create another selector at y = 0
                    if(!BG.Utility.isServer()){
                        if(this.lastObject){
                            BG.scene.remove(this.lastObject);
                        }
                        let object = BG.ObjectData["selector.obj"].clone();
                        object.position.x = this.position.x;
                        object.position.y = 0;
                        object.position.z = this.position.z;
                        BG.scene.add(object);
                        this.lastObject = object;
                    }*/
                };
                object.checkSeekTile = function(){
                    if(this.acceptedInput && this.animating){
                        this.animating = false;
                        this.atTile = false;
                    }
                    if(!this.acceptedInput && !this.atTile){
                        this.moveToTile();
                    }
                    this.acceptedInput = false;
                };
                object.remove = function(){
                    BG.GameController.tileDetails.displayShop();
                    BG.camera.moveTo({obj: BG.state.turnOrder[0].sprite, zOffset: 4});
                    BG.scene.remove(this);
                };
                object.initialize(object.p);
                if(!BG.Utility.isServer()){
                    object.display();
                }
                return object;
            }
        };
        
        return BG;
    };
    return BoardGame;
};

if(typeof exports === 'undefined') {
  boardGameCore(this, "BoardGame");
} else {
  var BoardGame = boardGameCore(module,"exports");
}