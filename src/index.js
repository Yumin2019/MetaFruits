const express = require("express");
const http = require("http");
const mediasoup = require("mediasoup");
const socketIo = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const io = new socketIo.Server(httpServer);

let worker;
let rooms = {}; // { roomName1: { Router, peers: [ socketId1, ... ] }, ...}
let peers = {}; // { socketId1: { roomName1, socket, transports = [id1, id2,], producers = [id1, id2,], consumers = [id1, id2,], peerDetails }, ...}
let transports = []; // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = []; // [ { socketId1, roomName1, producer, }, ... ] 어떤 방에 어떤 소켓에 대한 프로듀서가 있다. (오디오, 비디오 따로)
let consumers = []; // [ { socketId1, roomName1, consumer, }, ... ]

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2200,
  });
  console.log(`worker pid ${worker.pid}`);

  worker.on("died", (error) => {
    // This implies something serious happened, so kill the application
    console.error("mediasoup worker has died");
    setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
  });

  return worker;
};

// We create a Worker as soon as our application starts
worker = createWorker();

// This is an Array of RtpCapabilities
// https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecCapability
// list of media codecs supported by mediasoup ...
// https://github.com/versatica/mediasoup/blob/v3/src/supportedRtpCapabilities.ts
const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
];

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

const createWebRtcTransport = async (router) => {
  return new Promise(async (resolve, reject) => {
    try {
      // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
      const webRtcTransport_options = {
        listenIps: [
          {
            ip: "0.0.0.0", // replace with relevant IP address
            announcedIp: "127.0.0.1", //"10.0.0.115",
          },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      };

      // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
      let transport = await router.createWebRtcTransport(
        webRtcTransport_options
      );
      console.log(`transport id: ${transport.id}`);

      transport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          transport.close();
        }
      });

      transport.on("close", () => {
        console.log("transport closed");
      });

      resolve(transport);
    } catch (error) {
      reject(error);
    }
  });
};

io.on("connection", (socket) => {
  // 미디어수프 코드
  const removeItems = (items, socketId, type) => {
    items.forEach((item) => {
      if (item.socketId === socket.id) {
        item[type].close();
      }
    });
    items = items.filter((item) => item.socketId !== socket.id);

    return items;
  };

  const addPeerToRoom = async (roomName, socketId) => {
    let router;
    let peers = [];
    if (rooms[roomName]) {
      router = rooms[roomName].router;
      peers = rooms[roomName].peers || [];
    } else {
      router = await worker.createRouter({ mediaCodecs });
    }

    console.log(`Router ID: ${router.id}`, peers.length);

    rooms[roomName] = {
      router: router,
      peers: [...peers, socketId],
    };

    return router;
  };

  socket.on("joinRoom", async ({ roomName }, callback) => {
    console.log("joinRoom");
    // create Router if it does not exist
    const router = await addPeerToRoom(roomName, socket.id);
    peers[socket.id] = {
      socket,
      roomName, // Name for the Router this Peer joined
      transports: [],
      producers: [],
      consumers: [],
      peerDetails: {
        name: "",
      },
    };

    // get Router RTP Capabilities
    const rtpCapabilities = router.rtpCapabilities;
    console.log(rtpCapabilities);

    // call callback from the client and send back the rtpCapabilities
    callback({ rtpCapabilities });
  });

  // Client emits a request to create server side Transport
  // We need to differentiate between the producer and consumer transports
  socket.on("createWebRtcTransport", async ({ consumer }, callback) => {
    // get Room Name from Peer's properties
    const roomName = peers[socket.id].roomName;

    // get Router (Room) object this peer is in based on RoomName
    const router = rooms[roomName].router;

    createWebRtcTransport(router).then(
      (transport) => {
        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });

        // add transport to Peer's properties
        addTransport(transport, roomName, consumer);
      },
      (error) => {
        console.log(error);
      }
    );
  });

  const addTransport = (transport, roomName, consumer) => {
    transports = [
      ...transports,
      { socketId: socket.id, transport, roomName, consumer },
    ];

    peers[socket.id] = {
      ...peers[socket.id],
      transports: [...peers[socket.id].transports, transport.id],
    };
  };

  const addProducer = (producer, roomName) => {
    producers = [...producers, { socketId: socket.id, producer, roomName }];

    peers[socket.id] = {
      ...peers[socket.id],
      producers: [...peers[socket.id].producers, producer.id],
    };
  };

  const addConsumer = (consumer, roomName) => {
    // add the consumer to the consumers list
    consumers = [...consumers, { socketId: socket.id, consumer, roomName }];

    // add the consumer id to the peers list
    peers[socket.id] = {
      ...peers[socket.id],
      consumers: [...peers[socket.id].consumers, consumer.id],
    };
  };

  socket.on("getProducers", (callback) => {
    //return all producer transports
    const { roomName } = peers[socket.id];

    let producerList = [];
    producers.forEach((producerData) => {
      if (
        producerData.socketId !== socket.id &&
        producerData.roomName === roomName
      ) {
        producerList = [...producerList, producerData.producer.id];
      }
    });

    // return the producer list back to the client
    callback(producerList);
  });

  const informConsumers = (roomName, socketId, id) => {
    console.log(`just joined, id ${id} ${roomName}, ${socketId}`);

    // A new producer just joined
    // let other clients to consume this producer
    let socketIds = rooms[roomName].peers.filter((id) => id !== socketId);
    socketIds.forEach((socketId) => {
      const otherSocket = peers[socketId].socket;
      // use socket to send producer id to producer
      otherSocket.emit("new-producer", { producerId: id });
    });
  };

  const getTransport = (socketId) => {
    const [producerTransport] = transports.filter(
      (transport) => transport.socketId === socketId && !transport.consumer
    );
    return producerTransport.transport;
  };

  function releaseMyInfo() {
    if (peers[socket.id]) {
      consumers = removeItems(consumers, socket.id, "consumer");
      producers = removeItems(producers, socket.id, "producer");
      transports = removeItems(transports, socket.id, "transport");

      const { roomName } = peers[socket.id];
      delete peers[socket.id];

      // remove socket from room
      rooms[roomName] = {
        router: rooms[roomName].router,
        peers: rooms[roomName].peers.filter(
          (socketId) => socketId !== socket.id
        ),
      };
    }
  }

  // see client's socket.emit('transport-connect', ...)
  socket.on("transport-connect", ({ dtlsParameters }) => {
    console.log("DTLS PARAMS... ", { dtlsParameters });

    getTransport(socket.id).connect({ dtlsParameters });
  });

  // see client's socket.emit('transport-produce', ...)
  socket.on(
    "transport-produce",
    async ({ kind, rtpParameters, appData }, callback) => {
      // call produce based on the prameters from the client
      const producer = await getTransport(socket.id).produce({
        kind,
        rtpParameters,
      });

      // add producer to the producers array
      const { roomName } = peers[socket.id];

      addProducer(producer, roomName);

      informConsumers(roomName, socket.id, producer.id);

      console.log("Producer ID: ", producer.id, producer.kind);

      producer.on("transportclose", () => {
        console.log("transport for this producer closed ");
        producer.close();
      });

      // Send back to the client the Producer's id
      callback({
        id: producer.id,
        producersExist: producers.length > 1 ? true : false,
      });
    }
  );

  // see client's socket.emit('transport-recv-connect', ...)
  socket.on(
    "transport-recv-connect",
    async ({ dtlsParameters, serverConsumerTransportId }) => {
      console.log(`DTLS PARAMS: ${dtlsParameters}`);
      const consumerTransport = transports.find(
        (transportData) =>
          transportData.consumer &&
          transportData.transport.id == serverConsumerTransportId
      ).transport;
      await consumerTransport.connect({ dtlsParameters });
    }
  );

  socket.on(
    "consume",
    async (
      { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
      callback
    ) => {
      try {
        const { roomName } = peers[socket.id];
        const router = rooms[roomName].router;
        let consumerTransport = transports.find(
          (transportData) =>
            transportData.consumer &&
            transportData.transport.id == serverConsumerTransportId
        ).transport;

        // 프로듀서의 소켓 ID를 구해서 클라에게 params로 넘긴다.
        let producerSocketId = producers.find(
          (producerData) => producerData.producer.id === remoteProducerId
        ).socketId;

        // check if the router can consume the specified producer
        if (
          router.canConsume({
            producerId: remoteProducerId,
            rtpCapabilities,
          })
        ) {
          // transport can now consume and return a consumer
          const consumer = await consumerTransport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true,
          });

          consumer.on("transportclose", () => {
            console.log("transport close from consumer");
          });

          consumer.on("producerclose", () => {
            console.log("producer of consumer closed");
            socket.emit("producer-closed", { remoteProducerId });

            consumerTransport.close([]);
            transports = transports.filter(
              (transportData) =>
                transportData.transport.id !== consumerTransport.id
            );
            consumer.close();
            consumers = consumers.filter(
              (consumerData) => consumerData.consumer.id !== consumer.id
            );
          });

          addConsumer(consumer, roomName);

          // from the consumer extract the following params
          // to send back to the Client
          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id,
            producerSocketId,
          };

          // send the parameters to the client
          callback({ params });
        }
      } catch (error) {
        console.log(error.message);
        callback({
          params: {
            error: error,
          },
        });
      }
    }
  );

  socket.on("consumer-resume", async ({ serverConsumerId }) => {
    console.log("consumer resume");
    const { consumer } = consumers.find(
      (consumerData) => consumerData.consumer.id === serverConsumerId
    );
    await consumer.resume();
  });

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

  socket.on("exitRoom", () => {
    // 현재 연결된 소켓의 정보를 room에서 삭제한다.
    releaseMyInfo();
  });

  socket.on("disconnect", () => {
    // HosueScene에 있던 경우에는 관련 데이터를 날린다.
    releaseMyInfo();

    let sceneName = players[socket.id].sceneName;
    delete players[socket.id];
    socket.to(sceneName).emit("exitPlayer", { sceneName, playerId: socket.id });
  });
});

app.use(express.static("public"));
app.use(express.static("dist"));

app.get("*", (req, res) => {
  res.sendFile(__dirname + "/../dist/index.html");
});

httpServer.listen(3000);
