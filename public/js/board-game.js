var boardGameCore = function(exportTarget, key){
    var BoardGame = exportTarget[key] = function(){
        var BG = {};
        BG.dataFiles = {};
        BG.setUpPlayers = function(data, mainTile){
            let players = [];
            for(let i = 0; i < data.users.length; i++){
                let player = {
                    playerId: data.users[i].id,
                    name: "Player " + data.users[i].id,
                    loc: [6, 6],
                    //loc: [mainTile.loc[0], mainTile.loc[1]],
                    money: data.mapData.modes[data.settings.mode].startMoney,
                    netValue: data.mapData.modes[data.settings.mode].startMoney,
                    color: data.users[i].color,
                    shops: [],
                    items: [{name: "Warp"}],
                    itemEffects: [],
                    setPieces: {
                        Peanut: 1
                    },
                    stocks: [],
                    stockControl: 0,
                    investments: [],
                    rank: 1,
                    maxItems: 1
                    //Etc... Add more as I think of more. TODO
                };
                for(let j = 0; j < data.mapData.districts.length; j++){
                    player.stocks.push({
                        num: 0
                    });
                }
                players.push(player);
            }
            return players;
        };
        BG.setUpGameState = function(data){
            let state = {};
            state.map = BG.MapController.generateMap(data.mapData, data.settings);
            state.players = BG.setUpPlayers(data, state.map.mainTile);
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
                if(coord[0] === 2) return "right";
                if(coord[0] === -2) return "left";
                if(coord[1] === 2) return "down";
                if(coord[1] === -2) return "up";
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
                let dir;
                if(difX !== 0){
                    if(difX < 0) dir = [2, 0];
                    else dir = [-2, 0];
                } else {
                    if(difY < 0) dir = [0, 2];
                    else dir = [0, -2];
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
                return !BG.Utility.isServer() && BG.user.id === BG.state.turnOrder[0].playerId;
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
                            console.log(obj.children[i].material[j].name)
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
            checkPassByTile: function(state, player){
                let tile = player.tileTo;
                switch(tile.type){
                    case "main":
                        //Skip the menu if the player has no sets that can be exchanged.
                        let sets = BG.GameController.getCompleteSets(state, player);
                        if(!sets.length){
                            return false;
                        }
                        let setOptions = sets.map((set, i) => {
                            return [set.name, "purchaseSet", [i]];
                        });
                        setOptions.push(["Nothing", "confirmFalse"]);
                        BG.MenuController.makeMenu(state, {
                            menu: "askExchangeSets",
                            options:setOptions, 
                            display: "dialogue"
                        });
                        return true;

                    case "vendor":
                        //Not enough money, so don't even ask.
                        if(player.money < tile.itemCost){
                            return false;
                        }
                        BG.MenuController.makeMenu(state, {
                            menu: "askVendorBuyItem",
                            text: BG.c.vendorText[tile.itemName], 
                            display: "dialogue"
                        });
                        return true;
                    case "itemshop":
                        state.tileTo = tile;
                        BG.MenuController.makeMenu(state, {menu: "askIfWantToBuyItem", display: "dialogue"});
                        return true;
                }
            },
            //Run when the player presses a directional input while moving their dice roll.
            processPlayerMovement: function(state, inputs, id){
                let invalidForwardLoc;
                let player = BG.GameController.getPlayer(state, id);
                let tileOn = BG.MapController.getTileAt(state, player.loc);
                let input = BG.Utility.getSingleInput(inputs);
                let tileTo = tileOn.dir[input];
                //If the input wasn't a valid directional input, don't do anything.
                if(!tileTo) return false;
                player.tileTo = tileTo;
                let props = {
                    func: "playerMovement",
                    loc: tileTo.loc,
                    passBy: false
                };

                //If the tile is not equal to the lastTile (the tile that the player landed on from last turn)
                if(state.currentMovementPath.length > 1 || tileTo !== player.lastTile){

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

                    props.finish = state.currentMovementPath.length === state.currentMovementNum + 1;
                    player.finish = props.finish;
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
                    grid: BG.Utility.createArray(false, mapData.map.w, mapData.map.h),
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
                            break;
                        case "vendor":
                            tile.itemName = data.item;
                            tile.itemCost = mapData.setPieces[tile.itemName] * data.price;
                            break;
                        case "itemshop":
                            tile.items = data.items.map((item) =>{
                                return Object.assign(BG.c.items[item[0]], {cost: item[1], id: item[0]});
                            });
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
                        for(let j = 0; j < district.tiles.length; j++){
                            let tile = district.tiles[j];
                            district.totalRanks += tile.rank;
                            district.value += tile.value;
                        }
                        district.rank = ~~(district.totalRanks / district.tiles.length);
                        //For every 250 value, the stock price is 1G
                        //For every 1 rank, add 5G
                        district.stockPrice = Math.ceil(district.value / 250) + district.rank * 5;
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
                //BG.MenuController.removeMenus(state);
                //These are all custom menus,so do all of the "makeMenu" code here.
                switch(menu){
                    case "investMenu":
                        state.menus[0].data.shop = props.shop;
                        props.menu = menu;
                        BG.MenuController.initializeNumberCycler(state, menu, props);
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("investMenu", 2, props);
                        }

                        break;
                    case "upgradeMenu":
                        state.menus[0].data.shop = props.shop;
                        BG.MenuController.initializeConfirmer(state, menu);
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("upgradeMenu", 2, props);
                        }

                        break;
                    case "auctionMenu":
                        state.menus[0].data.shop = props.shop;
                        BG.MenuController.makeMenu(state, {menu: "auctionMenu", display: "dialogue"});
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("auctionMenu", 3, props);
                        }
                        break;
                    case "buyStockMenu":
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("districtMenu", 3, props);
                        }
                        BG.MenuController.makeMenu(state, {...{menu: "districtMenu", display: "dialogue"}, ...props});
                        break;
                    case "buyStockCyclerMenu":
                        BG.MenuController.initializeNumberCycler(state, menu, props);
                        state.menus[0].data.district = state.map.districts[props.district];
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("buyStockCyclerMenu", 2, props);
                        }
                        break;
                    case "sellStockMenu":
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("districtMenu", 3, props);
                        }
                        BG.MenuController.makeMenu(state, {...{menu: "districtMenu", display: "dialogue"}, ...props});
                        break;
                    case "sellStockCyclerMenu":
                        BG.MenuController.initializeNumberCycler(state, menu, props);
                        state.menus[0].data.district = state.map.districts[props.district];
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("sellStockCyclerMenu", 2, props);
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
                    case "mapMenu":
                        BG.MenuController.initializeConfirmer(state, menu);
                        if(!BG.Utility.isServer()){
                            BG.Q.stageScene("mapMenu", 2);
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
                let data = {...BG.MenuController.inputStates[menu], ...props};
                BG.MenuController.initializeMenu(state, data, props);
                if(data.preDisplay) data.preDisplay(state);
                if(!BG.Utility.isServer() && display){
                    BG.Q.stageScene(display, 2);
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
                                BG.MenuController.makeMenu(state, {menu: "shopsMenu", selected: backOpt, display: "menu"})
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
                                BG.MenuController.makeMenu(state, {menu: "viewMenu", selected: backOpt, display: "menu"})
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
                    BG.Q.clearStage(2);
                    BG.preventMultipleInputs = false;
                    BG.scene.add(state.shopSelector);
                }
                return {func: "makeMoveShopSelector", confirmType: confirmType, backFunc: backFunc, startPos: startPos};
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
                        let playerMoney = state.turnOrder[0].money;
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
                        let cost = shop.value - ((player.rank - 1) * shop.value / 10);
                        let playerMoney = player.money;
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
                        console.log(shop)
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
                            BG.MenuController.makeMenu(state, {menu: "shopsMenu", selected: [0, 2], display: "menu"})
                        ];
                    }
                },
                askExchangeSets: {
                    func: "navigateMenu",
                    text: ["Looks like you've got a set! \nWhich one would you like to exchange?"],
                    onHoverOption: (option) => {
                        option.stage.setsMenu.hoverSet(option);
                    },
                    onLoadMenu: (stage) => {
                        stage.setsMenu = stage.insert(new BG.Q.SetsMenu({player: BG.state.turnOrder[0]}));
                    },
                    purchaseSet: (state, num) => {
                        BG.GameController.purchaseSet(state, num, state.turnOrder[0].playerId);
                        let props = [
                            {func: "purchaseSet", num: num},
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
                        BG.GameController.purchaseSetItem(state, state.turnOrder[0].loc, state.turnOrder[0].playerId);
                        let props = [
                            {func: "purchaseSetItem", loc: state.turnOrder[0].loc},
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
                        if(player.money >= item.cost){
                            BG.GameController.purchaseItem(state, item, player.playerId);
                            let props = [
                                {func: "purchaseItem", item: {id: item.id, cost: item.cost}}, 
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
                            let dieMax = 8;
                            let roll = 0;
                            let rollsNums = [];
                            for(let i = 0; i < rolls; i++){
                                let num = ~~(state.random() * (dieMax + 1 - dieMin)) + dieMin;
                                roll += num;
                                rollsNums.push(num);
                            }
                            state.currentMovementNum = roll;
                            state.menus[0].data = {func: "rollDie", roll: roll, self: true, rollsNums: rollsNums};
                        }
                        return state.menus[0].data;
                    },
                    showShopsMenu: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "shopsMenu", selected: [0, 0], sound: "change-menu", display: "menu"});
                    },
                    showStocksMenu: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "stocksMenu", selected: [0, 0], sound: "change-menu", display: "menu"});
                    },
                    showItemsMenu: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "itemsMenu", selected: [0, 0], sound: "change-menu", display: "menu"});
                    },
                    showDealMenu: (state) => {
                        return BG.MenuController.makeMenu(state, {
                            menu: "selectAPlayerMenu",
                            next: "setUpDeal",
                            prev: ["playerTurnMenu", [0, 4]], 
                            display: "dialogue"
                        });
                    },
                    showViewMenu: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "viewMenu", selected: [0, 0], sound: "change-menu", display: "menu"});
                    }
                },
                shopsMenu: {
                    func: "navigateMenu",
                    preDisplay: (state) => {
                        let player = state.turnOrder[0];
                        //TODO: check against the allowed for this turn (deafult is one time)
                        if(player.auctioned > 0){
                            state.menus[0].itemGrid[2][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[2][0][1] = "cursorSelectShop";
                        }
                        if(player.upgraded > 0){
                            state.menus[0].itemGrid[1][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[1][0][1] = "cursorSelectShop";
                        }
                        if(player.invested > 0){
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
                        /*if(player.soldStock > 0){
                            state.menus[0].itemGrid[0][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[0][0][1] = "showBuyStockMenu";
                        }
                        if(player.boughtStock > 0){
                            state.menus[0].itemGrid[1][0][1] = "invalidAction";
                        } else {
                            state.menus[0].itemGrid[1][0][1] = "showSellStockMenu";
                        }*/
                    },
                    options:[
                        ["Buy Stock", "showBuyStockMenu"],
                        ["Sell Stock", "showSellStockMenu"],
                        ["Check Stock", "showCheckStockMenu"],
                        ["Back", "goBack"]
                    ],
                    showBuyStockMenu: (state, selected) => {
                        return BG.MenuController.makeCustomMenu(state, "buyStockMenu", {type: "buyStock", prev: ["stocksMenu", [0, 0]], selected: selected});
                    },
                    showSellStockMenu: (state, selected) => {
                        return BG.MenuController.makeCustomMenu(state, "sellStockMenu", {type: "sellStock", prev: ["stocksMenu", [0, 1]], selected: selected});
                    },
                    showCheckStockMenu: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "checkStockMenu", {type: "checkStock", prev: ["stocksMenu", [0, 2]]});
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
                        state.menus[0].itemGrid.push([["Back", "goBack"]]);
                        switch(state.menus[0].data.type){
                            case "buyStock":
                                state.menus[0].data.text = ["Select a district to buy stock in."];
                                break;
                            case "sellStock":
                                state.menus[0].data.text = ["Select the district you want to sell stock in."];
                                break;
                        }
                    },
                    options: [],
                    text: ["Placeholder (text should be set in preDisplay)."],
                    onHoverOption: (option, idx) => {
                        if(idx < BG.state.map.districts.length){
                            BG.state.mapMenu.pulseDistrictTiles(idx);
                        }
                    },
                    selectDistrict: (state, itemIdx) => {
                        switch(state.menus[0].data.type){
                            case "buyStock":
                                return [
                                    {func: "clearStage", num: 2},
                                    {func: "clearStage", num: 3},
                                    BG.MenuController.makeCustomMenu(state, "buyStockCyclerMenu", {cycler: 4, district: itemIdx})
                                ];
                            case "sellStock":
                                return [
                                    {func: "clearStage", num: 2},
                                    {func: "clearStage", num: 3},
                                    BG.MenuController.makeCustomMenu(state, "sellStockCyclerMenu", {cycler: 4, district: itemIdx})
                                ];
                        }
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
                },
                buyStockCyclerMenu: {
                    func: "controlNumberCycler",
                    confirm: (state) => {
                        let stockNumber = BG.MenuController.getValueFromNumberCycler(state);
                        let district = state.menus[0].data.district;
                        //If the invest amount is greater than allowed, set the amount to the allowed amount.
                        let stockCost = stockNumber * district.stockPrice;
                        let player = state.turnOrder[0];
                        let maxPurchasable = ~~(player.money / district.stockPrice);
                        if(stockNumber > district.stockAvailable || stockCost > player.money){
                            let newAmount = Math.min(district.stockAvailable, maxPurchasable);
                            return BG.MenuController.setNumberCyclerValue(state, newAmount);
                        }
                        else {
                            if(stockNumber === 0){
                                return BG.MenuController.inputStates.buyStockCyclerMenu.goBack(state);
                            } else {
                                BG.GameController.buyStock(player, stockNumber, stockCost, district);
                                return [
                                    {func: "finalizeBuyStock", num: stockNumber, cost: stockCost, district: state.menus[0].data.district.id, playerId: player.playerId},
                                    BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], sound: "purchase-item", display: "menu"})
                                ];
                            }
                        }
                    },  
                    goBack: (state) => {
                        return BG.MenuController.inputStates.stocksMenu.showBuyStockMenu(state, [0, state.menus[0].data.district.id]);
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
                        if(stockNumber > player.stocks[district.id].num){
                            let newAmount = player.stocks[district.id].num;
                            return BG.MenuController.setNumberCyclerValue(state, newAmount);
                        }
                        else {
                            if(stockNumber === 0){
                                return BG.MenuController.inputStates.sellStockCyclerMenu.goBack(state);
                            } else {
                                let response = [{func: "finalizeSellStock", num: stockNumber, cost: stockCost, district: state.menus[0].data.district.id, playerId: player.playerId}];
                                BG.GameController.sellStock(player, stockNumber, stockCost, district);
                                if(state.forceSellAssets){
                                    if(player.money >= 0){
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
                        return BG.MenuController.inputStates.stocksMenu.showSellStockMenu(state, [0, state.menus[0].data.district.id]);
                    }
                },
                checkStockMenu: {
                    func: "confirmer",
                    confirm: (state) => {
                        return BG.MenuController.inputStates.checkStockMenu.goBack(state);
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "stockMenu", selected: [0, 2], sound: "change-menu", display: "menu"});
                    }
                },
                itemsMenu: {
                    func: "navigateMenu",
                    preDisplay: (state) => {
                        state.turnOrder[0].items.forEach((item, i) => {
                            state.menus[0].itemGrid.push([[item.name, "useItem", [i]]]);
                        });
                        state.menus[0].itemGrid.push([["Back", "goBack"]]);
                    },
                    options: [],
                    useItem: (state, itemIdx) => {
                        return BG.GameController.useItem(state, itemIdx);
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 3], sound: "change-menu", display: "menu"});
                    }
                },
                viewMenu: {
                    func: "navigateMenu",
                    options:[
                        ["View Board", "viewBoard"],
                        ["View Map", "viewMap"],
                        ["View Sets", "viewSets"],
                        ["View Standings", "viewStandings"],
                        ["Back", "goBack"]
                    ],
                    viewBoard: (state) => {
                        let player = state.turnOrder[0];
                        return BG.MenuController.makeMoveShopSelector(state, "viewBoard", "toViewMenu", player.loc, "all");
                    },
                    viewMap: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "mapMenu");
                    },
                    viewSets: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "setsMenu");
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
                            if(player.playerId !== activePlayer.playerId){
                                state.menus[0].itemGrid.push([[player.name, "selectPlayer", [player.playerId]]]);
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
                                prev: ["playerTurnMenu", [0, 4]],
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
                                let id = state.currentDeal.currentSelection === "requested" ? state.currentDeal.dealWith : state.turnOrder[0].playerId;
                                let player = BG.GameController.getPlayer(state, id);

                                for(let i = 0; i < player.items.length; i++){
                                    state.menus[0].itemGrid.push([[player.items[i].name, "selectItem", [i]]]);
                                }
                                state.menus[0].itemGrid.push([["Back", "goBack"]]);

                                state.menus[0].data.text = ["Select an item to add to the deal."];
                                break;
                        }
                    },
                    options:[],
                    selectItem: (state, itemIdx) => {
                        let id = state.currentDeal.currentSelection === "requested" ? state.currentDeal.dealWith : state.turnOrder[0].playerId;
                        let player = BG.GameController.getPlayer(state, id);
                        let itemProps = {
                            type: "item",
                            item: player.items[itemIdx],
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
                        let id = state.currentDeal.currentSelection === "requested" ? state.currentDeal.dealWith : state.turnOrder[0].playerId;
                        let player = BG.GameController.getPlayer(state, id);

                        let keys = Object.keys(player.setPieces);
                        for(let i = 0; i < keys.length; i++){
                            state.menus[0].itemGrid.push([[keys[i], "selectPiece", [i]]]);
                        }
                        state.menus[0].itemGrid.push([["Back", "goBack"]]);
                    },
                    options:[],
                    selectPiece: (state, itemIdx) => {
                        let id = state.currentDeal.currentSelection === "requested" ? state.currentDeal.dealWith : state.turnOrder[0].playerId;
                        let player = BG.GameController.getPlayer(state, id);
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
                        return BG.MenuController.makeMenu(state, {menu: "viewMenu", selected: [0, 2], sound: "change-menu", display: "menu"})
                    }
                },
                mapMenu: {
                    "func": "confirmer",
                    confirm: (state) => {
                        return BG.MenuController.inputStates.mapMenu.goBack(state);
                    },
                    goBack: (state) => {
                        return BG.MenuController.makeMenu(state, {menu: "viewMenu", selected: [0, 1], sound: "change-menu", display: "menu"})
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
                        return BG.GameController.playerConfirmMove(state, state.turnOrder[0].playerId);
                    },
                    confirmFalse: (state) => {
                        let loc = BG.GameController.playerGoBackMove(state, state.turnOrder[0].playerId);
                        state.menus[0].data = {func: "playerMovement", loc: loc};
                        return {func: "playerGoBackMove", loc: loc};
                    }
                },
                askBuyShop: {
                    func: "navigateMenu",
                    text: ["Would you like to buy this shop?"],
                    preDisplay: (state) => {
                        //id 0 is for 25% off
                        let coupon = BG.GameController.playerHasItem(state, state.turnOrder[0], 0);
                        if(coupon.length){
                            state.menus[0].itemGrid.splice(1, 0, [["Yes (with 25% off coupon)", "confirmTrue", [0]]]);
                        }
                    },
                    options:[
                        ["Yes", "confirmTrue"],
                        ["No", "confirmFalse"]
                    ],
                    confirmTrue: (state, couponId) => {
                        let player = state.turnOrder[0];
                        let couponValue = 0;
                        let itemIdx = -1;
                        if(couponId >= 0){
                            itemIdx = player.items.indexOf(player.items.find((item) => {return item.id === couponId;}));
                            player.items.splice(itemIdx, 1);
                            couponValue = couponId === 0 ? 0.25 : 0;
                        }
                        let tileOn = BG.MapController.getTileAt(state, player.loc);
                        BG.GameController.buyShop(state, player, tileOn, couponValue);

                        BG.GameController.endTurn(state);
                        return {func: "buyShop", loc: player.loc, itemIdx: itemIdx, couponValue: couponValue};
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
                        let tileOn = BG.MapController.getTileAt(state, player.loc);
                        let ownedBy = tileOn.ownedBy;
                        BG.GameController.buyOutShop(state, player, tileOn);
                        BG.GameController.endTurn(state);
                        return [
                            {func: "buyOutShop", loc: player.loc},
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
                        if(player.shops.length === 0){
                            state.menus[0].itemGrid.splice(1, 1);
                        }
                        if(BG.GameController.getNumberOfStocks(player) === 0){
                            state.menus[0].itemGrid.splice(0, 1);
                        }
                        if(!state.menus[0].itemGrid.length){
                            state.menus[0].data.text = ["You don't have any more assets. \nYou lose!"];
                            state.menus[0].itemGrid.push([["Done", "loseGame"]]);
                        }
                    },
                    sellStock: (state) => {
                        return BG.MenuController.makeCustomMenu(state, "sellStockMenu", {type: "sellStock", prev: ["stocksMenu", [0, 1]]});
                    },
                    sellShop: (state) => {
                        return BG.MenuController.makeMoveShopSelector(state, "confirmSellShop", "forceSellAsset", state.turnOrder[0].loc);
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
                state.menus[0].currentItem = coord;
                if(state.menus[0].currentCont){
                    state.menus[0].currentCont.p.menuButtons[state.menus[0].currentItem[1]][state.menus[0].currentItem[0]].hover();
                    BG.AudioController.playSound("option-hover");
                }
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
                    state.menus[0].data = {func: "playerMovement"};
                    BG.GameController.allowPlayerMovement(state, state.currentMovementNum);
                    return [{func: "stopDice", rollsNums: state.menus[0].data.rollsNums}, {func: "allowPlayerMovement", currentMovementNum: state.currentMovementNum}];
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
            addBoardAction: function(state, tile, action, props){
                if(tile === "prev") tile = state.currentMovementPath[state.currentMovementPath.length - 2];
                state.currentBoardActions.push([tile, action, props]);
            },
            getItemEffect: function(state, player, effect){
                return player.itemEffects.filter((e) => {
                    return e.name === effect;
                }).length;
            },
            playerHasItem: function(state, player, itemIdx){
                return player.items.filter((itm) => {
                    return itm.id === itemIdx;
                });
            },
            warpPlayerTo: function(state, player, tileTo){
                player.loc = tileTo.loc;
                player.tileTo = tileTo;
                state.currentMovementPath = [];
                player.finish = true;
                player.skipFinish = true;
                if(!BG.Utility.isServer()){
                    player.sprite.moveTo(tileTo.loc);
                }
                let props = {
                    func: "playerMovement",
                    loc: tileTo.loc,
                    passBy: false,
                    finish: player.finish,
                    skipFinish: player.skipFinish
                };
                if(BG.MapController.checkPassByTile(state, player)){
                    props.passBy = true;
                    return props;
                }
                return BG.GameController.playerConfirmMove(state, player.playerId);
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
                let item = player.items[itemIdx];
                /* Delayed use items (add an item effect for activation later) */
                /* 25% off Shop Coupon
                 * 50% off Item Coupon
                 * Extra Die
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
                    player.itemEffects.push(effect);
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
                            BG.MenuController.makeMoveShopSelector(state, "warpPlayerTo", false, player.loc, "all");
                            break;
                    }

                };
                player.items.splice(itemIdx, 1);
                return {func: "useItem", itemIdx: itemIdx};
            },
            purchaseSet: function(state, num, playerId){
                let player = BG.GameController.getPlayer(state, playerId);
                let sets = BG.GameController.getCompleteSets(state, player);
                let set = sets[num];
                BG.GameController.changePlayerMoney(player, set.value);
                BG.GameController.addBoardAction(state, "prev", "changePlayerMoney", [player, -set.value]);
                BG.GameController.changePlayerNetValue(player, set.value);
                BG.GameController.addBoardAction(state, "prev", "changePlayerNetValue", [player, -set.value]);
                set.items.forEach((item) => {
                    BG.GameController.changeSetItemQuantity(player, item, -1);
                    BG.GameController.addBoardAction(state, "prev", "changeSetItemQuantity", [player, item, 1]);
                });
                BG.GameController.changePlayerRank(state, player, 1);
                BG.GameController.addBoardAction(state, "prev", "changePlayerRank", [player, -1]);

            },
            purchaseSetItem: function(state, tileLoc, playerId){
                let tile = BG.MapController.getTileAt(state, tileLoc);
                let player = BG.GameController.getPlayer(state, playerId);
                BG.GameController.changePlayerMoney(player, -tile.itemCost);
                BG.GameController.addBoardAction(state, "prev", "changePlayerMoney", [player, tile.itemCost]);
                BG.GameController.changeSetItemQuantity(player, tile.itemName, 1);
                BG.GameController.addBoardAction(state, "prev", "changeSetItemQuantity", [player, tile.itemName, -1]);
                BG.GameController.changePlayerNetValue(player, -tile.itemCost);
                BG.GameController.addBoardAction(state, "prev", "changePlayerNetValue", [player, tile.itemCost]);

            },
            purchaseItem: function(state, item, playerId){
                let player = BG.GameController.getPlayer(state, playerId);
                BG.GameController.changePlayerItem(player, item, true);
                BG.GameController.addBoardAction(state, "prev", "changePlayerItem", [player, item]);
                BG.GameController.changePlayerMoney(player, -item.cost);
                BG.GameController.addBoardAction(state, "prev", "changePlayerMoney", [player, item.cost]);
                BG.GameController.changePlayerNetValue(player, -item.cost);
                BG.GameController.addBoardAction(state, "prev", "changePlayerNetValue", [player, item.cost]);
            },
            changePlayerItem: function(player, item, add){
                if(add){
                    player.items.push(item);
                } else {
                    player.items.splice(player.items.indexOf(item), 1);
                }
            },
            buyStock: function(player, num, price, district){
                district.stockAvailable -= num;
                player.stocks[district.id].num += num;
                BG.GameController.changePlayerMoney(player, -price);
            },
            sellStock: function(player, num, price, district){
                district.stockAvailable += num;
                player.stocks[district.id].num -= num;
                BG.GameController.changePlayerMoney(player, price);
            },
            changePlayerRank: function(player, rank){
                player.rank += rank;
            },
            changeSetItemQuantity: function(player, itemName, number){
                if(!player.setPieces[itemName]) player.setPieces[itemName] = 0;
                player.setPieces[itemName] += number;
            },
            changePlayerMoney: function(player, amount){
                player.money += amount;
                if(!BG.Utility.isServer()){
                    player.sprite.dispatchEvent({type: "moneyChanged"});
                }
            },
            changePlayerNetValue: function(player, amount){
                player.netValue += amount;
                if(!BG.Utility.isServer()){
                    player.sprite.dispatchEvent({type: "netValueChanged"});
                }
            },
            getCompleteSets: function(state, player){
                return state.map.data.sets.filter((set) => {
                    return set.items.every((item) => {
                        return player.setPieces[item];
                    });
                });
            },
            startRollingDie: function(state, rollsNums, player){
                BG.Q.clearStage(2);
                state.dice = [];
                let space = 100;
                let playerPos = BG.Utility.getXZ(player.p.loc);
                let scene = BG.scene;
                console.log(rollsNums)
                for(let i = 0; i < rollsNums.length; i++){
                    let die = BG.GameController.createObject("Die", {
                        x: 0,
                        y: 0.3,
                        z: 0
                    }, {roll: rollsNums[i]});
                    //scene.add(die);
                    state.dice.push(die);
                    console.log(die)
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
            stopDice: function(state){
                state.dice.forEach((die) => {die.stop();});
            },
            playerMovement: function(state, inputs, id){
                let obj = BG.MapController.processPlayerMovement(state, inputs, id);
                if(obj.finish && !obj.passBy){
                    BG.GameController.askFinishMove(state, BG.GameController.getPlayer(state, id));
                    obj = [obj, {func: "removeItem", item: "moveArrows"}];
                }
                return obj;
            },
            allowPlayerMovement: function(state, num){
                state.currentMovementNum = num;
                state.currentMovementPath = [BG.MapController.getTileAt(state, state.turnOrder[0].loc)];
                if(!BG.Utility.isServer()){
                    state.turnOrder[0].sprite.showMovementDirections();
                    BG.AudioController.stopSound("roll-die");
                    BG.AudioController.playSound("throw-die");
                }
            },
            checkFinishMove: function(state, player){
                let finish = player.finish;
                let skipFinish = player.skipFinish;
                if(skipFinish){
                    return BG.GameController.playerConfirmMove(state, player.playerId);
                } else if(finish){
                    return BG.GameController.askFinishMove(state, player);
                } else {
                    state.menus[0].data = {func: "playerMovement"};
                }
            },
            payOwnerOfShop: function(state, player, tileOn){
                BG.GameController.changePlayerMoney(player, -tileOn.cost);
                BG.GameController.changePlayerNetValue(player, -tileOn.cost);
                BG.GameController.changePlayerMoney(tileOn.ownedBy, tileOn.cost);
                BG.GameController.changePlayerNetValue(tileOn.ownedBy, tileOn.cost);
                return {func: "payOwnerOfShop", loc: tileOn.loc};
            },
            askToBuyShop: function(state, player, tileOn){
                //If the player doesn't have enough money, skip this step and end the turn
                if(player.money < tileOn.value){
                    return BG.GameController.endTurn(state);
                }
                return BG.MenuController.makeMenu(state, {menu: "askBuyShop", display: "dialogue"});
            },
            landOnMainTile: function(state, player){
                //The player gets another roll when landing on the base tile.
                state.currentMovementPath = [];
                state.currentBoardActions = [];
                state.menus[0].data.forceRoll = true;
                //The player can go any possible direction now.
                //Set the lastTile to the correct tile if we want to force forward direction of the player on this extra roll.
                player.lastTile = false;
            },
            //After the player says "yes" to stopping here.
            playerConfirmMove: function(state, id){
                let player = this.getPlayer(state, id);
                let tileOn = BG.MapController.getTileAt(state, player.loc);
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
                                if(player.money >= tileOn.value * 5){
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
                        BG.MenuController.inputStates.playerTurnMenu.rollDie(state);
                        BG.GameController.landOnMainTile(state, player);
                        return [{func: "clearStage", num: 2}, {func: "landOnMainTile"}, {func: "rollDie", rollsNums: state.menus[0].data.rollsNums}];
                    case "vendor":
                        return BG.GameController.endTurn(state);
                    case "itemshop":
                        return BG.GameController.endTurn(state);
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
                }
                return tileTo.loc;
            },  
            //When the player steps onto the last tile of the movement
            askFinishMove: function(state){
                return BG.MenuController.makeMenu(state, {menu: "menuMovePlayer", display: "dialogue"});
            },
            movePlayer: function(player, tileTo){
                player.loc = tileTo.loc;
                if(!BG.Utility.isServer()){
                    player.sprite.moveTo(tileTo.loc);
                    BG.AudioController.playSound("step-on-tile");
                }
            },
            getPlayer: function(state, id){
                return state.turnOrder.find(player => { return player.playerId === id;});
            },
            setUpPlayers: function(data, mainTile){
                let players = [];
                for(let i = 0; i < data.users.length; i++){
                    let player = {
                        playerId: data.users[i].id,
                        name: "Player " + data.users[i].id,
                        loc: [6, 6],
                        //loc: [mainTile.loc[0], mainTile.loc[1]],
                        money: data.mapData.modes[data.settings.mode].startMoney,
                        netValue: data.mapData.modes[data.settings.mode].startMoney,
                        color: data.users[i].color,
                        shops: [],
                        items: [{name: "Warp"}],
                        itemEffects: [],
                        setPieces: {
                            Peanut: 1
                        },
                        stocks: [],
                        stockControl: 0,
                        investments: [],
                        rank: 1,
                        maxItems: 1
                        //Etc... Add more as I think of more. TODO
                    };
                    for(let j = 0; j < data.mapData.districts.length; j++){
                        player.stocks.push({
                            num: 0
                        });
                    }
                    players.push(player);
                }
                return players;
            },
            //Reduce the active turns for each item effect by 1. If the item is at 0, remove the effect.
            reduceItemTurns: function(player){
                for(let i = player.itemEffects.length - 1; i >= 0; i--){
                    let effect = player.itemEffects[i];
                    effect.turns --;
                    if(!effect.turns){
                        player.itemEffects.splice(i, 1);
                        //Could do something else when certain items wear off (revert player colour, etc..)
                    }
                }
            },
            //Functions that happen when the current player ends the turn
            endTurn: function(state){
                //If the player doesn't have any ready cash at the end of his turn, force him to sell shops or stocks.
                //Once he's above 0, run this endTurn function again and it'll go past this.
                if(state.turnOrder[0].money < 0){
                    return BG.MenuController.makeMenu(state, {menu: "forceSellAsset", display: "dialogue"});
                }

                state.turnOrder[0].lastTile = state.currentMovementPath[state.currentMovementPath.length - 2];
                state.turnOrder.push(state.turnOrder.shift());
                BG.GameController.startTurn(state);
                return {func: "endTurn"};
            },
            //Functions that happen when the new current player starts his turn
            startTurn: function(state){
                state.currentMovementNum = false;
                state.currentBoardActions = [];
                state.forceSellAssets = false;
                let player = state.turnOrder[0];
                player.turn = true;
                //Player gets additional stock buying power based on rank, number of shops owned, and amount of money on hand.
                //The player can buy number of stock equal or below the stockControl value at any time.
                player.stockControl += player.rank * 3 + player.shops.length + ~~(player.money / 500);
                //255 is max number for stock control.
                player.stockControl = Math.min(255, player.stockControl);
                player.invested = 0;
                player.upgraded = 0;
                player.auctioned = 0;
                player.tileTo = false;
                player.finish = false;
                player.skipFinish = false;
                BG.GameController.reduceItemTurns(player);

                BG.preventMultipleInputs = true;
                
                if(!state.doIt){
                    BG.GameController.buyShop(state, player, BG.MapController.getTileAt(state, [6, 4]), 1);
                    //BG.GameController.buyShop(state, state.turnOrder[0], BG.MapController.getTileAt(state, [6, 4]), 0)
                    //BG.GameController.buyStock(state.turnOrder[0], 10, state.map.districts[0].stockPrice * 10, state.map.districts[0]);
                    if(!BG.Utility.isServer()){
                        setTimeout(function(){
                            BG.Q.inputs["down"] = true;
                            setTimeout(function(){
                                BG.Q.inputs["confirm"] = true;
                                setTimeout(function(){
                                    BG.Q.inputs["confirm"] = true;
                                }, 100);
                            }, 100);
                        }, 100);
                    }
                    state.doIt = true;
                }
                state.doIt = false;
                
                BG.MenuController.makeMenu(state, {menu: "playerTurnMenu", selected: [0, 0], display: "menu"});
                if(BG.Utility.isActiveUser()){
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
                BG.GameController.adjustShopValues(state, player, shop);
                player.shops.push(shop);
                if(!BG.Utility.isServer()){
                    shop.sprite.updateTile(player.color);
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
                    shop.sprite.updateTile(player.color);
                    BG.AudioController.playSound("purchase-item");
                }
                shop.ownedBy.shops.splice(shop.ownedBy.shops.indexOf(shop), 1);
                shop.ownedBy = player;
                player.shops.push(shop);
                BG.GameController.adjustShopValues(state, player, shop);
                BG.GameController.adjustShopValues(state, shop.ownedBy, shop);
            },
            sellShop: function(state, shop, price, sellTo){
                BG.GameController.changePlayerMoney(shop.ownedBy, price);
                BG.GameController.changePlayerNetValue(shop.ownedBy, -shop.value + price);
                BG.GameController.adjustShopValues(state, shop.ownedBy, shop);
                shop.ownedBy.shops.splice(shop.ownedBy.shops.indexOf(shop), 1);

                shop.ownedBy = sellTo;
                if(shop.ownedBy){
                    BG.GameController.changePlayerMoney(shop.ownedBy, -price);
                    BG.GameController.changePlayerNetValue(shop.ownedBy, -price + shop.value);
                    BG.GameController.adjustShopValues(state, shop.ownedBy, shop);

                } else {
                    shop.cost = BG.MapController.generateShopCost(shop.initialValue, shop.rank, shop.investedCapital, 1);
                    shop.maxCapital = BG.MapController.generateShopMaxCapital(shop.initialValue, shop.rank, shop.investedCapital);
                    if(!BG.Utility.isServer()){
                        shop.sprite.updateTile();
                    }
                }
                if(!BG.Utility.isServer()){
                    BG.AudioController.playSound("purchase-item");
                }
            },
            //Changes the value of shops in the district based on the number that the player owns.
            adjustShopValues: function(state, player, shop){
                let shopsOwned = BG.MapController.getShopsOwnedInDistrict(state, shop);
                if(shopsOwned.length > 1){
                    shopsOwned.forEach((shop) => {
                        shop.cost = BG.MapController.generateShopCost(shop.initialValue, shop.rank, shop.investedCapital, shopsOwned.length);
                        shop.maxCapital = BG.MapController.generateShopMaxCapital(shop.initialValue, shop.rank, shop.investedCapital);
                        if(!BG.Utility.isServer()){
                            shop.sprite.updateTile(player.color);
                        }
                    });
                }
            },
            //Updates the shop to the current values.
            updateShopValues: function(state, shop){
                let shopsOwned = shop.ownedBy ? BG.MapController.getShopsOwnedInDistrict(state, shop).length : 1;
                shop.value = BG.MapController.generateShopValue(shop.initialValue, shop.rank, shop.investedCapital);
                shop.cost = BG.MapController.generateShopCost(shop.initialValue, shop.rank, shop.investedCapital, shopsOwned);
                shop.maxCapital = BG.MapController.generateShopMaxCapital(state.menus[0].data.shop.initialValue, state.menus[0].data.shop.rank, state.menus[0].data.shop.investedCapital);
                if(!BG.Utility.isServer()){
                    shop.sprite.updateTile(shop.ownedBy.color);
                    BG.GameController.tileDetails.displayShop(shop);
                }
            },
            investInShop: function(state, investAmount){
                if(!investAmount) return;
                state.menus[0].data.shop.maxCapital -= investAmount;
                state.menus[0].data.shop.investedCapital += investAmount;
                BG.GameController.updateShopValues(state, state.menus[0].data.shop);
                BG.GameController.changePlayerMoney(state.turnOrder[0], -investAmount);
                state.turnOrder[0].invested++;
            },
            upgradeShop: function(state, rankUp, cost){
                state.menus[0].data.shop.rank += rankUp;
                BG.GameController.changePlayerMoney(state.turnOrder[0], -cost);
                BG.GameController.updateShopValues(state, state.menus[0].data.shop);
                state.turnOrder[0].upgraded++;
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
                        return BG.GameController.playerMovement(state, inputs, state.turnOrder[0].playerId);
                    case "moveShopSelector":
                        return BG.MenuController.processShopSelectorInput(state, inputs);
                    case "controlNumberCycler":
                        return BG.MenuController.processNumberCyclerInput(state, inputs);
                    case "confirmer":
                        return BG.MenuController.processConfirmerInput(state, inputs);
                }
            },
            getNumberOfStocks: function(player){
                return player.stocks.reduce((a, i) => a + i.num, 0);
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
                let object = BG.ObjectData["player.obj"].clone();
                object.p = props;
                object.initialize = function(){
                    this.position.x = position.x;
                    this.position.y = position.y;
                    this.position.z = position.z;
                };
                //Shows which way the player can move from a tile.
                object.showMovementDirections = function(){
                    
                };
                //Moves the player to a certain location.
                object.moveTo = function(loc){
                    let pos = BG.Utility.getXZ(loc);
                    this.position.x = pos.x + BG.c.tileW;
                    this.position.z = pos.z + BG.c.tileH;
                    BG.camera.moveTo({obj: this, zOffset: 4});
                };
                object.addEventListener("moneyChanged", function(){
                    console.log("moneyChnaged!");
                });
                object.addEventListener("netValueChanged", function(){
                    console.log("NVChanged!");
                });
                object.initialize();
                return object;
            },
            Die: function(position, props){
                let object = {position: {}};//BG.ObjectData["die.obj"].clone();
                object.p = props;
                object.initialize = function(){
                    this.position.x = position.x;
                    this.position.y = position.y;
                    this.position.z = position.z;
                };
                //Shuffle the die
                object.animate = function(){
                    
                };
                //Do the stopping animation (throw in the air and land on the correct number)
                object.stop = function(){
                    
                };
                //Gets rid of this die.
                object.remove = function(){
                    
                };
                object.initialize();
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
                object.addObject = function(type){
                    switch(type){
                        case "signpost":
                            var signpost = BG.ObjectData["signpost.obj"].clone();
                            signpost.position.y = 0.1;
                            signpost.position.z -= BG.c.tileH / 2;
                            signpost.name = "signpost"; 
                            this.tileStructure.add(signpost);
                            this.valueText = BG.DisplayController.createText({
                                color: 0x000000,
                                message: "" + this.p.value, 
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
                                message: "" + this.p.cost, 
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
                            this.addObject("signpost");
                            
                            
                            /*
                            this is for if the player owns it already. This will only happen if the player owns a shop from the start.
                            var building = BG.ObjectData["shop-" + props.rank + ".obj"].clone();
                            building.position.y = 0.1;
                            building.position.z -= BG.c.tileH / 4;
                            object.tileStructure.add(building);
                            
                            object.tileStructure.add(BG.DisplayController.createText({
                                 color: 0x000000,
                                 message: ""+props.value, 
                                 drawFrom: "right",
                                 size: 0.3,
                                 position: {
                                     x: BG.c.tileW / 1.2, 
                                     y: 0.11,
                                     z: BG.c.tileH / 1.2
                                 }
                            }) );*/
                            
                            break;
                        //Vendor gets an image of the product.
                        case "vendor":
                            
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData[props.itemName.toLowerCase() + ".png"], 
                                {color: {r: 1, g: 1, b: 1}}
                            );
                            break;
                        case "main":
                            BG.DisplayController.setMaterial(
                                object.tileStructure, 
                                "top", 
                                BG.TextureData["main-tile.png"], 
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
                    }    
                };
                object.updateTile = function(color){
                    if(!color){
                        this.remove(this.valueText);
                        this.addObject("signpost");
                        this.tileStructure.remove(this.tileStructure.getObjectByName("shop-building"));
                        this.color = "lightgrey";
                    } else {
                        this.addObject("shop-building");
                        this.tileStructure.remove(this.tileStructure.getObjectByName("signpost"));
                        this.color = color;
                        BG.Utility.updateMaterial(this.tileStructure, "Main", new THREE.MeshStandardMaterial( { color: this.color} ));
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
                    let pos = BG.Utility.getXZ(p.pos || p.state.turnOrder[0].loc);
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