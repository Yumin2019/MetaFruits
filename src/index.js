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
  players[socket.id] = {
    x: 300,
    y: 400,
    playerId: socket.id,
    // isMainScene: true,
    name: randomNameGenerator(6),
    character: characters.at(Math.floor(Math.random() * 5)),
  };

  // 새로운 유저에게 유저 리스트 전달
  socket.emit("currentPlayers", players);

  // 다른 유저에게 새 유저 정보를 전달
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("disconnect", function () {
    console.log("user disconnected");

    // 서버에서 삭제하고 유저에게 알린다.
    delete players[socket.id];
    io.emit("exitPlayer", socket.id);
  });
});

app.use(express.static("public"));
httpServer.listen(3000);
