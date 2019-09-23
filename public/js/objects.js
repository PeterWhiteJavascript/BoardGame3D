var quintusObjects = function(Quintus) {
"use strict";
//This is all UI objects client side
Quintus.Objects = function(Q) {
    
    Q.UI.Container.extend("TurnAnimation", {
        init: function(p){
            this._super(p, {
                x:Q.width / 2,
                y:Q.height / 12,
                w: 280,
                h: 40,
                fill: "grey"
            });
            this.add("tween");
            this.on("inserted");
        },
        inserted: function(){
            let text = this.insert(new Q.UI.Text({label: "It's your turn!", y: -10}));
            text.add("tween");
            text.animate({opacity: 0}, 1, Q.Easing.Quadratic.In, {delay: 0.5, callback: function(){ this.destroy();}});
            this.animate({opacity: 0}, 1, Q.Easing.Quadratic.In, {delay: 0.5, callback: function(){ this.destroy();}});
        }
    });
    Q.Sprite.extend("Cursor", {
        init: function(p){
            this._super(p,{
                fill: "black",
                w: 5, h: 5
            });
        }
    });
    
    
    Q.UI.Container.extend("MenuButtonContainer",{
        init: function(p){
            this._super(p, {
                fill: BG.OptionsController.options.menuColor, 
                cx: 0, 
                cy:0,
                menuButtons: []
            });
        },
        interact: function(button){
            button.trigger("interactWith", button.p.toContainer);
        },
        dehoverAll: function(){
            for(let i = 0; i < this.p.menuButtons.length; i++){
                for(let j = 0; j < this.p.menuButtons[i].length; j++){
                    this.p.menuButtons[i][j].dehover();
                }
            }
        },
        removeContent:function(){
            let stage = this.stage;
            this.children.forEach(function(child){stage.remove(child);});
            this.p.menuButtons = [];
        },
        fillEmptyMenuButtons: function(fillTo){
            if(!fillTo){
                fillTo = 0;
                for(let i = 0; i < this.p.menuButtons.length; i++){
                    fillTo = Math.max(this.p.menuButtons[i].length, fillTo);
                }
            }
            for(let i = this.p.menuButtons.length - 1; i >= 0; i--){
                if(!this.p.menuButtons[i].length){ 
                    this.p.menuButtons.splice(i, 1);
                    continue;
                };
                if(this.p.menuButtons[i].length < fillTo){
                    let diff = fillTo - this.p.menuButtons[i].length;
                    for(let j = 0; j < diff; j++){
                        this.p.menuButtons[i].push(this.p.menuButtons[i][fillTo - diff - 1]);
                    }
                }
            }
        },
        displayOptions: function(onHover){
            let options = BG.state.menus[0].itemGrid;
            let cursor = new Q.Cursor();
            this.p.menuButtons = [];
            let menuButtonCont = this;
            for(let i = 0; i < options.length; i++){
                this.p.menuButtons[i] = [];
                for(let j = 0; j < options[i].length; j++){
                    let button = this.insert(new Q.MenuButton({x: 5, y: 5 + 40 * i, w:175, label: options[i][j][0], func: options[i][j][1], props:options[i][j][2], cursor: cursor}));
                    button.on("interactWith", function(){
                        this.removeContent();
                        //If there's no function, we're just cycling text.
                        if(!this.p.func){
                            processDialogue();
                        } else {
                            let newTextAvailable = Q.MenuController.menuButtonInteractFunction(this.p.func, this.p.props, this.stage.options);
                            if(newTextAvailable){
                                menuButtonCont.p.dialogue = newTextAvailable;
                                menuButtonCont.p.idx = 0;
                                processDialogue();
                            }
                        }
                    });
                    if(onHover) {
                        button.on("hover", function(){
                            onHover(button, i);
                        });
                    }
                    this.p.menuButtons[i].push(button);
                }
            }
            this.p.menuButtons[0][0].hover();
        }
    });
    Q.UI.Container.extend("MenuButton", {
        init: function(p){
            this._super(p, {
                w: 140,
                h: 35,
                x:5,
                cx:0, cy:0,
                fill: "white",
                selectedColour: "teal",
                defaultColour: "white"
            });
            if(p.label){
                this.on("inserted", this, "addText");
            }
            this.p.defaultRadius = this.p.radius;
        },
        dehover:function(){
            this.p.fill = this.p.defaultColour;
            this.trigger("dehover");
            this.p.radius = this.p.defaultRadius;
        },
        setFill: function(color){
            this.p.fill = color || this.p.selectedColour;
        },
        hover:function(){
            for(let i = 0; i < this.container.p.menuButtons.length; i++){
                for(let j = 0; j < this.container.p.menuButtons[i].length; j++){
                    this.container.p.menuButtons[i][j].dehover();
                }
            }
            this.setFill();
            
            this.stage.insert(this.p.cursor, this.container);
            this.p.cursor.p.x = this.p.x + this.p.w - 15;
            this.p.cursor.p.y = this.p.y + this.p.h / 2;
            this.p.cursor.refreshMatrix();
            this.p.radius = this.p.defaultRadius / 2;
            this.trigger("hover");
        },
        addText:function(){
            let size = this.p.size || 14;
            this.insert(new Q.UI.Text({label: this.p.label, x: 10, y: this.p.h / 2 - size / 2, size: size || 14, align: "left"}));
        }
    });
    Q.UI.Text.extend("ScrollingText",{
        init: function(p){
            this._super(p, {
                x:10, y: 5,
                align: "left",
                cx:0, cy:0,
                color: BG.OptionsController.options.textColor,
                family: "Comic Sans MS"
            });
            this.on("inserted");
        },
        inserted: function(){
            this.calcSize();
            this.on("interact", this, "doneScrolling");
        },
        doneScrolling: function(){
            this.trigger("doneScrolling");
        }
    });
    Q.UI.Container.extend("StandardMenu", {
        init: function(p){
            this._super(p, {
                cx:0, 
                cy:0, 
                fill: BG.OptionsController.options.menuColor, 
                opacity:0.8, 
                border:1
            });
        }
    });
    Q.UI.Text.extend("StandardText", {
        init: function(p){
            this._super(p, {
                size: 18,
                color: BG.OptionsController.options.textColor,
                align: "right",
                family: "Verdana"
            });
        }
    });
    Q.UI.Text.extend("SmallText", {
        init: function(p){
            this._super(p, {
                size: 16,
                align: "center",
                color: BG.OptionsController.options.textColor
            });
        }
    });
    Q.UI.Container.extend("BGText", {
        init: function(p){
            this._super(p, {
                cx:0, cy:0,
                fill: "#222"
            });
            if(p.textP){
                this.on("inserted", this, "addText");
            }
        },
        addText:function(){
            let p = this.p.textP;
            this.text = this.insert(new Q[p.textClass](p));
            
        }
    });
    Q.UI.Container.extend("SetsMenu",{
        init: function(p){
            this._super(p, {
                cx:0, cy:0,
                w: Q.width / 2,
                h: Q.height / 2,
                x: Q.width / 4,
                y: Q.height / 4, 
                fill: BG.OptionsController.options.menuColor, 
                opacity:0.8, 
                border:1
            });
            this.on("inserted");
        },
        inserted: function(){
            let player = this.p.player;
            let sets = BG.state.map.data.sets;
            //Insert all sets that exist in this map and show the passed in player's set items.
            let setHeight = this.p.h / 5 - 12;
            for(let i = 0; i < sets.length; i++){
                let cont = this.insert(new Q.UI.Container({cx:0, cy:0, w: this.p.w - 20, h: setHeight, x: 10, y: 10 + i * ~~((this.p.h - 10) / 5)}));
                let setImagesCont = cont.insert(new Q.UI.Container({cx:0, cy:0, w: cont.p.w * 0.7, h: cont.p.h}));
                for(let j = 0; j < sets[i].items.length; j++){
                    let xLoc = j * 100 - (((sets[i].items.length - 1 ) / 2) * 100) + setImagesCont.p.w / 2;
                    setImagesCont.insert(new Q.UI.Container({x: xLoc, y: 10 - 5, w: 70, h: 70, cy:0, border: 5, radius: 20, fill: "gold", opacity: 0.5}));
                    setImagesCont.insert(new Q.Sprite({x: xLoc, y: 10, cy:0, sheet: (sets[i].items[j].toLowerCase()) + "-vendor", frame: 0}));
                    setImagesCont.insert(new Q.UI.Text({x: xLoc + 20, y: 10, label: (player.setPieces[sets[i].items[j]] || 0) + ""}));
                }
                let setTextCont = cont.insert(new Q.UI.Container({cx:0, cy:0, w: cont.p.w * 0.3, h: cont.p.h, x: cont.p.w * 0.7, fill: "#EEE"}));
                setTextCont.insert(new Q.UI.Text({cx:0, cy:0, x: 10, y: 10, label: sets[i].name, align: "left"}));
                setTextCont.insert(new Q.UI.Text({cx:0, cy:0, x: 10, y: setTextCont.p.h / 2, label: sets[i].value + " G", align: "left"}));
            }
        },
        hoverSet: function(set){
            this.children.forEach((child) => {
                child.children[0].p.fill = "transparent";
            });
            if(set.p.label === "Nothing") return;
            
            let toHover = this.children.find((child) => {
                return child.children[1].children[0].p.label === set.p.label;
            });
            toHover.children[0].p.fill = "gold";
        }
    });
    Q.UI.Container.extend("MapMenu", {
        init: function(p){
            this._super(p, {
                cx:0, cy:0,
                w: Q.width / 2,
                h: Q.height / 2,
                x: Q.width / 4,
                y: Q.height / 4, 
                fill: BG.OptionsController.options.menuColor, 
                opacity:0.8, 
                border:1
            }); 
            this.on("inserted");
        },
        inserted: function(){
            //TODO: size things based on actual map size to fit the screen better.
            let map = BG.state.map;
            let mapObj = this.stage.insert(new Q.UI.Container({x: this.p.w, y: this.p.h, w: this.p.w - 20, h: this.p.h - 20, border: 1, fill: "#BBB"}));
            let distance = 16;
            //Pulse the tile that the player is on
            let player = this.p.player;
            this.miniTiles = [];
            for(let i = 0; i < map.tiles.length; i++){
                let tile = map.tiles[i];
                let miniTile = mapObj.insert(new Q.UI.Container({x: (tile.loc[0] - map.centerX) * distance, y: (tile.loc[1] - map.centerY) * distance, w: 24, h: 16, fill: "transparent", radius: 1, border: 2, stroke: "black", district: tile.district}));
                miniTile.add("tween");
                switch(tile.type){
                    case "main":
                        miniTile.insert(new Q.UI.Text({label: "H", size: 12, y: -miniTile.p.h / 2 + 1}));
                        break;
                    case "vendor":
                        miniTile.insert(new Q.UI.Text({label: "V", size: 12, y: -miniTile.p.h / 2 + 1}));
                        break;
                    case "itemshop":
                        miniTile.insert(new Q.UI.Text({label: "I", size: 12, y: -miniTile.p.h / 2 + 1}));
                        break;
                    case "shop":
                        if(tile.ownedBy){
                            miniTile.p.fill = tile.ownedBy.color;
                        }
                        miniTile.p.stroke = BG.state.map.districts[tile.district].color;
                        break;
                }
                if(player && BG.Utility.locsMatch(player.loc, tile.loc)){
                    this.pulseTile(miniTile);
                }
                this.miniTiles.push(miniTile);
            }
        },
        pulseDistrictTiles: function(district){
            this.miniTiles.forEach((tile) => {
                if(tile.p.district === district){
                    this.pulseTile(tile);
                } else if(tile.p.district >= 0){
                    tile.stop();
                    tile.p.opacity = 1;
                }
            });
        },
        pulseTile: function(tile){
            let t = this;
            tile.animate({ opacity: 0.1 }, 0.5, Q.Easing.Linear)
                .chain({ opacity: 0.9 }, 0.5, Q.Easing.Linear, {callback: () => {t.pulseTile(tile);}});
        }
    });
    
    
    Q.UI.Container.extend("ShopStatusBox", {
        init: function(p){
            this._super(p, {
                cx:0, 
                cy:0, 
                fill: BG.OptionsController.options.menuColor, 
                opacity:0.8, 
                border:1
            });
            this.on("inserted");
        },
        inserted: function(){
            let shopStatusBox = this;
            this.shopIconAndRankCont = shopStatusBox.insert(new Q.UI.Container({x: 10, y:10, w: shopStatusBox.p.w / 2 - 10, h: shopStatusBox.p.h - 20, cx:0, cy:0}));

            this.shopRankContainer = this.shopIconAndRankCont.insert(new Q.UI.Container({x: this.shopIconAndRankCont.p.w / 2, y:70, w:this.shopIconAndRankCont.p.w - 20, h: 30, fill: "gold"}));
            this.shopRankContainer.insertStars = function(rank){
                this.children.forEach((star) => {star.destroy(); });
                let space = 20;
                for(let i = 0; i < rank; i++){
                    this.insert(new Q.UI.Text({label: "*", x: i * space - (((rank - 1 ) / 2) * space), y: -this.p.h / 4}));
                }
            };

            this.shopBackground = this.shopIconAndRankCont.insert(new Q.UI.Container({cx: 0, cy: 0, x: 10, y: 90, fill: "#222", w:this.shopIconAndRankCont.p.w - 20, h: 90 }));
            this.shopIcon = this.shopIconAndRankCont.insert(new Q.Sprite({x: this.shopIconAndRankCont.p.w / 2, y: 130, w: 64, h: 64}));

            this.shopTextCont = shopStatusBox.insert(new Q.UI.Container({x: shopStatusBox.p.w / 2, y:10, w: shopStatusBox.p.w / 2 - 10, h: shopStatusBox.p.h - 20, cx:0, cy:0}));
            this.shopName = this.shopTextCont.insert(new Q.StandardText({x: 0, y:0, label: " ", align: "center", size: 24, cx: 0, cy:0, w: 1000, h: 1000}));

            this.valueCont = this.shopTextCont.insert(new Q.SmallText({x:this.shopTextCont.p.w / 2, y: 40, label: "Shop value"}));
            this.valueText = this.shopTextCont.insert(new Q.BGText({x: 10, y: 65, w: shopStatusBox.p.w / 2 - 20, h: 25, textP: {textClass: "StandardText", label: " ", x: shopStatusBox.p.w / 2 - 30, y: 3, color: "#EEE"}}));

            this.pricesCont = this.shopTextCont.insert(new Q.SmallText({x: this.shopTextCont.p.w / 2, y: 95, label: "Shop prices"}));
            this.pricesText = this.shopTextCont.insert(new Q.BGText({x: 10, y: 120, w: shopStatusBox.p.w / 2 - 20, h: 25, textP: {textClass: "StandardText", label: " ", x: shopStatusBox.p.w / 2 - 30, y: 3, color: "#EEE"}}));

            this.capitalCont = this.shopTextCont.insert(new Q.SmallText({x: this.shopTextCont.p.w / 2, y: 150, label: "Max. capital"}));
            this.capitalText = this.shopTextCont.insert(new Q.BGText({x: 10, y: 175, w: shopStatusBox.p.w / 2 - 20, h: 25, textP: {textClass: "StandardText", label: " ", x: shopStatusBox.p.w / 2 - 30, y: 3, color: "#EEE"}}));

            this.districtCont = shopStatusBox.insert(new Q.BGText({x: - 10, y: -25, w: BG.c.boxWidth + 20, h: 30, fill: "#AAA", textP: {textClass: "StandardText", label: " ", x: BG.c.boxWidth, y: 5, color: "#111"}}));

            this.bottomDecoration = shopStatusBox.insert(new Q.UI.Container({cx: 0, cy: 0, x: -5, y: BG.c.boxHeight - 2, w: BG.c.boxWidth + 10, h: 5,  fill: "#AAA", radius: 3}));
            shopStatusBox.displayShop(BG.MapController.getTileAt(BG.state, this.p.shopLoc));
        },
        
        //Take a tile and display the correct information.
        displayShop: function(shop){
            if(this.shop && shop !== this.shop){
                this.shop.sprite.updateHovering(false);
            }
            if(!shop){
                this.hide();
            } else {
                shop.sprite.updateHovering(true);
                this.show();
                switch(shop.type){
                    case "main":
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Home Base";

                        this.shopIcon.p.sheet = "home-base-1";
                        break;
                    case "shop":
                        this.shopTextCont.show();
                        this.shopRankContainer.show();

                        this.districtCont.p.fill = BG.state.map.districts[shop.district].color;
                        this.districtCont.text.p.label = BG.state.map.districts[shop.district].name;

                        this.shopName.p.label = shop.name;
                        this.shopRankContainer.insertStars(shop.rank);
                        if(shop.ownedBy){
                            this.shopIcon.p.sheet = "tile-structure-" + shop.rank;
                            this.shopBackground.p.fill = shop.ownedBy.color;
                        } else {
                            this.shopIcon.p.sheet = "shop-for-sale-signpost";
                            this.shopBackground.p.fill = "#222";
                        }

                        this.valueText.text.p.label = shop.value + " G";
                        this.pricesText.text.p.label = shop.cost + " G";
                        this.capitalText.text.p.label = shop.maxCapital + " G";
                        break;
                    case "vendor":
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = shop.itemName + " Vendor";

                        this.shopIcon.p.sheet = (shop.itemName.toLowerCase()) + "-vendor";
                        break;
                    case "itemshop":
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Item Shop";

                        this.shopIcon.p.sheet = "tile-structure-4";
                        break;
                }
            }
            this.shop = shop;
        }
    });
    
    Q.UI.Container.extend("NumberDigit", {
        init: function(p){
            this._super(p, {
                w: 40,
                h: 60,
                border: 1,
                fill: "white"
            });
            this.on("inserted");
            this.on("selected");
        },
        selected: function(){
            this.container.p.menuButtons.forEach((button) => {button[0].p.fill = "white";});
            this.p.fill = "red";
        },
        changeLabel: function(label){
            this.p.textNumber.p.label = label + "";
        },
        inserted: function(){
            this.p.textNumber = this.insert(new Q.UI.Text({size:20, label: this.p.number + "", y: -8}));
        }
    });
    Q.UI.Container.extend("NumberCycler", {
        init: function(p){
            this._super(p, {
            });
            this.on("inserted");
            this.on("adjustedNumber");
        },
        adjustedNumber: function(state){
            let value = BG.MenuController.getValueFromNumberCycler(state);
            switch(state.menus[0].data.menu){
                case "investMenu":
                    let td = state.menus[0].currentCont.tileDetails;
                    let shop = Q.stage(2).options.shop;
                    let newCapital = shop.maxCapital - value;
                    if(newCapital < 0) {
                        newCapital = 0;
                        value = shop.maxCapital;
                    }
                    let newCost = BG.MapController.generateShopCost(shop.initialValue, shop.rank, shop.investedCapital + value, Q.MapController.getShopsOwnedInDistrict(state, shop).length);
                    td.valueText.text.p.label =  (shop.initialValue * shop.rank + shop.investedCapital + value) + " G";
                    td.pricesText.text.p.label = newCost + " G";
                    td.capitalText.text.p.label = newCapital + " G";
                    break;
                case "buyStockCyclerMenu":
                    
                    
                    
                    break;
            }
            
            
            
        },
        inserted: function(){
            this.p.menuButtons = [];
            let space = 40;
            for(let i = 0; i < this.p.digits; i++){
                this.p.menuButtons.push([this.insert(new Q.NumberDigit({x: i * space - (((this.p.digits - 1 ) / 2) * space), y: 0, number: 0}))]);
            }
        }
    });
    
    Q.UI.Container.extend("DealItem", {
        init: function(p){
            this._super(p, {
                w: 120,
                h: 50,
                fill: "grey"
            });
            let yPos = (BG.state.currentDeal[BG.state.currentDeal.currentSelection].length - 1) * 50;
            this.p.y = yPos;
            this.on("inserted");
        },
        inserted: function(){
            switch(this.p.type){
                case "shop":
                
                    break
                case "stock":
                
                    break;
                case "money":
                
                    break;
                case "item":
                    this.insert(new Q.UI.Text({label: this.p.item.name, y: -this.p.h / 4}));
                    break;
                case "setPiece":
                    this.insert(new Q.UI.Text({label: this.p.item, y: -this.p.h / 4}));
                    break;
            }
        }
    });
    Q.scene("dialogue", function(stage){
        let state = BG.state;
        let dialogueBox = stage.insert(new Q.StandardMenu({x: Q.width / 2 - 350, y:Q.height - 210, w: 700, h: 200}));
        let textArea = dialogueBox.insert(new Q.UI.Container({x:10, y:10, cx:0, cy:0, w:490, h:180}));
        let optionsArea = dialogueBox.insert(new Q.MenuButtonContainer({x:510, y:5, cx:0, cy:0, w:185, h:190}));
        state.menus[0].currentCont = optionsArea;
        if(state.menus[0].data.onLoadMenu) state.menus[0].data.onLoadMenu(stage);
        
        optionsArea.p.dialogue = state.menus[0].data.text;
        optionsArea.p.idx = 0;
        function processDialogue(){
            let dialogue = optionsArea.p.dialogue;
            let idx = optionsArea.p.idx;
            //stage.off("step", Q.MenuController, "acceptInteract");
            //stage.off("step", Q.MenuController, "acceptInputs");
            let item = dialogue[idx];
            idx ++;
            if(!item) alert("No Text Item!");
            
            if(textArea.p.text) textArea.p.text.destroy();
            textArea.p.text = textArea.insert(new Q.ScrollingText({label:item}));
            textArea.p.text.on("doneScrolling", processDialogue);
            state.menus[0].currentCont = textArea.p.text;
            
            if(!dialogue[idx + 1]){
                state.menus[0].currentCont = optionsArea;
                state.menus[0].currentCont.displayOptions(state.menus[0].data.onHoverOption);
            }
        }
        processDialogue();
        let selected = state.menus[0].data.selected  || [0, 0];
        state.menus[0].currentCont.p.menuButtons[selected[1]][selected[0]].hover();
    });
    
    Q.scene("menu", function(stage){
        let state = BG.state;
        let selected = state.menus[0].data.selected || [0, 0];
        let options = state.menus[0].itemGrid;
        let menuBox = stage.insert(new Q.UI.Container({x: 50, y:50, w: 195, h: options.length * 40 + 15 , cx:0, cy:0, fill: BG.OptionsController.options.menuColor, opacity:0.8, border:1}));
        
        let optionsArea = menuBox.insert(new Q.MenuButtonContainer({x:5, y:5, cx:0, cy:0, w:menuBox.p.w - 10, h:menuBox.p.h - 10, fill: BG.OptionsController.options.menuColor}));
        state.menus[0].currentCont = optionsArea;
        state.menus[0].currentCont.displayOptions();
        state.menus[0].currentCont.p.menuButtons[selected[1]][selected[0]].hover();
    });
    
    Q.scene("investMenu", function(stage){
        let shop = stage.options.shop;
        let digits = stage.options.cycler;
        let currentItem = stage.options.currentItem || [digits - 1, 0];
        let menuBox = stage.insert(new Q.StandardMenu({x: Q.width / 2 - 350, y: Q.height / 2 - 250, w: 700, h: 500}));
        menuBox.insert(new Q.StandardText({x: menuBox.p.w / 2, y: 30, label: "Invest in " + shop.name, align: "middle"}));
        stage.numberCycler = menuBox.insert(new Q.NumberCycler({digits: digits, x: menuBox.p.w / 2, y: 100}));
        stage.numberCycler.p.menuButtons[currentItem[0]][currentItem[1]].selected();
        BG.state.menus[0].currentCont = stage.numberCycler;
        let baseTileDetails = menuBox.insert(new Q.ShopStatusBox({x: 20, y: menuBox.p.h / 2 - 40, w: BG.c.boxWidth, h: BG.c.boxHeight, radius: 0, shopLoc: shop.loc, stage: stage}));
        BG.state.menus[0].currentCont.tileDetails = menuBox.insert(new Q.ShopStatusBox({x:menuBox.p.w - BG.c.boxWidth - 20, y: menuBox.p.h / 2 - 40, w: BG.c.boxWidth, h: BG.c.boxHeight, radius: 0, shopLoc: shop.loc, stage: stage}));
    });
    Q.scene("upgradeMenu", function(stage){
        console.log("showing upgrade menu");
    });
    Q.scene("auctionMenu", function(stage){
        let shop = stage.options.shop;
        let menuBox = stage.insert(new Q.StandardMenu({x: Q.width / 2 - 350, y: Q.height / 2 - 250, w: 700, h: 500}));
        let baseTileDetails = menuBox.insert(new Q.ShopStatusBox({x: menuBox.p.w / 4 + 10, y: menuBox.p.h / 4, w: BG.c.boxWidth, h: BG.c.boxHeight, radius: 0, shopLoc: shop.loc, stage: stage}));
    });
    Q.scene("districtMenu", function(stage){
        BG.state.mapMenu = stage.insert(new Q.MapMenu());
    });
    Q.scene("inputs", function(stage){
        stage.on("step", function(){
            if(!BG.Utility.isActiveUser() || BG.state.disableInputs) return;
            let inputs = {};
            if(Q.inputs["confirm"]){
                inputs["confirm"] = true;
                Q.inputs["confirm"] = false;
            }
            if(Q.inputs["back"]){
                inputs["back"] = true;
                Q.inputs["back"] = false;
            }
            if(Q.inputs["left"]){
                inputs["left"] = true;
                if(BG.preventMultipleInputs){
                    Q.inputs["left"] = false;
                }
            } else if(Q.inputs["right"]){
                inputs["right"] = true;
                if(BG.preventMultipleInputs){
                    Q.inputs["right"] = false;
                }
            }
            if(Q.inputs["up"]){
                inputs["up"] = true;
                if(BG.preventMultipleInputs){
                    Q.inputs["up"] = false;
                }
            } else if(Q.inputs["down"]){
                inputs["down"] = true;
                if(BG.preventMultipleInputs){
                    Q.inputs["down"] = false;
                }
            }
            for (var key in inputs) {
                if(inputs[key] === false) {
                    delete inputs[key];
                }
            }
            BG.socket.emit('inputted', inputs);
        });
    });
    
    Q.UI.Container.extend("DealMenu", {
        init: function(p){
            this._super(p, {
                x: Q.width / 2 - 350, 
                y: Q.height / 2 - 250, 
                w: 700,
                h: 500,
                cx:0, 
                cy:0, 
                fill: BG.OptionsController.options.menuColor, 
                opacity:0.8, 
                border:1
            });
            this.on("inserted");
        },
        inserted: function(){
            let dealWith = this.p.dealWith;
            let player = this.p.player;
            
            let reqBox = this.insert(new Q.StandardMenu({x: 10, y: 10, w: this.p.w / 2 - 15, h: this.p.h - 20, fill: "orange"}));
            reqBox.insert(new Q.UI.Text({x: reqBox.p.w / 2, y: 10, label: "Requested from " + dealWith.name}));
            let totalReqCont = reqBox.insert(new Q.UI.Container({x: reqBox.p.w / 2, y: 50, w: reqBox.p.w / 2, h: 50}));
            this.requestedG = totalReqCont.insert(new Q.UI.Text({label: "0G", x: 0, y: 0}));
            this.reqItemsList = reqBox.insert(new Q.MenuItemsList({x: reqBox.p.w / 2, y: 100, w: reqBox.p.w / 2, h: 50}));
            
            let tradeBox = this.insert(new Q.StandardMenu({x: 5 + this.p.w / 2, y: 10, w: this.p.w / 2 - 15, h: this.p.h - 20, fill: "orange"}));
            tradeBox.insert(new Q.UI.Text({x: tradeBox.p.w / 2, y: 10, label: "Items to trade"}));
            let totalTradeCont = tradeBox.insert(new Q.UI.Container({x: tradeBox.p.w / 2, y: 50, w: tradeBox.p.w / 2, h: 50}));
            this.tradeG = totalTradeCont.insert(new Q.UI.Text({label: "0G", x: 0, y: 0}));
            this.tradeItemsList = tradeBox.insert(new Q.MenuItemsList({x: tradeBox.p.w / 2, y: 100, w: tradeBox.p.w / 2, h: 50}));
        },
        updateG: function(){
            if(BG.state.currentDeal.currentSelection === "requested"){
                this.requestedG.p.label = BG.state.currentDeal.requestedG + "G";
            } else {
                this.tradeG.p.label = BG.state.currentDeal.tradeG + "G";
            }
        },
        addToDeal: function(props){
            if(BG.state.currentDeal.currentSelection === "requested"){
                this.reqItemsList.addItem(props);
                this.requestedG.p.label = BG.state.currentDeal.requestedG + "G";
            } else {
                this.tradeItemsList.addItem(props);
                this.tradeG.p.label = BG.state.currentDeal.tradeG + "G";
            }
        },
        removeFromDeal: function(itemIdx){
            if(BG.state.currentDeal.currentSelection === "requested"){
                this.reqItemsList.removeItem(itemIdx);
            } else {
                this.tradeItemsList.removeItem(itemIdx);
            }
        }
    });
    
    Q.UI.Container.extend("MenuItemsList", {
        init: function(p){
            this._super(p, {
                menuButtons:[]
            });
        },
        addItem: function(props){
            this.p.menuButtons.push(this.insert(new Q.DealItem(props)));
        },
        removeItem: function(idx){
            this.p.menuButtons.splice(idx, 1).destroy();
        }
    });
    Q.scene("dealMenu", function(stage){
        BG.state.dealMenu = stage.insert(new Q.DealMenu({
            dealWith: BG.GameController.getPlayer(BG.state, stage.options.player), 
            player: BG.state.turnOrder[0]
        }));
    });
    
    Q.scene("buyStockCyclerMenu", function(stage){
        let digits = stage.options.cycler;
        let currentItem = stage.options.currentItem || [digits - 1, 0];
        let district = BG.state.map.districts[stage.options.district];
        let menuBox = stage.insert(new Q.StandardMenu({x: Q.width / 2 - 350, y: Q.height / 2 - 250, w: 700, h: 500}));
        menuBox.insert(new Q.StandardText({x: menuBox.p.w / 2, y: 30, label: "Buy stock in " + district.name, align: "middle"}));
        stage.numberCycler = menuBox.insert(new Q.NumberCycler({digits: digits, x: menuBox.p.w / 2, y: 100}));
        stage.numberCycler.p.menuButtons[currentItem[0]][currentItem[1]].selected();
        BG.state.menus[0].currentCont = stage.numberCycler;
    });
    
    Q.scene("sellStockCyclerMenu", function(stage){
        let digits = stage.options.cycler;
        let currentItem = stage.options.currentItem || [digits - 1, 0];
        let district = BG.state.map.districts[stage.options.district];
        let menuBox = stage.insert(new Q.StandardMenu({x: Q.width / 2 - 350, y: Q.height / 2 - 250, w: 700, h: 500}));
        menuBox.insert(new Q.StandardText({x: menuBox.p.w / 2, y: 30, label: "Sell stock in " + district.name, align: "middle"}));
        stage.numberCycler = menuBox.insert(new Q.NumberCycler({digits: digits, x: menuBox.p.w / 2, y: 100}));
        stage.numberCycler.p.menuButtons[currentItem[0]][currentItem[1]].selected();
        BG.state.menus[0].currentCont = stage.numberCycler;
    });
    
    //Displays how much stock each player has in each district in table format.
    Q.scene("checkStockMenu", function(stage){
        let players = BG.state.players;
        let districts = BG.state.map.districts;
        
        let menuBox = stage.insert(new Q.StandardMenu({x: Q.width / 2 - 350, y: Q.height / 2 - 250, w: 700, h: 500}));
        let table = menuBox.insert(new Q.UI.Container({x: 10, y: 10, w: menuBox.p.w - 20, h: menuBox.p.h - 20, fill: "grey", cx: 0, cy:0}));        
        let sx = 75;
        let sy = 10;
        let tw = 100;
        let th = 80;
        table.insert(new Q.UI.Text({label: "Mx. ST", x: sx + tw, y: sy}));
        table.insert(new Q.UI.Text({label: "Avail.", x: sx + tw * 2, y: sy}));
        table.insert(new Q.UI.Text({label: "Value", x: sx + tw * 3, y: sy}));
        for(let i = 0; i < players.length; i++){
            table.insert(new Q.Sprite({sheet: "player-icon-1", frame:0, x: sx + tw * (4 + i), y: sy * 2}));
        }
        
        
        for(let i = 0; i < districts.length; i++){
            let d = districts[i];
            let colY = sy + th * (i + 1);
            table.insert(new Q.UI.Text({label: d.name, x: sx, y: colY}));
            table.insert(new Q.UI.Text({label: "" + d.totalStock, x: sx + tw, y: colY}));
            table.insert(new Q.UI.Text({label: "" + d.stockAvailable, x: sx + tw * 2, y: colY}));
            table.insert(new Q.UI.Text({label: "" + d.stockPrice, x: sx + tw * 3, y: colY}));
            //Create a row for each district
            for(let j = 0; j < players.length; j++){
                let p = players[j];
                //Create an entry for each player starting after the stock cost column.
                table.insert(new Q.UI.Text({label: "" + p.stocks[i].num, x: sx + tw * (j + 4), y: colY}));
            }
        }
    });
    
    
    
    Q.scene("setsMenu", function(stage){
        stage.insert(new Q.SetsMenu({player: BG.state.turnOrder[0]})); 
    });
    Q.scene("mapMenu", function(stage){
        BG.state.mapMenu = stage.insert(new Q.MapMenu({player: BG.state.turnOrder[0]}));
    });
    
    Q.scene("hud", function(stage){
        let tileDetails = BG.GameController.tileDetails = stage.insert(new Q.ShopStatusBox({x: Q.width - BG.c.boxWidth - 50, y: 120, w: BG.c.boxWidth, h: BG.c.boxHeight, radius: 0, shopLoc: BG.state.turnOrder[0].loc, stage: stage}));

        //Create the standings
        let standingsCont = stage.insert(new Q.StandardMenu({w: BG.c.boxWidth, h: BG.c.boxHeight, x: Q.width - BG.c.boxWidth - 50, y: BG.c.boxHeight + 150}));

        for(let i = 0; i < BG.state.turnOrder.length; i++){
            let player = BG.state.turnOrder[i];
            let playerCont = standingsCont.insert(new Q.UI.Container({x: 5, y: 5 + i * ~~((standingsCont.p.h - 5) / 4), w: standingsCont.p.w - 10, h: standingsCont.p.h / 4 - 5, fill: "white", cx:0, cy:0 }));
            let playerIconContainer = playerCont.insert(new Q.UI.Container({x: 5 + 20, y: playerCont.p.h / 2, w: playerCont.p.h, h: playerCont.p.h, radius:3,  fill: player.color/*"transparent"*/}));
            let playerIcon = playerIconContainer.insert(new Q.Sprite({x: 0, y: 0, sheet: "player-icon-1", frame:0}));
            let playerName = playerCont.insert(new Q.SmallText({x: 60, y: 5, label: player.name, cx:0, cy:0, color: "#111", align: "left"}));
            let playerMoney = playerCont.insert(new Q.SmallText({x: 60, y: 25, label:player.money + " G", cx:0, cy:0, color: "#111", align: "left"}));
            player.sprite.addEventListener("moneyChanged", () => {
                playerMoney.p.label = player.money + " G";
            });
            let playerNetValue = playerCont.insert(new Q.SmallText({x: 280, y: 25, label: "NV " + player.netValue, cx: 0, cy:0, color: "#111", align: "right"}));
            player.sprite.addEventListener("netValueChanged", () => {
                playerNetValue.p.label = "NV " + player.netValue;
            });
        }        
    });
    
    
    
    
    
    
};
};

if(typeof Quintus === 'undefined') {
  module.exports = quintusObjects;
} else {
  quintusObjects(Quintus);
}
