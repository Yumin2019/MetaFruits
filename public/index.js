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
};

const chattingInput = document.getElementById("chatting-input");
const chattingList = document.getElementById("chatting-list");

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
