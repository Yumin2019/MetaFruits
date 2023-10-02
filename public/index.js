// const socket = io(`ws://localhost:3000`);

import Player from "./Player.js";

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    Player.preload(this);

    // this images are used by tilemap
    this.load.image("beach_tileset", "assets/beach_tileset_extruded.png");
    this.load.image("beach_tileset2", "assets/beach_tileset2_extruded.png");
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

    this.mapWidth = map["widthInPixels"];
    this.mapHeight = map["heightInPixels"];

    // add tileset images to map
    map.addTilesetImage("beach_tileset", "beach_tileset", 34, 34, 0, 0);
    map.addTilesetImage("beach_tileset2", "beach_tileset2", 34, 34, 0, 0);
    map.addTilesetImage("house1", "house1", 32, 32, 0, 0);
    map.addTilesetImage("house2", "house2", 32, 32, 0, 0);

    // create map's layer with layer name(Tiled) and used tileset
    const backgroundLayer = map.createLayer(
      "Background",
      ["beach_tileset", "beach_tileset2"],
      0,
      0
    );
    const itemsLayer = map.createLayer(
      "Items",
      ["beach_tileset", "house1", "house2"],
      0,
      0
    );

    const bridgeLayer = map.createLayer("Bridge", ["beach_tileset"], 0, 0);

    itemsLayer.setDepth(10);
    backgroundLayer.setCollisionByProperty({
      collides: true,
    });
    bridgeLayer.setCollisionByProperty({
      collides: true,
    });
    itemsLayer.setCollisionByProperty({
      collides: true,
    });
    this.matter.world.convertTilemapLayer(backgroundLayer);
    this.matter.world.convertTilemapLayer(bridgeLayer);
    this.matter.world.convertTilemapLayer(itemsLayer);
  }

  createPlayer() {
    this.player = new Player({
      scene: this,
      x: 250,
      y: 250,
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

    // add main camera to player
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.matter.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player);
  }

  update() {
    this.player.update();
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 400,
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
      debug: false,
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
