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

io.on("connection", (socket) => {
  // 새로운 유저 데이터 생성
  let character = characters.at(Math.floor(Math.random() * 5));
  players[socket.id] = {
    x: 300,
    y: 400,
    flipX: false,
    curAnim: `${character}_idle`,
    playerId: socket.id,
    // isMainScene: true,
    name: randomNameGenerator(6),
    character: character,
  };

  // 새로운 유저에게 유저 리스트 전달
  socket.emit("currentPlayers", players);

  // 다른 유저에게 새 유저 정보를 전달
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("playerMovement", (data) => {
    const { x, y, flipX, curAnim } = data;
    players[socket.id].x = x;
    players[socket.id].y = y;
    players[socket.id].flipX = flipX;
    players[socket.id].curAnim = curAnim;
    socket.broadcast.emit("updatePlayer", players[socket.id]); // Scene 개념을 적용하여 수정해야 한다.
  });

  socket.on("chatting", (data) => {
    socket.broadcast.emit("chatting", data);
  });

  socket.on("character", (data) => {
    let curAnim = players[socket.id].curAnim;
    players[socket.id].curAnim = `${data.character}${curAnim.substring(
      curAnim.length - 5
    )}`;
    players[socket.id].character = data.character;
    socket.broadcast.emit("updatePlayer", players[socket.id]);
    socket.broadcast.emit("character", data);
  });

  socket.on("name", (data) => {
    players[socket.id].name = data.name;
    socket.broadcast.emit("updatePlayer", players[socket.id]);
    socket.broadcast.emit("name", data);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");

    // 서버에서 삭제하고 유저에게 알린다.
    delete players[socket.id];
    io.emit("exitPlayer", socket.id);
  });
});

app.use(express.static("public"));
httpServer.listen(3000);
