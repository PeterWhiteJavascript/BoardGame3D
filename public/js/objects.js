var quintusObjects = function(Quintus) {
"use strict";
//This is all UI objects client side
Quintus.Objects = function(Q) {
    
    Q.component("scalable", {
        added: function(){
            this.entity.on("resize", this, "resize");
            this.resize();
        },
        resize: function(){
            this.entity.p.scale = BG.Utility.getScaleFromResolution();
        }
    });
    Q.component("centered", {
        added: function(){
            this.entity.on("center", this, "center");
            this.center();
        },
        center: function(){
            this.entity.p.x = Q.width / 2;
            this.entity.p.y = Q.height / 2;
        }
    });
    
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
                menuButtons: [],
                buttonH: 35,
                buttonSpacing: 5
            });
            this.p.startY = this.p.y;
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
        displayOptions: function(onHover, maxShown, textLines){
            let options = BG.state.menus[0].itemGrid;
            let cursor = new Q.Cursor();
            this.p.menuButtons = [];
            this.p.maxShown = maxShown;
            let menuButtonCont = this.p.menuButtonCont = this.insert(new Q.UI.Container());
            for(let i = 0; i < options.length; i++){
                let hidden = maxShown && i >= maxShown ? true : false;
                this.p.menuButtons[i] = [];
                for(let j = 0; j < options[i].length; j++){
                    let button = menuButtonCont.insert(new Q.MenuButton({x: this.p.buttonSpacing, y: this.p.buttonSpacing + this.p.buttonH * (i + textLines), w:this.p.w - this.p.buttonSpacing * 2, hidden: hidden, label: options[i][j][0], func: options[i][j][1], props:options[i][j][2], cursor: cursor}));
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
            this.hoverButton(this.p.selected);
        },
        hoverButton: function(coord){
            let buttons = this.p.menuButtons;
            buttons[coord[1]][coord[0]].hover();
            if(this.p.maxShown){
                //Set the y position based on which item is selected compared to the maxShown property.
                this.p.menuButtonCont.p.y = Math.min(0, -((this.p.buttonH) * (coord[1] - (this.p.maxShown - 1))));
                this.p.menuButtons.forEach((button) => {
                    button[0].checkOverflow();
                });
            }
            BG.AudioController.playSound("option-hover");
            this.p.prevCoord = coord;
        }
    });
    Q.UI.Container.extend("MenuButton", {
        init: function(p){
            this._super(p, {
                w: 140,
                h: 30,
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
            for(let i = 0; i < this.container.container.p.menuButtons.length; i++){
                for(let j = 0; j < this.container.container.p.menuButtons[i].length; j++){
                    this.container.container.p.menuButtons[i][j].dehover();
                }
            }
            this.setFill();
            
            this.stage.insert(this.p.cursor, this.container.container);
            this.p.cursor.p.x = this.p.x + this.p.w - 15;
            this.p.cursor.p.y = this.p.y + this.p.h / 2;
            this.p.cursor.refreshMatrix();
            this.p.radius = this.p.defaultRadius / 2;
            this.show();
            this.trigger("hover");
        },
        addText:function(){
            let size = this.p.size || 14;
            this.insert(new Q.UI.Text({label: this.p.label, x: 10, y: this.p.h / 2 - size / 2, size: size || 14, align: "left"}));
        },
        checkOverflow: function(){
            if(this.container.p.y * -1 > this.p.y || this.container.p.y * -1 + this.container.container.p.maxShown * this.p.h < this.p.y){
                this.hide();
            } else {
                this.show();
            }
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
    Q.Sprite.extend("SpriteStandardMenu", {
        init: function(p){
            this._super(p, {
                cx:0, cy:0,
                asset: "images/ui/district-background.png"
            });
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
            //this.on("inserted");
        },
        //Could be used to create a background image for this container.
        inserted: function(){
            this.insert(new Q.SpriteStandardMenu({w: this.p.w, h: this.p.h}));
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
                    //setImagesCont.insert(new Q.UI.Text({x: xLoc + 20, y: 10, label: (player.setPieces[sets[i].items[j]] || 0) + ""}));
                    //TODO: find sets from items
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
    Q.Sprite.extend("StockPieChart", {
        init: function(p){
            this._super(p, {
                w: 64,
                h: 64
            });
            this.p.x -= this.p.w / 2;
            this.p.y -= this.p.h / 2;
        },
        displayChart: function(data){
            if(this.p.stockNums) this.p.stockNums.forEach((n) => {n.destroy();});
            this.p.stockNums = [];
            let players = BG.state.turnOrder;
            let totalPi = Math.PI * 2;
            let leftoverPi = totalPi;
            let angles = [];
            let degrees = [];
            let points = [];
            let stockAvail = [];
            let colors = [];
            players.forEach((player, i) => {
                let num = player.p.stocks[data.id];
                if(num){
                    stockAvail.push(num);
                    let percentTotal = num / data.totalStock;
                    let amount = totalPi * percentTotal;
                    angles.push(amount);
                    leftoverPi -= amount;
                    colors.push(player.p.color);
                    //Between two points.
                    let p1 = 0;
                    if(i !== 0) p1 = points[points.length - 1];
                    let p2 = percentTotal * 360;
                    degrees.push(p1 + (p1 + p2) / 2 + 90);
                    points.push(p2);
                }
            });
            this.p.angles = angles;
            this.p.colors = colors;
            if(leftoverPi){
                this.p.angles.push(leftoverPi);
                if(!points.length){
                    degrees.push(0);
                } else {
                    let p1 = points[points.length - 1];
                    let p2 = 360;
                    degrees.push((p1 + p2) / 2 + 90);
                }
                this.p.colors.push("white");
                stockAvail.push(data.stockAvailable);
            }
            
            let radius = this.p.w / 4;
            let centerX = this.p.w / 2;
            let centerY = this.p.h / 2;
            for(let i = 0; i < stockAvail.length; i++){
                let x = radius * Math.sin(degrees[i] * Math.PI / 180) + centerX;
                let y = -radius * Math.cos(degrees[i] * Math.PI / 180) + centerY;
                this.p.stockNums.push(this.container.insert(new Q.UI.Text({label: stockAvail[i] + "", x: this.p.x + x, y: this.p.y + y - 6, size: 12})));
            }
        },
        draw: function(ctx){
            // Colors
            var colors = this.p.colors;
            
            // List of Angles
            var angles = this.p.angles;
            
            // Temporary variables, to store each arc angles
            var beginAngle = 0;
            var endAngle = 0;
            
            // Iterate through the angles
            for(var i = 0; i < angles.length; i = i + 1) {
                // Begin where we left off
                beginAngle = endAngle;
                // End Angle
                endAngle = endAngle + angles[i];

                ctx.beginPath();
                // Fill color
                ctx.fillStyle = colors[i % colors.length];

                // Same code as before
                ctx.moveTo(this.p.w / 2, this.p.h / 2);
                ctx.arc(this.p.w / 2, this.p.h / 2, this.p.w / 2, beginAngle, endAngle);
                ctx.lineTo(this.p.w / 2, this.p.h / 2);
                ctx.stroke();

                // Fill
                ctx.fill();
            }
        }
    });
    Q.UI.Container.extend("MapMenu", {
        init: function(p){
            this._super(p, {
                x: Q.width / 2,
                y: Q.height/ 2,
                w: 1200,
                h: 848
               // border:1
            }); 
            this.add("scalable, centered");
            this.on("inserted");
        },
        inserted: function(){
            let map = BG.state.map;
            this.insert(new Q.Sprite({asset: "images/ui/district-background.png", w: this.p.w, h: this.p.h, opacity: 0.95}));
            
            let maxX = BG.state.map.maxX;
            let maxY = BG.state.map.maxY;
            let tileW = this.p.w / maxX;
            let tileH = this.p.h / maxY;
            //Use a tile size so that the map always fits properly
            let tileSize = Math.min(tileW, tileH);
            let distance = tileSize * 0.75;
            let fontSize = tileSize / 2;
            //Pulse the tile that the player is on
            let player = this.p.player;
            this.miniTiles = [];
            for(let i = 0; i < map.tiles.length; i++){
                let tile = map.tiles[i];
                let miniTile = this.insert(new Q.UI.Container({x: (tile.loc[0] - map.centerX) * distance + tileSize, y: (tile.loc[1] - map.centerY) * distance + tileSize, w: tileSize, h: tileSize, fill: "white", radius: 1, border: 4, stroke: "black", district: tile.district}));
                miniTile.add("tween");
                switch(tile.type){
                    case "main":
                        miniTile.insert(new Q.UI.Text({label: "H", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                    case "vendor":
                        miniTile.insert(new Q.UI.Text({label: "V", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                    case "itemshop":
                        miniTile.insert(new Q.UI.Text({label: "I", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                    case "shop":
                        if(tile.ownedBy){
                            miniTile.p.fill = tile.ownedBy.p.color;
                        }
                        miniTile.p.stroke = BG.state.map.districts[tile.district].color;
                        break;
                    case "roll-again":
                        miniTile.insert(new Q.UI.Text({label: "R", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                    case "toll":
                        miniTile.insert(new Q.UI.Text({label: "T", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                    case "warp":
                        miniTile.insert(new Q.UI.Text({label: "W", size: fontSize, y: -miniTile.p.h / 4}));
                        break
                    case "bingo":
                        miniTile.insert(new Q.UI.Text({label: "B", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                    case "stockbroker":
                        miniTile.insert(new Q.UI.Text({label: "S", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                    case "interest":
                        miniTile.insert(new Q.UI.Text({label: "IN", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                    case "arcade":
                        miniTile.insert(new Q.UI.Text({label: "AR", size: fontSize, y: -miniTile.p.h / 4}));
                        break;
                }
                //Uncomment for tile coords
                //miniTile.insert(new Q.UI.Text({label: tile.loc[0] + ", " + tile.loc[1], size: 8, y: 16}));
                if(tile.district >= 0){
                    miniTile.insert(new Q.UI.Text({label: tile.district + "", size: fontSize, y: -miniTile.p.h / 4, x: 0}));
                }
                if(player && BG.Utility.locsMatch(player.p.loc, tile.loc)){
                    this.pulseTile(miniTile);
                }
                this.miniTiles.push(miniTile);
            }
            let initialDistrict = 0;//BG.MapController.getTileAt(BG.state, player.p.loc);
            
            let distContW = this.p.w * 0.75;
            let distContH = 90;
            this.districtData = this.insert(new Q.UI.Container({x: 0,  y: -this.p. h / 2 + distContH, w: distContW, h:distContH}));
            let textSize = 26;
            let smallTextSize = 20;
            let sixth = this.districtData.p.w / 6;
            
            //Name
            this.districtData.name = this.districtData.insert(new Q.UI.Text({label: "", x: -this.districtData.p.w / 2 + sixth, y: -textSize / 2, size: textSize, family: "Helvetica Neue"}));
            //Rank (stars) (todo: make into sprite)
            this.districtData.rank = this.districtData.insert(new Q.UI.Text({label: "", x:  -this.districtData.p.w / 2 + sixth * 2, y: -textSize, size: textSize, family: "Helvetica Neue"}));
            //Value
            this.districtData.value = this.districtData.insert(new Q.UI.Text({label: "", x:  -this.districtData.p.w / 2 + sixth * 2, y: 0, size: textSize, family: "Helvetica Neue"}));
            //Num Of Shops
            this.districtData.shopIcon = this.districtData.insert(new Q.Sprite({sheet:"tile-structure-" + 3, x: -this.districtData.p.w / 2 + sixth * 3, y: 0}));
            let shopCont = this.districtData.insert(new Q.UI.Container({x: -this.districtData.p.w / 2 + sixth * 3 + this.districtData.shopIcon.p.w / 2 + 15, y: -textSize, border: 2, radius: 13, w: 26, h: 26, fill:"transparent"}));
            this.districtData.shopNum = shopCont.insert(new Q.UI.Text({label: "", x: 0, y: -smallTextSize / 2, size: smallTextSize, family: "Helvetica Neue", cy:0}));
            //Special Tiles? Only add this if the district actually includes these tiles. Right now, only shops are included.
            
            //Stocks Owned Pie Chart
            this.districtData.pieChart = this.districtData.insert(new Q.StockPieChart({x: -this.districtData.p.w / 2 + sixth * 4, y: 0, district: BG.state.map.districts[initialDistrict]}));
            //Stocks bought ratio (bought / max)
            this.districtData.stockRatio = this.districtData.insert(new Q.UI.Text({label: "", x: -this.districtData.p.w / 2 + sixth * 5, y:-textSize, size: textSize, family: "Helvetica Neue"}));
            //Stock Price
            this.districtData.stockPrice = this.districtData.insert(new Q.UI.Text({label: "", x: -this.districtData.p.w / 2 + sixth * 5, y:0, size: textSize, family: "Helvetica Neue"}));
            
            //this.stage.insert(new Q.UI.Text({x: this.p.w / 2, y: this.p.h / 2 - bgImgH / 2 + 65, label: "Select a district", w: this.p.w, h: this.p.h, family: "Helvetica Neue"}));
        },
        displayDistrictData: function(district){
            let data = BG.state.map.districts[district];
            this.districtData.name.p.label = data.name;
            let rankString = "";
            for(let i = 0; i < data.rank; i++){rankString += "* ";};
            this.districtData.rank.p.label = rankString;
            this.districtData.value.p.label = ""+data.value + "G";
            this.districtData.shopNum.p.label = ""+data.tiles.length;
            this.districtData.pieChart.displayChart(data);
            this.districtData.stockRatio.p.label = data.stockAvailable + " / " + data.totalStock;
            this.districtData.stockPrice.p.label = ""+data.stockPrice + "G"; 
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
                            this.shopBackground.p.fill = shop.ownedBy.p.color;
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
                        this.districtCont.text.p.label = shop.name;

                        //this.shopIcon.p.sheet = (shop.exchange[1].toLowerCase()) + "-vendor";
                        
                        break;
                    case "itemshop":
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Item Shop";

                        this.shopIcon.p.sheet = "tile-structure-4";
                        break;
                    case "toll":
                        
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Toll";

                        //this.shopIcon.p.sheet = "home-base-1";
                        break;
                    case "roll-again":
                        
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Extra Roll";

                        //this.shopIcon.p.sheet = "home-base-1";
                        break;
                    case "warp":
                    
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Warp";
                        break;
                    case "bingo":
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Bingo";

                        break;
                    case "stockbroker":
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Stockbroker";
                        
                        break;
                    case "interest":
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Interest";
                        break;
                    case "arcade":
                        
                        this.shopTextCont.hide();
                        this.shopRankContainer.hide();

                        this.districtCont.p.fill = "#AAA";
                        this.districtCont.text.p.label = "Arcade";
                        break;
                }
            }
            this.shop = shop;
        }
    });
    
    Q.UI.Container.extend("NumberDigit", {
        init: function(p){
            this._super(p, {
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
    Q.UI.Container.extend("NumberCyclerMenu", {
        init: function(p){
            this._super(p, {
                x: Q.width / 2,
                y: Q.height / 2,
                w: 350, 
                h: 200,
                fill: "black",
                opacity: 0.9
            });
            this.on("inserted");
            this.on("adjustedNumber");
        },
        inserted: function(){
            let headingText = this.insert(new Q.StandardText({x: 0, y: -this.p.h / 2 + 10, label: " ", align: "center"}));
            let cycler = this.insert(new Q.NumberCycler({digits: this.p.digits, x: 0, y: 0}));
            cycler.p.menuButtons[this.p.select[0]][this.p.select[1]].selected();
            BG.state.menus[0].currentCont = cycler;
            switch(this.p.type){
                case "sellStock":
                    headingText.p.label = "Sell stock in " + this.p.district.name;
                    let have = this.insert(new Q.StandardText({x: -this.p.w / 2 + 10, y: this.p.h / 2 - 25, stocksOwned: this.p.stocksOwned, label: "Have: " + this.p.stocksOwned, align: "left"}));
                    this.insert(new Q.StandardText({x: this.p.w / 2 - 10, y: this.p.h / 2 - 25, label: "Price: " + this.p.district.stockPrice + "G", align: "right"}));
                    let amount = this.insert(new Q.StandardText({x: 0, y: 50, stockPrice: this.p.district.stockPrice, label: "0G", align: "center", size: 30}));
                    
                    cycler.on("adjustedNumber", function(){
                        let num = Math.min(BG.MenuController.getValueFromNumberCycler(BG.state), have.p.stocksOwned);
                        have.p.label = "Have: " + (have.p.stocksOwned - num);
                        amount.p.label = (num * amount.p.stockPrice) + "G";
                    });
                    break;
            }
            
        }
    });
    
    Q.UI.Container.extend("NumberCycler", {
        init: function(p){
            this._super(p, {
                digitWidth: 40,
                digitHeight: 60
            });
            this.on("inserted");
            this.on("adjustedNumber");
            this.p.w = this.p.digitWidth * this.p.digits;
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
                    let newCost = BG.MapController.generateShopCost(shop.initialValue, shop.rank, shop.investedCapital + value, BG.MapController.getShopsOwnedInDistrict(state, shop).length);
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
            for(let i = 0; i < this.p.digits; i++){
                this.p.menuButtons.push([this.insert(new Q.NumberDigit({x: i * this.p.digitWidth - (((this.p.digits - 1 ) / 2) * this.p.digitWidth), y: 0, number: 0, w: this.p.digitWidth, h: this.p.digitHeight}))]);
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
        let optionsArea = dialogueBox.insert(new Q.MenuButtonContainer({x:510, y:5, cx:0, cy:0, w:185, h:190, selected: state.menus[0].data.selected || [0, 0]}));
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
            state.menus[0].currentCont = textArea.p.text[0];
            
            let maxShown = 5;
            if(!dialogue[idx + 1]){
                state.menus[0].currentCont = optionsArea;
                state.menus[0].currentCont.displayOptions(state.menus[0].data.onHoverOption, maxShown, stage.options.textLines || 0);
            }
        }
        processDialogue();
    });
    
    Q.scene("menu", function(stage){
        let state = BG.state;
        let selected = state.menus[0].data.selected || [0, 0];
        let options = state.menus[0].itemGrid;
        let menuProps = stage.options;
        let optsNum = options.length + (menuProps.textLines || 0);
        let menuBox = stage.insert(new Q.UI.Container({x: menuProps.boxX || 50, y:menuProps.boxY || 50, w: menuProps.boxW || 195, h: optsNum * 35 + 15 , cx:0, cy:0, fill: BG.OptionsController.options.menuColor, opacity:0.8, border:1}));
        
        let optionsArea = menuBox.insert(new Q.MenuButtonContainer({x:5, y:5, cx:0, cy:0, w:menuBox.p.w - 10, h:menuBox.p.h - 10, fill: BG.OptionsController.options.menuColor, selected: state.menus[0].data.selected || [0, 0]}));
        
        if(menuProps.text){
            optionsArea.insert(new Q.UI.Text({label: menuProps.text, x:optionsArea.p.w / 2, y: 5, cx:0, cy:0, color: "white"}));
        }
        state.menus[0].currentCont = optionsArea;
        state.menus[0].currentCont.displayOptions(false, false, menuProps.textLines || 0);
        state.menus[0].currentCont.p.menuButtons[selected[1]][selected[0]].hover();
    });
    
    Q.scene("investMenu", function(stage){
        let shop = stage.options.shop;
        let digits = stage.options.cycler;
        let currentItem = stage.options.currentItem || [digits - 1, 0];
        let menuBox = stage.insert(new Q.StandardMenu({x: Q.width / 2 - 350, y: Q.height / 2 - 250, w: 700, h: 500}));
        menuBox.insert(new Q.StandardText({x: menuBox.p.w / 2, y: 30, label: "Invest in " + shop.name, align: "center"}));
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
        menuBox.insert(new Q.StandardText({x: menuBox.p.w / 2, y: 30, label: "Buy stock in " + district.name, align: "center"}));
        stage.numberCycler = menuBox.insert(new Q.NumberCycler({digits: digits, x: menuBox.p.w / 2, y: 100}));
        stage.numberCycler.p.menuButtons[currentItem[0]][currentItem[1]].selected();
        BG.state.menus[0].currentCont = stage.numberCycler;
    });
    
    //Displays how much stock each player has in each district in table format.
    Q.scene("checkStockMenu", function(stage){
        let players = BG.state.players;
        let districts = BG.state.map.districts;
        
        let menuBox = stage.insert(new Q.StandardMenu({x: Q.width / 2 - 350, y: Q.height / 2 - 250, w: 700, h: 600}));
        let table = menuBox.insert(new Q.UI.Container({x: 10, y: 10, w: menuBox.p.w - 20, h: menuBox.p.h - 20, fill: "grey", cx: 0, cy:0}));        
        let sx = 75;
        let sy = 10;
        let tw = 100;
        let th = 40;
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
                table.insert(new Q.UI.Text({label: "" + p.p.stocks[i], x: sx + tw * (j + 4), y: colY}));
            }
        }
    });
    
    
    
    Q.scene("setsMenu", function(stage){
        stage.insert(new Q.SetsMenu({player: BG.state.turnOrder[0]})); 
    });
    Q.scene("hud", function(stage){
        let tileDetails = BG.GameController.tileDetails = stage.insert(new Q.ShopStatusBox({x: Q.width - BG.c.boxWidth - 50, y: 120, w: BG.c.boxWidth, h: BG.c.boxHeight, radius: 0, shopLoc: BG.state.turnOrder[0].p.loc, stage: stage}));

        //Create the standings
        let standingsCont = stage.insert(new Q.StandardMenu({w: BG.c.boxWidth, h: BG.c.boxHeight, x: Q.width - BG.c.boxWidth - 50, y: BG.c.boxHeight + 150}));

        for(let i = 0; i < BG.state.turnOrder.length; i++){
            let player = BG.state.turnOrder[i];
            let playerCont = standingsCont.insert(new Q.UI.Container({x: 5, y: 5 + i * ~~((standingsCont.p.h - 5) / 4), w: standingsCont.p.w - 10, h: standingsCont.p.h / 4 - 5, fill: "white", cx:0, cy:0 }));
            let playerIconContainer = playerCont.insert(new Q.UI.Container({x: 5 + 20, y: playerCont.p.h / 2, w: playerCont.p.h, h: playerCont.p.h, radius:3,  fill: player.p.color/*"transparent"*/}));
            let playerIcon = playerIconContainer.insert(new Q.Sprite({x: 0, y: 0, sheet: "player-icon-1", frame:0}));
            let playerName = playerCont.insert(new Q.SmallText({x: 60, y: 5, label: player.p.name, cx:0, cy:0, color: "#111", align: "left"}));
            let playerMoney = playerCont.insert(new Q.SmallText({x: 60, y: 25, label:player.p.money + " G", cx:0, cy:0, color: "#111", align: "left"}));
            player.sprite.addEventListener("moneyChanged", () => {
                playerMoney.p.label = player.p.money + " G";
            });
            let playerNetValue = playerCont.insert(new Q.SmallText({x: 280, y: 25, label: "NV " + player.p.netValue, cx: 0, cy:0, color: "#111", align: "right"}));
            player.sprite.addEventListener("netValueChanged", () => {
                playerNetValue.p.label = "NV " + player.p.netValue;
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
