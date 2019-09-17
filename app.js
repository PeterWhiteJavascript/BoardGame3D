const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const seedrandom = require('seedrandom');
const fs = require('fs');
const THREE = require('three');

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.render('/index.html');
});

let Quintus = require("./public/lib/quintus.js");
require("./public/lib/quintus_sprites.js")(Quintus);
require("./public/lib/quintus_scenes.js")(Quintus);

let SERVER = require("./server.js");
let Server = new SERVER(fs);

let BoardGame  = require("./public/js/board-game.js");
let BG = new BoardGame();
BG.THREE = THREE;
BG.c = Server.constants;
BG.Q = new Quintus().include("Sprites, Scenes");

io.on('connection', function (socket) {
    //TEMP: This connection should join a login room to start (or something like that)
    let user = Server.createNewUser({
        gameRoom: "room" + Server.gameID,
        color: BG.c.colors[~~(Math.random() * BG.c.colors.length )],
        id: Server.userID
    });
    //Adds the user to the game room. Creates a game if there isn't one available.
    let game = Server.addUserToGame(user, socket, user.gameRoom);
    //Confirm with the client that a connection has occured
    socket.emit("connected", {
        loadFiles: Server.loadFiles, 
        id: user.id, 
        gameRoom: user.gameRoom,
        initialSeed: game.initialSeed
    });
    //Once the game is full, all players will report back to the server saying that they are ready to start the game.
    socket.on("readyToStartGame", function(data){
        user.ready = true;
        if(game.users.length === game.settings.numOfPlayers){
            //Check if all users are ready
            let allReady = game.users.every((user) => user.ready);
            //If all users are ready, start the game
            if(allReady){
                
                BG.state = BG.setUpGameState({
                    mapData: game.mapData,
                    settings: game.settings,
                    users: game.users
                });
                console.log("Game started. This room uses the seed: " + BG.state.initialSeed);
                io.in(user.gameRoom).emit("allUsersReady", {
                    allReady: allReady,
                    users: game.users,
                    map: game.map,
                    settings: game.settings,
                    turnOrder: BG.state.turnOrder.map((player) => {return player.playerId;})
                });
                //Start the game by starting the first player's turn.
                BG.GameController.startTurn(BG.state);
            }   
        }
    });
    
    socket.on('disconnect', function (data) {
        //TODO: figure out how to get the user id and game room of the disconnector and tell all users in that game that there was a disconnect.
        Server.userCount--;
        
        //TODO: allow for reconnecting to the game
        
        
    });
    
    socket.on("inputted", function(data){
        let response = BG.GameController.processInputs(BG.state, data);
        //console.log(response)
        if(response){
            io.in(user.gameRoom).emit("inputResult", {id: user.id, response: response});
        }
    });
});


server.listen(process.env.PORT || 5000);
console.log("Multiplayer app listening on port 5000");