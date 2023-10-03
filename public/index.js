// const socket = io(`ws://localhost:3000`);

import GameScene from "./scene/GameScene.js";
import HouseScene from "./scene/HouseScene.js";
import MainScene from "./scene/MainScene.js";

const config = {
  type: Phaser.CANVAS,
  width: 600, // 800, 400
  height: 300,
  backgroundColor: "#999999",
  parent: "game-root",
  scene: [MainScene, HouseScene],
  scale: {
    zoom: 2,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    mode: Phaser.Scale.FIT,
  },
  physics: {
    default: "matter",
    matter: {
      debug: {
        showBody: true,
        showStaticBody: true,
      },
      gravity: { y: 0 },
    },
  },
  plugins: {
    scene: [
      {
        plugin: PhaserMatterCollisionPlugin,
        key: "matterCollision",
        mapping: "matterCollision",
      },
    ],
  },
};

const game = new Phaser.Game(config);

game.global = {
  // global variables
  minimap: true,
};

const chattingInput = document.getElementById("chatting-input");
const chattingList = document.getElementById("chatting-list");
const chattingForm = document.getElementById("chatting-form");
const chattingOpen = document.getElementById("chatting-open");
const chattingClose = document.getElementById("chatting-close");
const chattingContainer = document.getElementById("chatting-container");

// 채팅 입력창 Focusing 처리
chattingInput.addEventListener("focusin", (event) => {
  game.input.keyboard.enabled = false;
});

chattingInput.addEventListener("focusout", (event) => {
  game.input.keyboard.enabled = true;
  chattingInput.blur();
});

game.canvas.addEventListener("mousedown", (event) => {
  game.input.keyboard.enabled = true;
  chattingInput.blur();
});

// ignore submit
chattingForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

// 채팅 On/Off
chattingOpen.addEventListener("click", (event) => {
  chattingContainer.style.display = "block";
});

chattingClose.addEventListener("click", (event) => {
  chattingContainer.style.display = "none";
});

// 채팅 엔터키
chattingInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter" && chattingInput.value.length > 0) {
    // 플레이어 상단에 메시지를 표출한다.
    let scenes = game.scene.getScenes();
    GameScene.setMessage(scenes.at(0), chattingInput.value);

    // 채팅창에 추가한다.
    let newDiv = document.createElement("div");
    newDiv.innerHTML = "apple: " + chattingInput.value;
    newDiv.className = "msger-text";
    chattingList.appendChild(newDiv);
    chattingInput.value = "";
    chattingList.scrollTop = chattingList.scrollHeight;
  }
});

const characterButton = document.getElementById("character-button");
const nameButton = document.getElementById("name-button");
const cameraButton = document.getElementById("camera-button");
const mikeButton = document.getElementById("mike-button");
const settingButton = document.getElementById("setting-button");
const minimapButton = document.getElementById("minimap-button");

characterButton.addEventListener("click", (event) => {
  console.log("characterButton");
  // <!-- 🍎🍓🍉🍐🍊🍋 -->
  // 캐릭터 변경
});

nameButton.addEventListener("click", (event) => {
  console.log("nameButton");
  // 이름 변경 다이얼로그 표시
});

cameraButton.addEventListener("click", (event) => {
  console.log("cameraButton");
  // 카메라 온오프, 상태 표시
});

mikeButton.addEventListener("click", (event) => {
  console.log("mikeButton");
  // 마이크 온오프, 상태 표시
});

settingButton.addEventListener("click", (event) => {
  // 설정 다이얼로그 처리
  console.log("settingButton");
});

minimapButton.addEventListener("click", (event) => {
  console.log("minimapButton");
  let scenes = game.scene.getScenes();
  GameScene.toggleMinimap(scenes.at(0));
});

// <div class="controller-charactor">🍎</div>
// <div class="controller-text">김유민</div>
// <div class="controller-camera">📷</div>
// <div class="controller-mike">🎤</div>
// <div class="controller-setting">⚙️</div>
