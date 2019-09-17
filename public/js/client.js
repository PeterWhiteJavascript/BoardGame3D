let clientSide = function(){
    return {
        OptionsController: {
            toggleBoolOpt:function(opt){
                if(this.options[opt]) this.options[opt] = false;
                else this.options[opt] = true;

                if(opt === "musicEnabled"){
                    exports.audioController.checkMusicEnabled();
                }
            },
            adjustSound:function(){

            }
        },
        AudioController: {
            currentMusic:"",
            music: {},
            sound: {},
            playMusic:function(music, callback){
                if(!music) music = this.currentMusic || this.lastMusic;
                music += ".mp3";
                this.lastMusic = this.currentMusic;
                if(BG.OptionsController.options.musicEnabled){
                    this.stopMusic(this.currentMusic);
                    if(!BG.AudioController.music[music]){
                        BG.AudioController.music[music] = new THREE.Audio( BG.AudioController.audioListener );
                        BG.AudioController.audioLoader.load("audio/bgm/" + music, function( buffer ) {
                            BG.AudioController.music[music].setBuffer( buffer );
                            BG.AudioController.music[music].setLoop(true);
                            BG.AudioController.music[music].setVolume( BG.OptionsController.options.musicVolume);
                            BG.AudioController.music[music].play();
                            if(callback){callback();}
                        });
                    } else {
                        BG.AudioController.music[music].setVolume( BG.OptionsController.options.musicVolume);
                        BG.AudioController.music[music].play();
                    }
                } else {
                    if(callback){callback();}
                }
                this.currentMusic = music;
            },
            stopMusic:function(music){
                if(!music) music = this.currentMusic;
                this.lastMusic = this.currentMusic;
                if(BG.AudioController.music[music]){
                    BG.AudioController.music[music].stop();
                }
                this.currentMusic = false;
            },
            stopSound: function(sound){
                if(BG.AudioController.sound[sound]){
                    BG.AudioController.sound[sound].stop();
                }
            },
            checkSoundIsPlaying: function(sound){
                //TODO: search through the currently playing sounds to see if it's playing.
                
                return false;
            },
            //Used when toggling options
            checkMusicEnabled:function(){
                if(BG.OptionsController.options.musicEnabled){
                    this.playMusic();
                } else {
                    this.lastMusic = this.currentMusic;
                    this.stopMusic();
                    this.currentMusic = false;
                }
            },
            playSound:function(sound, callback){
                if(BG.OptionsController.options.soundEnabled){
                    if(sound.length){
                        if(!BG.AudioController.sound[sound]){
                            BG.AudioController.sound[sound] = new THREE.Audio( BG.AudioController.audioListener );
                            BG.AudioController.audioLoader.load("audio/sfx/" + sound + ".mp3", function(buffer){
                                BG.AudioController.sound[sound].setBuffer( buffer );
                                BG.AudioController.sound[sound].setVolume( BG.OptionsController.options.soundVolume);
                                BG.AudioController.sound[sound].play();   
                                BG.AudioController.sound[sound].onEnded(callback);
                            });
                        } else {
                            BG.AudioController.sound[sound].setVolume( BG.OptionsController.options.soundVolume);
                            BG.AudioController.sound[sound].play();   
                            BG.AudioController.sound[sound].onEnded(callback);
                        }
                    }
                }
            },
            interruptMusic:function(music, callback){
                BG.AudioController.music.pause();
                this.playSound(music, callback);
            },
            changeMusicVolume:function(value){
                if(!music) music = this.currentMusic;
                BG.AudioController.music.setVolume(value);
            }
        },
        
        DisplayController: {
            setMaterial: function(object, materialName, newMaterial, props){
                object.traverse( function ( child ) {
                    if ( child instanceof THREE.Mesh && Array.isArray(child.material)) {
                        let mat = child.material.map(function(m){ return m.clone(); });
                        let idx = mat.findIndex((m) => {return m.name === materialName;});
                        mat[idx].map = newMaterial;
                        newMaterial.anisotropy = 0;
                        newMaterial.magFilter = THREE.NearestFilter;
                        newMaterial.minFilter = THREE.NearestFilter;
                        if(props){
                            let keys = Object.keys(props);
                            for(let i = 0; i < keys.length; i++){
                                mat[idx][keys[i]] = props[keys[i]];
                            }
                        }
                        child.material = mat;
                    }
                });
            },
            createText: function(props){
                let font = BG.FontsData["helvetiker_bold.typeface.json"];

                let textMaterial =  new THREE.MeshBasicMaterial( {
                        color: props.color,
                        transparent: true,
                        opacity: 1,
                        side: THREE.DoubleSide
                } );

                let geometry = new THREE.ShapeBufferGeometry( font.generateShapes( props.message, props.size) );

                geometry.computeBoundingBox();
                
                if(props.drawFrom === "right"){
                    geometry.translate( -geometry.boundingBox.max.x, 0, 0 );
                } else if(props.drawFrom === "middle"){
                    geometry.translate( -geometry.boundingBox.max.x / 2, 0, 0 );
                } else {
                    geometry.translate( 0, 0, 0 );
                }

                let text = new THREE.Mesh( geometry, textMaterial );

                text.updateMatrix();
                text.geometry.applyMatrix( text.matrix );
                text.position.set( props.position.x, props.position.y, props.position.z);
                text.rotation.set( Math.PI / - 2, 0, 0 );
                text.updateMatrix();
                return text;
            },
            //Display the map client side.
            displayMap: function(data){
                BG.AudioController.playMusic(data.mapData.map.bgm); 
                THREE.Cache.enabled = true;
                var camera = BG.camera;
                var scene, renderer, controls;
                var canvas = document.querySelector("#three-canvas");
                function setup() {
                    setupThreeJS();
                    setupWorld();
                    requestAnimationFrame(function animate() {
                        requestAnimationFrame(animate);
                        renderer.render(scene, camera);
                    });
                }
                function setupThreeJS() {
                    BG.scene = scene = new THREE.Scene();
                    
                    renderer = new THREE.WebGLRenderer({canvas: canvas});
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    renderer.shadowMap.enabled = true; //Shadow
                    renderer.shadowMapSoft = true; // Shadow
                    renderer.shadowMap.type = THREE.PCFShadowMap; //Shadow
                    $("#three-container").append(renderer.domElement);
                    renderer.setClearColor (0x000000, 1);
                }
                function setupWorld() {
                    
                    let gameData = BG.state = BG.setUpGameState({
                        mapData:data.mapData, 
                        settings: data.settings,
                        users: data.users
                    });
                    
                    camera.position.set(gameData.map.maxX - 7, 12, gameData.map.maxY + 3);
                    camera.rotation.set(-Math.PI * 0.40, 0, 0);
                    const direction = new THREE.Vector3();
                    camera.getWorldDirection(direction);
                    
                    /*
                    controls = new THREE.OrbitControls(camera, renderer.domElement);
                    // point the target from the camera in the
                    // target direction
                    camera.getWorldPosition(controls.target);
                    controls.target.addScaledVector(direction, 15);
                    controls.update();
                    
                    controls.mouseButtons = {
                        LEFT: THREE.MOUSE.PAN,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: THREE.MOUSE.ROTATE
                    };
                    controls.enableKeys = false;*/
                    BG.state.turnOrder = [];
                    for(let i = 0; i < data.turnOrder.length; i++){
                        BG.state.turnOrder.push(BG.state.players.find((player) => {return player.playerId === data.turnOrder[i];}));
                    }
                    let expandFloor = BG.c.tileSize * 2;
                    let floorW = (gameData.map.data.map.w + expandFloor) * (BG.c.tileW + BG.c.tileOffset);
                    let floorH = (gameData.map.data.map.h + expandFloor) * (BG.c.tileH + BG.c.tileOffset);
                    // Floor
                    var floorGeometry = new THREE.PlaneGeometry(floorW, floorH);
                    var floorMaterial = new THREE.MeshPhongMaterial({
                      color: 0xecebec,
                      specular: 0x000000,
                      shininess: 100
                    });
                    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
                    floor.position.set((floorW - expandFloor * 1.5) / 2, 0, (floorH - expandFloor * 1.5) / 2);
                    floor.rotation.set(-0.5 * Math.PI, 0, 0);
                    floor.receiveShadow = true;
                    scene.add(floor);
                    
                    const light = new THREE.AmbientLight(0xFFFFFF, 1);
                    scene.add(light);
                    
                    
                    //Insert all of the tile sprites.
                    for(let i = 0; i < gameData.map.tiles.length; i++){
                        let td = gameData.map.tiles[i];
                        //Create the tile and center it in the scene.
                        td.sprite = BG.GameController.createObject("Tile", {
                            x: td.loc[0] * (BG.c.tileW + BG.c.tileOffset) + BG.c.tileW,
                            y: 0.1,
                            z: td.loc[1] * (BG.c.tileH + BG.c.tileOffset) + BG.c.tileH
                        }, td);
                        
                        scene.add(td.sprite);
                        
                    }
                    
                    for(let i = 0; i < gameData.players.length; i++){
                        let player = gameData.players[i];
                        player.sprite = BG.GameController.createObject("Player", {
                            x: player.loc[0] * (BG.c.tileW + BG.c.tileOffset) + BG.c.tileW,
                            y: 0.1,
                            z: player.loc[1] * (BG.c.tileH + BG.c.tileOffset) + BG.c.tileH * 1.1
                        }, player);
                        scene.add(player.sprite);
                    }
                    
                    
                    function c(x, z){
                        let object = BG.ObjectData["selector.obj"].clone();
                        object.position.x = x * (BG.c.tileW + BG.c.tileOffset);
                        object.position.y = 0;
                        object.position.z = z * (BG.c.tileH + BG.c.tileOffset);
                        BG.scene.add(object);
                    }
                    function l(loc){
                        let pos = BG.Utility.getXZ(loc);
                        console.log(pos)
                        let object = BG.ObjectData["selector.obj"].clone();
                        object.position.x = pos.x;
                        object.position.y = 0;
                        object.position.z = pos.z;
                        BG.scene.add(object);
                    }
                    //l(BG.Utility.getLoc(-0.5, -0.5))
                    //c(1, 1)
                    /*
                    for(let i = 0 ; i < BG.state.map.grid.length; i++){
                        for(let j = 0 ;j < BG.state.map.grid[0].length; j++){
                            if(BG.state.map.grid[i][j]){
                                l([j, i]);
                            }
                        }
                    }*/
                }
                setup();
                //Create the stage that allows for user inputs.
                BG.Q.stageScene("inputs", 0);
                BG.Q.stageScene("hud", 1);
                
                window.addEventListener( 'resize', onWindowResize, false );
                function onWindowResize() {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize( window.innerWidth, window.innerHeight );
                }
            }
        }
    };
};