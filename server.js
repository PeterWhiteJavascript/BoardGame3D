let Server = function(fs){
    this.userCount = 0;
    this.gameID = 0;
    this.userID = 0;
    const filesFolder = 'public/';
    this.filesFolder = filesFolder;
    this.loadDirectories = ["audio", "data/constants", "data/fonts", "images/3d", "images/2d"];
    function readDirectory(path, filesFolder){
        let files = [];
        fs.readdirSync(filesFolder + path).forEach(file => {
            //If path leads to antoher directory, look in that directory too
            if(fs.lstatSync(filesFolder + path + "/" + file).isDirectory()){
                readDirectory(path + "/" + file, filesFolder).forEach( f => {
                    files.push(f);
                });
            } else {
                files.push(filesFolder + path + "/" + file);
            }
        });
        return files;
    }
    function getAllGameFiles(directories, filesFolder){
        let loadFiles = {};
        directories.forEach(path => {
            loadFiles[path] = [];
            readDirectory(path, filesFolder).forEach(file => {
                loadFiles[path].push(file.replace(filesFolder, ""));
            });
        });
        return loadFiles;
    }
    
    this.loadFiles = getAllGameFiles(this.loadDirectories, this.filesFolder);
    this.constants = JSON.parse(fs.readFileSync(this.filesFolder + "data/constants/data.json"));
    //Load all map data since this is the server.
    let mapsData = this.mapsData = {};
    getAllGameFiles(["data/maps"], this.filesFolder)["data/maps"].forEach(map => {
        mapsData[map.replace("data/maps/", "")] = JSON.parse(fs.readFileSync(filesFolder + map));
    });
    this.gameData = {};
    return this;
};
Server.prototype.createNewUser = function(p){
    let user = new this.User(p);
    this.userCount++;
    this.userID++;
    return user;
};
Server.prototype.addUserToGame = function(user, socket, room){
    if(!this.gameData[room]){
        //All of these settings will eventually be set by the player when creating a game.
        let map = "castle.json";
        this.gameData[room] = this.createNewGame({
            host: user,
            map: map,
            settings:{
                mode: "ffa",
                numOfPlayers:2
            },
            mapData:this.mapsData[map]
        });
    } else {
        this.gameData[room].users.push(user);
    }
    socket.join(room);
    if(this.gameData[room].users.length === this.gameData[room].settings.numOfPlayers) this.gameID++;
    return this.gameData[room];
};
Server.prototype.createNewGame = function(p){
    return new this.Game(p);
};

Server.prototype.User = function(p){
    this.id = p.id;
    this.ready = false;
    this.color = p.color;
    this.gameRoom = p.gameRoom;
    return this;
};
Server.prototype.Game = function(p){
    //Host is always first user.
    this.users = [
        p.host
    ];
    this.settings = p.settings;
    this.map = p.map;
    this.mapData = p.mapData;
    return this;
};

module.exports = Server;