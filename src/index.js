const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const players = {};
const allChattingList = [];
const roomChattingList = [];
const characters = [
  "apple",
  "strawberry",
  "watermelon",
  "pear",
  "orange",
  "lemon",
];

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
}

function randomNameGenerator(num) {
  let res = "";
  for (let i = 0; i < num; i++) {
    const random = getRandomInt(0, 26); // 0 ~ 25
    res += String.fromCharCode(97 + random); // a to z
  }
  return res;
}

function getPlayers(sceneName) {
  let result = {};
  let keys = Object.keys(players);
  keys.forEach((key) => {
    if (players[key].sceneName === sceneName) {
      result[key] = players[key];
    }
  });
  return result;
}

io.on("connection", (socket) => {
  // 새로운 유저 데이터 생성
  let character = characters.at(Math.floor(Math.random() * 5));
  players[socket.id] = {
    x: 300,
    y: 400,
    flipX: false,
    curAnim: `${character}_idle`,
    playerId: socket.id,
    sceneName: "MainScene",
    name: randomNameGenerator(6),
    character: character,
  };

  // 새로운 유저에게 MainScene 유저 리스트를 전달한다.
  socket.join("MainScene");
  socket.emit("sceneInfo", {
    players: getPlayers("MainScene"),
    sceneName: "MainScene",
    allChattingList,
    roomChattingList,
  });

  // MainScene에 있는 다른 유저에게 새 유저 정보를 전달
  socket
    .to("MainScene")
    .emit("newPlayer", { sceneName: "MainScene", player: players[socket.id] });

  socket.on("playerMovement", (data) => {
    const { x, y, flipX, curAnim } = data;
    let player = players[socket.id];
    player.x = x;
    player.y = y;
    player.flipX = flipX;
    player.curAnim = curAnim;
    socket.to(player.sceneName).emit("updatePlayer", player);
  });

  socket.on("chatting", (data) => {
    let sceneName = players[socket.id].sceneName;
    let message = `${data.name}: ${data.message}`;
    data["sceneName"] = sceneName;

    if (data.chattingChannel === "all") {
      allChattingList.push(message);
      socket.broadcast.emit("chatting", data);
    } else {
      // 회의실에서만 호출된다.
      roomChattingList.push(message);
      socket.to(sceneName).emit("chatting", data);
    }
  });

  socket.on("character", (data) => {
    let player = players[socket.id];
    player.curAnim = `${data.character}${player.curAnim.substring(
      player.curAnim.length - 5
    )}`;
    player.character = data.character;
    data["sceneName"] = player.sceneName;
    socket.to(player.sceneName).emit("updatePlayer", player);
    socket.to(player.sceneName).emit("toast", data);
  });

  socket.on("name", (data) => {
    let player = players[socket.id];
    player.name = data.name;
    data["sceneName"] = player.sceneName;
    socket.to(player.sceneName).emit("updatePlayer", player);
    socket.to(player.sceneName).emit("toast", data);
  });

  socket.on("portal", (_data) => {
    // 포탈로 이동하는 경우, 기존 장면에 있는 사람들에게 알리고 새로운 장면으로 진입한다.
    const { destScene, data } = _data;
    let player = players[socket.id];
    let prevScene = player.sceneName;
    player.sceneName = destScene;
    player.x = data.spawnPosX;
    player.y = data.spawnPosY;

    socket.leave(prevScene);
    socket
      .to(prevScene)
      .emit("exitPlayer", { sceneName: prevScene, playerId: socket.id });

    socket.join(destScene);
    socket.emit("sceneInfo", {
      sceneName: destScene,
      players: getPlayers(destScene),
      allChattingList,
      roomChattingList,
    });
    socket.to(destScene).emit("newPlayer", { sceneName: destScene, player });
  });

  socket.on("disconnect", () => {
    let sceneName = players[socket.id].sceneName;
    delete players[socket.id];
    socket.to(sceneName).emit("exitPlayer", { sceneName, playerId: socket.id });
  });
});

app.use(express.static("public"));
httpServer.listen(3000);
