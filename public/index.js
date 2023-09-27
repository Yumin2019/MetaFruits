// const socket = io(`ws://localhost:3000`);

import Player from "./Player.js";

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    Player.preload(this);

    // this images are used by tilemap
    this.load.image("beach_tileset", "assets/beach_tileset.png");
    this.load.image("beach_tileset2", "assets/beach_tileset2.png");
    this.load.image("house1", "assets/house1.png");
    this.load.image("house2", "assets/house2.png");
    this.load.tilemapTiledJSON("main_map", "assets/main_map.json");
  }

  createTileMap() {
    // create tilemap with tilemap.json
    const map = this.make.tilemap({
      key: "main_map",
      tileWidth: 32,
      tileHeight: 32,
    });

    // add tileset images to map
    map.addTilesetImage("beach_tileset");
    map.addTilesetImage("beach_tileset2");
    map.addTilesetImage("house1");
    map.addTilesetImage("house2");

    // create map's layer with layer name(Tiled) and used tileset
    const layer1 = map.createLayer(
      "Tile Layer 1",
      ["beach_tileset", "beach_tileset2"],
      0,
      0
    );
    const layer2 = map.createLayer(
      "Tile Layer 2",
      ["beach_tileset", "house1", "house2"],
      0,
      0
    );

    layer1.setCollisionByProperty({
      collides: true,
    });
    layer2.setCollisionByProperty({
      collides: true,
    });
    this.matter.world.convertTilemapLayer(layer1);
    this.matter.world.convertTilemapLayer(layer2);
  }

  createPlayer() {
    this.player = new Player({
      scene: this,
      x: 0,
      y: 0,
      texture: "cute_fruits",
      frame: "apple_idle_1",
    });
    this.player.inputKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  create() {
    this.createTileMap();
    this.createPlayer();
  }

  update() {
    this.player.update();
  }
}

const config = {
  type: Phaser.AUTO,
  type: Phaser.WEBGL,
  width: 512,
  height: 512,
  backgroundColor: "#999999",
  parent: "survival-game",
  scene: [MainScene],
  scale: {
    zoom: 2,
  },
  physics: {
    default: "matter",
    matter: {
      debug: true,
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
