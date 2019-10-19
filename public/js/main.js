import {GLTFLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r108/examples/jsm/loaders/GLTFLoader.js';

$(function(){
    require(['socket.io/socket.io.js']);
    
    
    let BG = window.BG = new BoardGame();
    let socket = io.connect();
    BG.socket = socket;
    
    let user = {};
    
    let Client = clientSide();
    BG.OptionsController = Client.OptionsController;
    BG.AudioController = Client.AudioController;
    BG.DisplayController = Client.DisplayController;
    BG.ObjectData = {};
    BG.MaterialsData = {};
    BG.TextureData = {};
    BG.FontsData = {};
    
    
    //Quinuts is used for handling inputs and displaying UI
    BG.Q = Quintus().include("Sprites, Scenes, Touch, UI, Anim, Input, Objects")
            .setup("quintus", {development:true, width:$("#content-container").width(), height:$("#content-container").height()})
            .controls(true)
            .touch();
    BG.THREE = THREE;
    
    BG.Q.setImageSmoothing(false);
    
    BG.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.2, 1000);
    
    // create an AudioListener and add it to the camera
    let listener = BG.AudioController.audioListener = new THREE.AudioListener();
    BG.camera.add( listener );
    
    //TODO: slide this to the location.
    BG.camera.moveTo = function(props, callback){
        this.centerOn(props);
        //Once the camera is at the location, perform the callback.
        if(callback){
            callback();
        }
    };
    BG.camera.centerOn = function(props){
        let obj = props.obj;
        let xOffset = props.xOffset || 0;
        let zOffset = props.zOffset || 0;
        let x = props.x || obj.position.x;
        let y = props.y || this.position.y;
        let z = props.z || obj.position.z;
        this.position.set(x + xOffset, y, z + zOffset);
    };

    let audioLoader = BG.AudioController.audioLoader = new THREE.AudioLoader();
    let dataLoader = BG.dataLoader = new THREE.FileLoader();    
    let mtlLoader = BG.mtlLoader = new THREE.MTLLoader();
    let textureLoader = BG.textureLoader = new THREE.TextureLoader();
    let gltfLoader = new GLTFLoader();
    let fontLoader = new THREE.FontLoader();
    
    
    socket.on('connected', function (connectionData) {
        function loadFiles(files, callback){
            let audioFiles = files["audio"];
            let dataFiles = files["data/constants"];
            let materialFiles = files["images/3d"].filter((filename) => {let split = filename.split(".");if(split[split.length - 1] === "mtl") { return filename;}});
            let objectFiles = files["images/3d"].filter((filename) => {let split = filename.split(".");if(split[split.length - 1] === "obj") { return filename;}});
            let gltfFiles = files["images/3d"].filter((filename) => {let split = filename.split(".");if(split[split.length - 1] === "gltf") { return filename;}});
            let imageFiles = files["images/2d"];
            let fontFiles = files["data/fonts"];
            let totalFiles = audioFiles.length + dataFiles.length + materialFiles.length + fontFiles.length + imageFiles.length;
            let loadedFiles = 0;
            function checkFinished(){
                if(totalFiles === loadedFiles){
                    let objFilesLoaded = 0;
                    //Load the object files last
                    objectFiles.forEach(file => {
                        //NOOB ZONE: I couldn't figure out how to get the material name of the .obj file before loading
                        //, so I just loaded it twice.
                        let loader = new THREE.OBJLoader(); //I have a feeling creating a new object load is not the way to do it... but it works.
                        loader.load(file, function(object){
                            loader.setMaterials(BG.MaterialsData[object.materialLibraries]);
                            loader.load(file, function(obj){
                                objFilesLoaded++;
                                let split = file.split("/");
                                BG.ObjectData[split[split.length - 1]] = obj;
                                if(objFilesLoaded === objectFiles.length){
                                    callback();
                                }
                            });
                        });
                    });
                    
                }
            }
            audioFiles.forEach(file => {
                audioLoader.load("../" + file, function( buffer ) {
                    loadedFiles++;
                    checkFinished();
                    BG.AudioController.music[file] = buffer;
                });
            });
            dataFiles.forEach(file => {
                dataLoader.load("../" + file, function ( obj ) {
                    loadedFiles++;
                    checkFinished();
                    let split = file.split("/");
                    BG.dataFiles[split[split.length - 1]] = JSON.parse(obj);
                });
            });
            imageFiles.forEach(file => {
                textureLoader.load("../" + file, function ( texture ) {
                    loadedFiles++;
                    checkFinished();
                    let split = file.split("/");
                    BG.TextureData[split[split.length - 1]] = texture;
                });
            });
            materialFiles.forEach(file => {
                mtlLoader.load(file, function(materials){
                    materials.preload();
                    loadedFiles++;
                    checkFinished();
                    let split = file.split("/");
                    BG.MaterialsData[split[split.length - 1]] = materials;
                });
            });
            fontFiles.forEach(file => {
                fontLoader.load(file, function ( font ) {
                    loadedFiles++;
                    checkFinished();
                    let split = file.split("/");
                    BG.FontsData[split[split.length - 1]] = font;
                });
            });
            gltfFiles.forEach(file => {
                gltfLoader.load(file, function(obj){
                    loadedFiles++;
                    checkFinished();
                    let split = file.split("/");
                    BG.ObjectData[split[split.length - 1]] = obj;
                });
            });
        }
        
        loadFiles(connectionData.loadFiles, function(){
            BG.c = BG.dataFiles["data.json"];
            BG.user = user;
            user.id = connectionData.id;
            console.log("Player " + user.id + " connected.");
            user.gameRoom = connectionData.gameRoom;
            BG.OptionsController.options = {//GDATA.saveFiles["save-file1.json"].options;
                menuColor: "#111",
                textColor: "#EEE",
                musicEnabled: false,//true,
                musicVolume: 0.1,
                soundEnabled: true,
                soundVolume: 1
            };
            BG.Q.load(["images/2d/objects.png", "data/constants/objects.json"], () => {
                BG.Q.compileSheets("images/2d/objects.png", "data/constants/objects.json");
            });
            
            
            $("#quintus_container").click();
            //$("#quintus_container")[0].style.pointerEvents = "none";

            socket.emit("readyToStartGame");
            socket.on("allUsersReady", function(data){
                dataLoader.load("../data/maps/" + data.map, function(obj){
                    BG.DisplayController.displayMap({
                        mapData: JSON.parse(obj), 
                        settings: data.settings, 
                        host: data.users[0],
                        users: data.users,
                        turnOrder: data.turnOrder
                    });
                    
                    BG.GameController.startTurn(BG.state);
                });
            });
            
            BG.applyInputResult = function(data){
                //console.log(data)
                let state = BG.state;
                state.currentId = data.id;
                let player = BG.GameController.getPlayer(state, data.id);
                if(!Array.isArray(data.response)) data.response = [data.response];
                //data.response is an array of functions along with arguments that should be run.
                data.response.forEach((r) => {
                    let func = r.func;
                    switch(func){
                        case "removeItem":
                            switch(r.item){
                                case "shopSelector":
                                    state.shopSelector.remove();
                                    //state.shopSelector.sprite.destroy();
                                    break;
                                case "dice":
                                    BG.GameController.removeDice(state);
                                    BG.AudioController.stopSound("roll-die");
                                    break;
                                case "moveArrows":
                                    //player.sprite.destroyArrows();
                                    player.p.allowMovement = false;
                                    break;
                            }
                            break;
                        case "clearStage":
                            BG.Q.clearStage(r.num);
                            break;
                        case "setBGValue":
                            BG.Utility.setDeepValue(BG, r.path, r.value);
                            break;
                        case "setStateValue":
                            BG.Utility.setDeepValue(state, r.path, r.value);
                            break;
                        case "stopSound":
                            BG.AudioController.stopSound(r.sound);
                            break;
                        case "invalidAction":
                            BG.AudioController.playSound("invalid-action");
                            break;
                        case "checkFinishMove":
                            BG.GameController.checkFinishMove(state, player);
                            break;
                        case "useItem":
                            BG.GameController.useItem(state, r.itemIdx);
                            break;
                        case "makeCustomMenu":
                            BG.MenuController.makeCustomMenu(state, r.menu, r.props);
                            break;
                        case "navigateMenu":
                            BG.MenuController.setMenuPosition(state, r.item);
                            break;
                        case "makeMenu":
                            BG.MenuController.makeMenu(state, r.props);
                            if(r.props.sound){
                                BG.AudioController.playSound(r.props.sound);
                            }
                            break;
                        case "switchMenu":
                            BG.MenuController.switchMenu(state, r.props);
                            break;
                        case "rollDie":
                            BG.GameController.startRollingDie(state, r.rollsNums, player);
                            break;
                        case "resetRoll":
                            BG.GameController.resetRoll(state, player, r.choose);
                            break;
                        case "throwDice":
                            BG.GameController.throwDice(state, r.currentMovementNum, r.rollsNums);
                            break;
                        case "playerMovement":
                            var tile = BG.MapController.getTileAt(state, r.loc);
                            BG.GameController.removeDice(state);
                            BG.GameController.tileDetails.displayShop(tile);
                            if(r.direction === "forward"){
                                state.currentMovementPath.push(tile);
                                player.p.tileTo = tile;
                                player.p.finish = r.finish;
                                BG.GameController.movePlayer(player, tile);
                                BG.MapController.checkPassByTile(state, player);
                                BG.state.counter.updateRoll(player.sprite.position, BG.state.currentMovementNum - (BG.state.currentMovementPath.length - 1), player.p.finish);
                            } else if(r.direction === "back"){
                                BG.GameController.playerGoBackMove(state, player.p.playerId);
                            }
                            if(r.finish && !r.passBy){
                                BG.GameController.askFinishMove(state, player);
                            }
                            
                            break;
                        case "playerGoBackMove":
                            BG.Q.clearStage(2);
                            r.func = "playerMovement";
                            player.p.finish = false;
                            BG.GameController.playerGoBackMove(state, player.p.playerId);
                            player.showMovementDirections();
                            break;
                        case "purchaseSet":
                            BG.GameController.purchaseSet(state, r.num, player.p.playerId);
                            BG.AudioController.playSound("purchase-item");
                            break;
                        case "purchaseSetItem":
                            BG.GameController.purchaseSetItem(state, r.loc, player.p.playerId);
                            BG.AudioController.playSound("purchase-item");
                            break;
                        case "exchangeItem":
                            BG.GameController.exchangeItem(state, r.itemNeeded, r.exchangeFor, player.p.playerId);
                            break;
                        case "purchaseItem":
                            BG.GameController.purchaseItem(state, r.item, r.cost, player.p.playerId);
                            break;
                        case "buyShop":
                            if(r.itemIdx >= 0){
                                player.p.items.splice(r.itemIdx, 1);
                            }
                            var shop = BG.MapController.getTileAt(state, r.loc);
                            BG.GameController.buyShop(state, player, shop, r.couponValue);
                            BG.GameController.endTurn(state);
                            break;
                        case "sellShop":
                            var shop = BG.MapController.getTileAt(state, r.loc);
                            if(r.sellTo){
                                r.sellTo = BG.GameController.getPlayer(state, r.id);
                            }
                            BG.GameController.sellShop(state, shop, r.value, r.sellTo);
                            break;
                        case "payOwnerOfShop":
                            BG.GameController.payOwnerOfShop(state, player, BG.MapController.getTileAt(state, r.loc));
                            break;
                        case "buyOutShop":
                            BG.GameController.buyOutShop(state, player, BG.MapController.getTileAt(state, r.loc));
                            break;
                        case "endTurn":
                            BG.GameController.endTurn(state);
                            break;
                        case "goBackMenu":
                            state.menus[0].data.goBack(state);
                            break;
                        case "warpPlayerTo":
                            BG.GameController.warpPlayerTo(state, player, BG.MapController.getTileAt(state, r.loc), r.subdue);
                            break;
                        case "makeMoveShopSelector":
                            BG.MenuController.makeMoveShopSelector(state, r.confirmType, r.backFunc, r.startPos);
                            break;
                        case "finishMoveShopSelector":
                            BG.GameController.finishMoveShopSelector(state, r.key, BG.MapController.getTileAt(state, r.loc), r.props);
                            break;
                        case "moveShopSelector":
                            state.shopSelector.moveTo(r.move[0], r.move[1], r.move[2]);
                            break;
                        case "controlNumberCycler":
                            if(r.item){
                                state.menus[0].currentItem = r.item;
                                state.menus[0].currentCont.p.menuButtons[state.menus[0].currentItem[0]][state.menus[0].currentItem[1]].selected();
                                BG.AudioController.playSound("change-number-cycler");
                            } else if(r.num >= 0){
                                state.menus[0].itemGrid[state.menus[0].currentItem[1]][state.menus[0].currentItem[0]][0] = r.num;
                                state.menus[0].currentCont.p.menuButtons[state.menus[0].currentItem[0]][state.menus[0].currentItem[1]].changeLabel(state.menus[0].itemGrid[state.menus[0].currentItem[1]][state.menus[0].currentItem[0]][0]);
                                state.menus[0].currentCont.trigger("adjustedNumber", state);
                                BG.AudioController.playSound("change-number-cycler");
                            } else if(r.value >= 0){
                                BG.MenuController.setNumberCyclerValue(state, r.value);
                                state.menus[0].currentCont.trigger("adjustedNumber", state);
                            }
                            break;
                        case "finalizeInvestInShop":
                            BG.GameController.investInShop(state, r.investAmount);
                            break;
                        case "finalizeUpgradeShop":
                            BG.GameController.upgradeShop(state, r.rankUp, r.cost);
                            break;
                        case "finalizeBuyStock":
                            BG.GameController.addBoardAction(state, "prev", "changePlayerStock", [player, state.map.districts[r.district]], [r.num, r.cost]);
                            break;
                        case "finalizeSellStock":
                            BG.GameController.addBoardAction(state, "prev", "changePlayerStock", [player, state.map.districts[r.district]], [r.num, r.cost]);
                            break;
                        case "addToDeal":
                            BG.GameController.addToDeal(state, r.props);
                            BG.state.dealMenu.addToDeal(r.props);
                            break;
                        case "clearMenus":
                            BG.MenuController.clearMenus(state, r.type);
                            break;
                    }
                });
            };
            socket.on("inputResult", BG.applyInputResult);
        });
        
        
    });
    
    
    
    
    
    
});