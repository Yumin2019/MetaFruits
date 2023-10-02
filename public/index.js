// const socket = io(`ws://localhost:3000`);

import MainScene from "./scene/MainScene.js";

const config = {
  type: Phaser.AUTO,
  width: 600, // 800, 400
  height: 300,
  backgroundColor: "#999999",
  parent: "survival-game",
  scene: [MainScene],
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
