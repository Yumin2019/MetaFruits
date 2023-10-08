const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const players = {};
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

  // 기본적으로 MainScene에 입장한다.
  socket.join("MainScene");

  // 새로운 유저에게 MainScene 유저 리스트 전달
  socket.emit("currentPlayers", getPlayers("MainScene"));

  // MainScene에 있는 다른 유저에게 새 유저 정보를 전달
  socket.to("MainScene").emit("newPlayer", players[socket.id]);

  socket.on("playerMovement", (data) => {
    const { x, y, flipX, curAnim } = data;
    let sceneName = players[socket.id].sceneName;
    players[socket.id].x = x;
    players[socket.id].y = y;
    players[socket.id].flipX = flipX;
    players[socket.id].curAnim = curAnim;
    socket.to(sceneName).emit("updatePlayer", players[socket.id]);
  });

  socket.on("chatting", (data) => {
    // 전체 채팅인지 구분해야 한다. (나중에 추가) 단순히 채팅만 처리하면 되는지, 오브젝트도 처리해야 되는지 결정이 된다.
    socket.broadcast.emit("chatting", data);
  });

  socket.on("character", (data) => {
    let sceneName = players[socket.id].sceneName;
    let curAnim = players[socket.id].curAnim;
    players[socket.id].curAnim = `${data.character}${curAnim.substring(
      curAnim.length - 5
    )}`;
    players[socket.id].character = data.character;
    socket.to(sceneName).emit("updatePlayer", players[socket.id]);
    socket.to(sceneName).emit("toast", data);
  });

  socket.on("name", (data) => {
    let sceneName = players[socket.id].sceneName;
    players[socket.id].name = data.name;
    socket.to(sceneName).emit("updatePlayer", players[socket.id]);
    socket.to(sceneName).emit("toast", data);
  });

  socket.on("portal", (data) => {
    // 포탈로 이동하는 경우, 다른 플레이어에게 알리고 자신의 정보를 업데이트 한다.
    /*
     portalName: "portal1",
      destScene: "MainScene",
      x: 220,
      y: 1010,
      width: 90,
      height: 12,
      data: { spawnPosX: 400, spawnPosY: 230 },
    });
  */
  });

  socket.on("disconnect", () => {
    let sceneName = players[socket.id].sceneName;
    delete players[socket.id];
    socket.to(sceneName).emit("exitPlayer", socket.id);
  });
});

app.use(express.static("public"));
httpServer.listen(3000);
