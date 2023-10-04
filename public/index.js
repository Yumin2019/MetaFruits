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

function randomNameGenerator(num) {
  let res = "";
  for (let i = 0; i < num; i++) {
    const random = Math.floor(Math.random() * 25); // 0 ~ 25
    res += String.fromCharCode(97 + random); // a to z
  }
  return res;
}

function getCurScene() {
  return game.scene.getScenes()[0];
}

function addChatting(text) {
  let newDiv = document.createElement("div");
  newDiv.innerHTML = text;
  newDiv.className = "msger-text";
  chattingList.appendChild(newDiv);
  chattingList.scrollTop = chattingList.scrollHeight;
}

const game = new Phaser.Game(config);

game.global = {
  // global variables
  minimap: true,
  character: "apple",
  name: randomNameGenerator(6),
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
    GameScene.setMessage(getCurScene(), chattingInput.value);

    // 채팅창에 추가한다.
    addChatting(`${game.global.name}: ${chattingInput.value}`);
    chattingInput.value = "";
  }
});

const characterButton = document.getElementById("character-button");
const nameButton = document.getElementById("name-button");

const settingButton = document.getElementById("setting-button");
const minimapButton = document.getElementById("minimap-button");

const nameDialog = document.getElementById("nameDialog");
const nameDialogInput = document.getElementById("nameDialog-input");
const nameDialogOk = document.getElementById("nameDialog-ok");

const cameraButton = document.getElementById("camera-button");
const mikeButton = document.getElementById("mike-button");
const cameraStatus = document.getElementById("camera-status");
const mikeStatus = document.getElementById("mike-status");

cameraStatus.style.display = "none";
mikeStatus.style.display = "none";

characterButton.addEventListener("click", (event) => {
  switch (game.global.character) {
    case "apple":
      characterButton.innerHTML = "🍓";
      game.global.character = "strawberry";
      break;
    case "strawberry":
      characterButton.innerHTML = "🍉";
      game.global.character = "watermelon";
      break;
    case "watermelon":
      characterButton.innerHTML = "🍐";
      game.global.character = "pear";
      break;
    case "pear":
      characterButton.innerHTML = "🍊";
      game.global.character = "orange";
      break;
    case "orange":
      characterButton.innerHTML = "🍋";
      game.global.character = "lemon";
      break;
    case "lemon":
      characterButton.innerHTML = "🍎";
      game.global.character = "apple";
      break;
  }

  GameScene.setMessage(
    getCurScene(),
    `Changed character to ${characterButton.innerHTML}`
  );
  addChatting(
    `${game.global.name} changed character to ${characterButton.innerHTML}`
  );
});

nameButton.innerText = game.global.name;
nameButton.addEventListener("click", (event) => {
  nameDialog.show();
  game.input.keyboard.enabled = false;
  nameDialogInput.value = game.global.name;
});

nameDialog.addEventListener("close", (event) => {
  game.input.keyboard.enabled = true;
});

nameDialogOk.addEventListener("click", (event) => {
  let name = nameDialogInput.value;
  if (name === game.global.name || name.length === 0) {
    event.preventDefault();
    return;
  }

  GameScene.setMessage(getCurScene(), `Changed name to ${name}`);
  addChatting(`${game.global.name} changed name to ${name}`);

  // 글로벌변수, 하단이름, 캐릭터 이름을 갱신한다.
  game.global.name = name;
  nameButton.innerText = name;
  GameScene.setName(getCurScene(), name);
});

cameraButton.addEventListener("click", (event) => {
  // 카메라 온오프, 상태 표시
  if (cameraStatus.style.display === "block") {
    cameraStatus.style.display = "none";
  } else {
    cameraStatus.style.display = "block";
  }

  // 실제 처리
});

mikeButton.addEventListener("click", (event) => {
  // 마이크 온오프, 상태 표시
  if (mikeStatus.style.display === "block") {
    mikeStatus.style.display = "none";
  } else {
    mikeStatus.style.display = "block";
  }

  // 실제 처리
});

settingButton.addEventListener("click", (event) => {
  // 설정 다이얼로그 처리
});

minimapButton.addEventListener("click", (event) => {
  GameScene.toggleMinimap(getCurScene());
});
