import GameScene from "../scene/GameScene.js";
import * as mediasoupClient from "mediasoup-client";
import { game, getCurScene, getInActiveScene } from "../index.js";
import {
  addChatting,
  colorPids,
  hideElement,
  setChattingList,
  setMyPlayer,
  showElement,
  updateVideoStatus,
} from "./GameFunc.js";
import { cameraButton, chattingChannel, mikeTest } from "./UILogic.js";
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

// https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerOptions
// https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
let params = {
  // mediasoup params
  encodings: [
    {
      rid: "r0",
      maxBitrate: 100000,
      scalabilityMode: "S1T3",
    },
    {
      rid: "r1",
      maxBitrate: 300000,
      scalabilityMode: "S1T3",
    },
    {
      rid: "r2",
      maxBitrate: 900000,
      scalabilityMode: "S1T3",
    },
  ],
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
  codecOptions: {
    videoGoogleStartBitrate: 1000,
  },
};

let device;
let rtpCapabilities;
let producerTransport;
let consumerTransports = [];
let audioProducer;
let videoProducer;

let audioParams;
let videoParams = { params };
let consumingTransports = []; // remoteProducerId array
let streams = {};

let isCameraOn = true;
let isMikeOn = true;

function addVoiceRecognition(audioStream, videoDiv, id) {
  try {
    // 음성 볼륨 인식
    if (audioStream.getAudioTracks().length > 0) {
      let audioContext = new AudioContext();
      let analyser = audioContext.createAnalyser();
      let microphone = audioContext.createMediaStreamSource(audioStream);
      let javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);
      javascriptNode.onaudioprocess = function () {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);

        const arraySum = array.reduce((a, value) => a + value, 0);
        const average = Math.round(arraySum / array.length);

        videoDiv.style.border = `4px solid ${
          average > 10 ? "#99d9ea" : "#9f9f9f"
        }`;
        if (socket.id === id && mikeTest) colorPids(average);
      };
    }
  } catch (error) {}
}

function createMyVideoDiv(id, stream) {
  let videoDiv = document.createElement("div");
  videoDiv.setAttribute("class", "video-div");
  videoDiv.setAttribute("id", `video-div-${id}`);

  // ID는 video-div-${id}, vidoe-${id}, video-status-${id}, video-cover-${id}로 관리한다.
  videoDiv.innerHTML =
    '<div id="' +
    `video-cover-${id}` +
    '"class="video-cover" style="display: none;">카메라 OFF</div>' +
    '<video id="' +
    `video-${id}` +
    '" class="video" autoplay></video>' +
    '<div id="' +
    `video-status-${id}` +
    '" class="video-status">cam: ✔️ mike: ✔️</div>';

  // video parent list에 추가 한다.
  let videoParent = document.getElementById("video-parent-content");
  videoParent.appendChild(videoDiv);

  // 스트림 정보를 추가한다.
  let video = document.getElementById(`video-${id}`);
  video.srcObject = stream;

  addVoiceRecognition(stream, videoDiv, id);
  return videoDiv;
}

const streamSuccess = async (stream) => {
  // 스트림이 들어오면 영상 뷰를 추가한다.
  let playerId = socket.id;
  streams[playerId] = stream;

  audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
  videoParams = { track: stream.getVideoTracks()[0], ...videoParams };
  createMyVideoDiv(socket.id, stream);

  // speaker 기본값으로 설정
  let devices = await getDevicesByKind("audiooutput");
  let video = document.getElementById(`video-${playerId}`);
  if (stream.getAudioTracks().length > 0) {
    attachSinkId(video, devices[0].deviceId);
  }
};

export const joinRoom = () => {
  socket.emit("joinRoom", { roomName: "HouseScene" }, (data) => {
    // console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
    // we assign to local variable and will be used when
    // loading the client Device (see createDevice above)
    rtpCapabilities = data.rtpCapabilities;
    // once we have rtpCapabilities from the Router, create Device
    createDevice();
  });
};

export const exitRoom = () => {
  // 서버에서 리소스를 정리한다.
  socket.emit("exitRoom", { roomName: "HouseScene" });

  // 클라에서 리소스를 정리한다.
  // 기존에 있던 유저는 producerClosed 이벤트를 받아서 RC, LC에 대한 처리를 한다.
  // 서버에서도 유저가 나갈 때 데이터를 날린다.
  // 서버에서 자신과 관련된 모든 정보를 close하므로 클라이언트 쪽에서도 갱신을 해준다.
  consumingTransports.forEach((remoteProducerId) => {
    releaseVideoInfo(remoteProducerId);
  });
};

function releaseVideoInfo(remoteProducerId) {
  // remoteProducerId를 소비하고 있던 경우를 찾는다.
  const producerToClose = consumerTransports.find(
    (transportData) => transportData.producerId === remoteProducerId
  );

  producerToClose.consumerTransport.close();
  producerToClose.consumer.close();

  // remove the consumer transport from the list
  consumerTransports = consumerTransports.filter(
    (transportData) => transportData.producerId !== remoteProducerId
  );

  // id 정보도 없앤다.
  consumingTransports = consumingTransports.filter(
    (producerId) => producerId !== remoteProducerId
  );

  // 프로듀서의 소켓 아이디를 통해 해당 유저의 video와 audio를 정리한다.
  let parent = document.getElementById("video-parent-content");
  let videoDiv = document.getElementById(
    `video-div-${producerToClose.producerSocketId}`
  );
  let audioDiv = document.getElementById(
    `audio-div-${producerToClose.producerSocketId}`
  );

  if (videoDiv) parent.removeChild(videoDiv);
  if (audioDiv) parent.removeChild(audioDiv);
}

export const getLocalStream = () => {
  navigator.mediaDevices
    .getUserMedia({
      audio: true, // true
      video: {
        width: {
          min: 180,
          max: 180,
        },
        height: {
          min: 120,
          max: 120,
        },
      },
    })
    .then(streamSuccess)
    .catch((error) => {
      console.log(error.message);
    });
};

// A device is an endpoint connecting to a Router on the
// server side to send/recive media
const createDevice = async () => {
  try {
    device = new mediasoupClient.Device();

    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
    // Loads the device with RTP capabilities of the Router (server side)
    await device.load({
      // see getRtpCapabilities() below
      routerRtpCapabilities: rtpCapabilities,
    });

    // console.log("Device RTP Capabilities", device.rtpCapabilities);

    // once the device loads, create transport
    createSendTransport();
  } catch (error) {
    console.log(error);
    if (error.name === "UnsupportedError")
      console.warn("browser not supported");
  }
};

const createSendTransport = () => {
  // see server's socket.on('createWebRtcTransport', sender?, ...)
  // this is a call from Producer, so sender = true
  socket.emit("createWebRtcTransport", { consumer: false }, ({ params }) => {
    // The server sends back params needed
    // to create Send Transport on the client side
    if (params.error) {
      console.log(params.error);
      return;
    }

    // creates a new WebRTC Transport to send media
    // based on the server's producer transport params
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
    producerTransport = device.createSendTransport(params);

    // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
    // this event is raised when a first call to transport.produce() is made
    // see connectSendTransport() below
    producerTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          // Signal local DTLS parameters to the server side transport
          // see server's socket.on('transport-connect', ...)
          socket.emit("transport-connect", {
            dtlsParameters,
          });

          // Tell the transport that parameters were transmitted.
          callback();
        } catch (error) {
          errback(error);
        }
      }
    );

    producerTransport.on("produce", async (parameters, callback, errback) => {
      // console.log(parameters);

      try {
        // tell the server to create a Producer
        // with the following parameters and produce
        // and expect back a server side producer id
        // see server's socket.on('transport-produce', ...)
        socket.emit(
          "transport-produce",
          {
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData,
          },
          ({ id, producersExist }) => {
            // Tell the transport that parameters were transmitted and provide it with the
            // server side producer's id.
            callback({ id });

            // if producers exist, then join room
            if (producersExist) getProducers();
          }
        );
      } catch (error) {
        errback(error);
      }
    });

    connectSendTransport();
  });
};

const connectSendTransport = async () => {
  // we now call produce() to instruct the producer transport
  // to send media to the Router
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
  // this action will trigger the 'connect' and 'produce' events above

  audioProducer = await producerTransport.produce(audioParams);
  videoProducer = await producerTransport.produce(videoParams);

  audioProducer.on("trackended", () => {
    console.log("audio track ended");

    // close audio track
  });

  audioProducer.on("transportclose", () => {
    console.log("audio transport ended");

    // close audio track
  });

  videoProducer.on("trackended", () => {
    console.log("video track ended");

    // close video track
  });

  videoProducer.on("transportclose", () => {
    console.log("video transport ended");

    // close video track
  });
};

const signalNewConsumerTransport = async (remoteProducerId) => {
  //check if we are already consuming the remoteProducerId
  if (consumingTransports.includes(remoteProducerId)) return;
  consumingTransports.push(remoteProducerId);

  socket.emit("createWebRtcTransport", { consumer: true }, ({ params }) => {
    // The server sends back params needed
    // to create Send Transport on the client side
    // console.log(`PARAMS... ${params}`);
    if (params.error) {
      console.log(params.error);
      return;
    }

    let consumerTransport;
    try {
      consumerTransport = device.createRecvTransport(params);
    } catch (error) {
      // exceptions:
      // {InvalidStateError} if not loaded
      // {TypeError} if wrong arguments.
      console.log(error);
      return;
    }

    consumerTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          // Signal local DTLS parameters to the server side transport
          // see server's socket.on('transport-recv-connect', ...)
          socket.emit("transport-recv-connect", {
            dtlsParameters,
            serverConsumerTransportId: params.id,
          });

          // Tell the transport that parameters were transmitted.
          callback();
        } catch (error) {
          // Tell the transport that something was wrong
          errback(error);
        }
      }
    );

    connectRecvTransport(consumerTransport, remoteProducerId, params.id);
  });
};

// server informs the client of a new producer just joined
socket.on("new-producer", ({ producerId }) => {
  signalNewConsumerTransport(producerId);
});

const getProducers = () => {
  socket.emit("getProducers", (producerIds) => {
    // console.log(producerIds);
    // for each of the producer create a consumer
    // producerIds.forEach(id => signalNewConsumerTransport(id))
    producerIds.forEach(signalNewConsumerTransport);
  });
};

const connectRecvTransport = async (
  consumerTransport,
  remoteProducerId,
  serverConsumerTransportId
) => {
  // for consumer, we need to tell the server first
  // to create a consumer based on the rtpCapabilities and consume
  // if the router can consume, it will send back a set of params as below
  socket.emit(
    "consume",
    {
      rtpCapabilities: device.rtpCapabilities,
      remoteProducerId,
      serverConsumerTransportId,
    },
    async ({ params }) => {
      if (params.error) {
        console.log("Cannot Consume");
        return;
      }

      // console.log(`Consumer Params ${params}`);
      // then consume with the local consumer transport
      // which creates a consumer
      const consumer = await consumerTransport.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters,
      });

      consumerTransports = [
        ...consumerTransports,
        {
          consumerTransport,
          serverConsumerTransportId: params.id,
          producerId: remoteProducerId,
          consumer,
          producerSocketId: params.producerSocketId, // 삭제를 위해 데이터를 저장한다.
        },
      ];

      // destructure and retrieve the video track from the producer
      const { track } = consumer;
      let stream = new MediaStream([track]);

      // 비디오 트랙과 오디오 트랙을 분리하여 처리한다. (따로따로 producer 처리가 된다.)
      // params.producerSocketId 값으로 비디오와 음성에 해당하는 div를 하나 만든다.
      // 그리고 이 값을 이용하여 비디오도 설정하고 마이크 처리(음성 인식 추가)에도 사용한다.
      let videoParent = document.getElementById("video-parent-content");
      let videoDiv = document.getElementById(
        `video-div-${params.producerSocketId}`
      );
      if (!videoDiv) {
        videoDiv = document.createElement("div");
        videoDiv.setAttribute("class", "video-div");
        videoDiv.setAttribute("id", `video-div-${params.producerSocketId}`);
        videoParent.append(videoDiv);
      }

      // 오디오는 div 씌워서 추가(안 보여서 상관없음), video는 다른 것까지 묶어서 추가한다.
      if (params.kind == "audio") {
        let audioDiv = document.createElement("div");
        audioDiv.setAttribute("id", `audio-div-${params.producerSocketId}`);
        audioDiv.innerHTML =
          '<audio id="' + remoteProducerId + '" autoplay></audio>';
        videoParent.append(audioDiv);
      } else {
        videoDiv.innerHTML =
          '<div id="' +
          `video-cover-${remoteProducerId}` +
          '"class="video-cover" style="display: none;">카메라 OFF</div>' +
          '<video id="' +
          remoteProducerId +
          '" class="video" autoplay></video>' +
          '<div id="' +
          `video-status-${remoteProducerId}` +
          '" class="video-status">cam: ✔️ mike: ✔️</div>';
      }

      // 오디오와 비디오에 스트림을 추가한다.
      document.getElementById(remoteProducerId).srcObject = stream;

      // 오디오의 경우 음성 인식 처리를 추가한다.
      if (params.kind === "audio") {
        addVoiceRecognition(stream, videoDiv, remoteProducerId);
      }

      // the server consumer started with media paused
      // so we need to inform the server to resume
      socket.emit("consumer-resume", {
        serverConsumerId: params.serverConsumerId,
      });
    }
  );
};

socket.on("producer-closed", ({ remoteProducerId }) => {
  // server notification is received when a producer is closed
  // we need to close the client-side consumer and associated transport
  releaseVideoInfo(remoteProducerId);
});

export function handleCameraClick() {
  let playerId = socket.id;
  streams[playerId].getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });

  // 카메라 On/Off에 따른 커버 처리
  let vidoeCoverEl = document.getElementById(`video-cover-${playerId}`);
  let videoEl = document.getElementById(`video-${playerId}`);
  isCameraOn = !isCameraOn;

  showElement(isCameraOn ? videoEl : vidoeCoverEl);
  hideElement(isCameraOn ? vidoeCoverEl : videoEl);

  // 하단에 상태도 갱신한다.
  updateVideoStatus(playerId, isCameraOn, isMikeOn);
}

export function handleMikeClick() {
  let playerId = socket.id;
  streams[playerId].getAudioTracks().forEach((track) => {
    console.log(track);
    track.enabled = !track.enabled;
  });

  isMikeOn = !isMikeOn;
  updateVideoStatus(playerId, isCameraOn, isMikeOn);
}

async function changeDevice(aElement, localName) {
  let curDeviceEl = document.getElementById(`${localName}DropdownDiv`);
  let deviceId = aElement.getAttribute("href");
  console.log(`deviceId = ${deviceId} localName = ${localName}`);

  // 이미 해당 기기를 사용하고 있는 경우는 제외한다.
  if (curDeviceEl.innerText === aElement.innerHTML) return;

  if (localName === "speaker") {
    let video = document.getElementById(`video-${socket.id}`);
    attachSinkId(video, deviceId, () => {
      curDeviceEl.innerText = aElement.innerText;
    });
    return;
  }

  try {
    let constraints =
      localName === "camera"
        ? {
            audio: true,
            video: {
              deviceId: { exact: deviceId },
              width: {
                min: 180,
                max: 180,
              },
              height: {
                min: 120,
                max: 120,
              },
            },
          }
        : {
            audio: { deviceId: { exact: deviceId } },
            video: false,
          };

    // 기존에 있던 track을 삭제하고 새로운 track을 추가한다. (교체)
    let myStream = await navigator.mediaDevices.getUserMedia(constraints);
    let prevTrack =
      localName === "camera"
        ? streams[socket.id].getVideoTracks()[0]
        : streams[socket.id].getAudioTracks()[0];

    let newTrack =
      localName === "camera"
        ? myStream.getVideoTracks()[0]
        : myStream.getAudioTracks()[0];

    streams[socket.id].removeTrack(prevTrack);
    streams[socket.id].addTrack(newTrack);

    // 현재 flag에 따라 처리한다.
    localName === "camera"
      ? (newTrack.enabled = isCameraOn)
      : (newTrack.enabled = isMikeOn);

    curDeviceEl.innerText = aElement.innerText;
    console.log(`changed device ${aElement.innerText}`);
  } catch (error) {
    console.log(error);
  }
}

async function getDevicesByKind(kind) {
  let devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === kind);
}

function attachSinkId(element, sinkId, _success, _error) {
  if (typeof element.sinkId !== "undefined") {
    element
      .setSinkId(sinkId)
      .then(() => {
        console.log(`Success, audio output device attached: ${sinkId}`);
        if (_success) _success();
      })
      .catch((error) => {
        let errorMessage = error;
        if (error.name === "SecurityError") {
          errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
        }
        console.error(errorMessage);
        if (_error) _error();
        // Jump back to first output device in the list as it's the default.
        // audioOutputSelect.selectedIndex = 0;
      });
  } else {
    console.warn("Browser does not support output device selection.");
    if (_error) _error();
  }
}

export async function getDevices(kind, localName) {
  try {
    // 기기 리스트를 받고, 현재 기기 이름을 보여준다.
    let devices = await getDevicesByKind(kind);
    let deviceDropdown = document.getElementById(`${localName}Dropdown`);
    let curDeviceEl = document.getElementById(`${localName}DropdownDiv`);
    let curDevice;

    if (localName === "camera") {
      curDevice = streams[socket.id].getVideoTracks()[0];
    } else if (localName === "mike") {
      curDevice = streams[socket.id].getAudioTracks()[0];
    } else {
      let video = document.getElementById(`video-${socket.id}`);
      curDevice = devices.filter(
        (device) => device.deviceId === video.sinkId
      )[0];
    }

    deviceDropdown.innerHTML = "";
    curDeviceEl.innerText = curDevice.label;

    devices.forEach((device) => {
      const option = document.createElement("a");
      option.innerText = device.label;
      option.setAttribute("href", device.deviceId);
      option.addEventListener("click", (e) => {
        e.preventDefault();
        changeDevice(option, localName);
      });
      deviceDropdown.appendChild(option);
    });

    console.log(devices);
  } catch (e) {
    console.log(e);
  }
}
