import GameScene from "./scene/GameScene.js";
import HouseScene from "./scene/HouseScene.js";
import MainScene from "./scene/MainScene.js";
import PhaserMatterCollisionPlugin from "phaser-matter-collision-plugin";

const config = {
  type: Phaser.CANVAS,
  width: 600,
  height: 300,
  backgroundColor: "#c8c8c8", // rgb(200, 200, 200)
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
      debug: false,
      // debug: {
      //   showBody: true,
      //   showStaticBody: true,
      // },
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

export var game = new Phaser.Game(config);
game.global = {
  minimap: true,
  character: "apple",
  name: "",
  playerId: "",
  chattingChannel: "all", // all, room
  allChattingList: [],
  roomChattingList: [],
};

export function playButtonEffect() {
  GameScene.playButtonEffect(getCurScene());
}

export function getCurScene() {
  return game.scene.getScenes()[0];
}

export function getInActiveScene(sceneName) {
  return game.scene
    .getScenes(false)
    .filter((data) => data.constructor.name === sceneName)[0];
}
