import GameScene from "../scene/GameScene.js";
import { game, getCurScene, getInActiveScene } from "../index.js";
import { addChatting, setChattingList, setMyPlayer } from "./GameFunc.js";
import { chattingChannel } from "./UILogic.js";
import { io } from "socket.io-client";

export const socket = io();

socket.on("sceneInfo", (data) => {
  const { sceneName, players, allChattingList, roomChattingList } = data;
  // console.log(`${sceneName}, count = ${Object.keys(players).length}`);

  // 플레이어 정보 추가
  // GameScene.eventQueue: Scene이 초기화되지 않은 경우 콜백을 등록하여 처리
  let player = players[socket.id];
  if (getCurScene()) {
    setMyPlayer(getCurScene(), player);
  } else {
    GameScene.eventQueue.push(() => {
      setMyPlayer(getInActiveScene(sceneName), player);
    });
  }

  // 다른 플레이어의 정보를 추가한다.
  delete players[socket.id];

  let playerArray = Object.values(players);
  playerArray.forEach((player) => {
    if (getCurScene()) {
      GameScene.addPlayer(getCurScene(), player);
    } else {
      GameScene.eventQueue.push(() => {
        GameScene.addPlayer(getInActiveScene(sceneName), player);
      });
    }
  });

  // 채팅 채널 설정(기본적으로 입장시 설정한다.)
  if (sceneName === "MainScene") {
    game.global.chattingChannel = "all";
    chattingChannel.innerText = "전체";
    setChattingList(allChattingList);
  } else {
    game.global.chattingChannel = "room";
    chattingChannel.innerText = "회의";
    setChattingList(roomChattingList);
  }

  // 입장시 채팅 동기화
  // 회의 내부에서는 모든 이벤트를 받지만, 외부에서는 회의실 채팅을 처리하지 않기에 동기화가 필요하다
  game.global.allChattingList = allChattingList;
  game.global.roomChattingList = roomChattingList;
});

socket.on("newPlayer", (data) => {
  const { sceneName, player } = data;
  if (getCurScene()) {
    GameScene.addPlayer(getCurScene(), player);
  } else {
    GameScene.eventQueue.push(() => {
      GameScene.addPlayer(getInActiveScene(sceneName), player);
    });
  }
});

socket.on("exitPlayer", (data) => {
  const { sceneName, playerId } = data;
  if (getCurScene()) {
    GameScene.removePlayer(getCurScene(), playerId);
  } else {
    GameScene.eventQueue.push(() => {
      GameScene.removePlayer(getInActiveScene(sceneName), playerId);
    });
  }
});

socket.on("updatePlayer", (player) => {
  if (getCurScene()) {
    GameScene.updatePlayer(getCurScene(), player);
  } else {
    GameScene.eventQueue.push(() => {
      GameScene.updatePlayer(getInActiveScene(player.sceneName), player);
    });
  }
});

socket.on("chatting", (data) => {
  const { playerId, message, name, sceneName, chattingChannel } = data;

  // 채팅 채널 처리에 따라 채팅을 추가한다.
  let msg = `${name}: ${message}`;
  if (game.global.chattingChannel === chattingChannel) {
    addChatting(msg);
  }

  if (chattingChannel === "all") {
    game.global.allChattingList.push(msg);
  } else {
    game.global.roomChattingList.push(msg);
  }

  if (getCurScene()) {
    GameScene.setMessage(getCurScene(), playerId, message);
  } else {
    GameScene.eventQueue.push(() => {
      GameScene.setMessage(getInActiveScene(sceneName), playerId, message);
    });
  }
});

socket.on("toast", (data) => {
  const { playerId, containerMessage, sceneName } = data;

  if (getCurScene()) {
    GameScene.setMessage(getCurScene(), playerId, containerMessage);
  } else {
    GameScene.eventQueue.push(() => {
      GameScene.setMessage(
        getInActiveScene(sceneName),
        playerId,
        containerMessage
      );
    });
  }
});

// ================= 미디어수프 코드 =================
// const mediasoupClient = require("mediasoup-client");

// https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerOptions
// https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
// let params = {
//   // mediasoup params
//   encodings: [
//     {
//       rid: "r0",
//       maxBitrate: 100000,
//       scalabilityMode: "S1T3",
//     },
//     {
//       rid: "r1",
//       maxBitrate: 300000,
//       scalabilityMode: "S1T3",
//     },
//     {
//       rid: "r2",
//       maxBitrate: 900000,
//       scalabilityMode: "S1T3",
//     },
//   ],
//   // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
//   codecOptions: {
//     videoGoogleStartBitrate: 1000,
//   },
// };

// let device;
// let rtpCapabilities;
// let producerTransport;
// let consumerTransports = [];
// let audioProducer;
// let videoProducer;

// let audioParams;
// let videoParams = { params };
// let consumingTransports = [];

// const streamSuccess = (stream) => {
//   localVideo.srcObject = stream;

//   // audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
//   videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

//   joinRoom();
// };

// const joinRoom = () => {
//   // socket.emit("joinRoom", { roomName }, (data) => {
//   //   console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
//   //   // we assign to local variable and will be used when
//   //   // loading the client Device (see createDevice above)
//   //   rtpCapabilities = data.rtpCapabilities;
//   //   // once we have rtpCapabilities from the Router, create Device
//   //   createDevice();
//   // });
// };

// const getLocalStream = () => {
//   navigator.mediaDevices
//     .getUserMedia({
//       audio: true,
//       video: {
//         width: {
//           min: 640,
//           max: 1920,
//         },
//         height: {
//           min: 400,
//           max: 1080,
//         },
//       },
//     })
//     .then(streamSuccess)
//     .catch((error) => {
//       console.log(error.message);
//     });
// };
// getLocalStream();
