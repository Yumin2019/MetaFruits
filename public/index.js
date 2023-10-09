import HouseScene from "./scene/HouseScene.js";
import MainScene from "./scene/MainScene.js";

export function getCurScene() {
  return game.scene.getScenes()[0];
}

export function getInActiveScene(sceneName) {
  return game.scene
    .getScenes(false)
    .filter((data) => data.constructor.name === sceneName)[0];
}

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

export const game = new Phaser.Game(config);
game.global = {
  minimap: true,
  character: "apple",
  name: "",
  playerId: "",
  chattingChannel: "all", // all, room
  allChattingList: [],
  roomChattingList: [],
};

game.canvas.addEventListener("mousedown", (event) => {
  game.input.keyboard.enabled = true;
  document.getElementById("chatting-input").blur();
});
