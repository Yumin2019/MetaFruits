import GameScene from "../scene/GameScene.js";
import mediasoupClient from "mediasoup-client";
import { game, getCurScene, getInActiveScene } from "../index.js";
import {
  addChatting,
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
let consumingTransports = [];
let streams = {};

let isCameraOn = true;
let isMikeOn = true;

let myVideoDiv;

function colorPids(vol) {
  const allPids = [...document.querySelectorAll(".pid")];
  const numberOfPidsToColor = Math.round(vol / 10);
  const pidsToColor = allPids.slice(0, numberOfPidsToColor);
  for (const pid of allPids) {
    pid.style.backgroundColor = "#e6e7e8";
  }
  for (const pid of pidsToColor) {
    pid.style.backgroundColor = "#99d9ea";
  }
}

const streamSuccess = async (stream) => {
  // 스트림이 들어오면 영상 뷰를 추가한다.
  let playerId = socket.id;
  streams[playerId] = stream;
  // console.log(streams[playerId]);

  audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
  videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

  let videoDiv = document.createElement("div");
  videoDiv.setAttribute("class", "video-div");
  videoDiv.setAttribute("id", `vidoe-div-${playerId}`);
  myVideoDiv = videoDiv;

  // ID는 video-div-${id}, vidoe-${id}, video-status-${id}, video-cover-${id}로 관리한다.
  videoDiv.innerHTML =
    '<video id="' +
    `video-${playerId}` +
    '" class="video" autoplay></video>' +
    '<div id="' +
    `video-cover-${playerId}` +
    '"class="video-cover" style="display: none;">카메라 OFF</div>' +
    '<div id="' +
    `video-status-${playerId}` +
    '" class="video-status">cam: ✔️ mike: ✔️</div>';

  let videoParent = document.getElementById("video-parent-content");
  videoParent.appendChild(videoDiv);

  let video = document.getElementById(`video-${playerId}`);
  video.srcObject = stream;

  // speaker 기본값으로 설정
  let devices = await getDevicesByKind("audiooutput");
  attachSinkId(video, devices[0].deviceId);

  // 음성 볼륨 인식
  let audioContext = new AudioContext();
  let analyser = audioContext.createAnalyser();
  let microphone = audioContext.createMediaStreamSource(stream);
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

    if (mikeTest) colorPids(average);
    myVideoDiv.style.border = `4px solid ${
      average > 10 ? "#99d9ea" : "#9f9f9f"
    }`;
    // console.log(average);
  };

  joinRoom();
};

const joinRoom = () => {
  // socket.emit("joinRoom", { roomName }, (data) => {
  //   console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
  //   // we assign to local variable and will be used when
  //   // loading the client Device (see createDevice above)
  //   rtpCapabilities = data.rtpCapabilities;
  //   // once we have rtpCapabilities from the Router, create Device
  //   createDevice();
  // });
};

let isAudioEnabledForDebug = true;

export const getLocalStream = () => {
  navigator.mediaDevices
    .getUserMedia({
      audio: isAudioEnabledForDebug, // false,
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

// async function handleCameaChange() {
//   await getMedia(camearsSelect.value);
//   if (sendPeer) {
//     const videoTrack = myStream.getVideoTracks()[0];
//     const videoSender = sendPeer
//       .getSenders()
//       .find((sender) => sender.track.kind === "video");

//     videoSender.replaceTrack(videoTrack);
//   }
// }

async function changeDevice(aElement, localName) {
  let curDeviceEl = document.getElementById(`${localName}DropdownDiv`);
  let deviceId = aElement.getAttribute("href");
  console.log(localName);
  console.log(deviceId);

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
            audio: false,
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

// export async function getCameras() {
//   try {
//     // 카메라 리스트를 받고, 현재 카메라 이름을 보여준다.
//     let cameras = getDevices("videoinput");
//     let cameraDropdown = document.getElementById("cameraDropdown");
//     let curCameraEl = document.getElementById("cameraDropdownDiv");
//     let currentCamera = streams[socket.id].getVideoTracks()[0];

//     cameraDropdown.innerHTML = "";
//     curCameraEl.innerText = currentCamera.label;

//     cameras.forEach((camera) => {
//       const option = document.createElement("a");
//       option.innerText = camera.label;
//       option.setAttribute("href", camera.deviceId);
//       option.addEventListener("click", (e) => {
//         e.preventDefault();
//         changeCamera(option);
//       });
//       cameraDropdown.appendChild(option);
//     });

//     console.log(cameras);
//   } catch (e) {
//     console.log(e);
//   }
// }
