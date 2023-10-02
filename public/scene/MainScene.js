import GameScene from "./GameScene.js";

export default class MainScene extends GameScene {
  constructor() {
    super("MainScene");
  }

  preload() {
    super.preload();

    // this images are used by tilemap
    this.load.image("beach_tileset", "../assets/beach_tileset_extruded.png");
    this.load.image("beach_tileset2", "../assets/beach_tileset2_extruded.png");
    this.load.image("house1", "../assets/house1.png");
    this.load.image("house2", "../assets/house2.png");
    this.load.tilemapTiledJSON("main_map", "../assets/main_map.json");
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

  createPortal() {
    this.portal1 = this.matter.add.rectangle(398, 185, 32, 32, 0x9966ff);
    this.portal1.label = "portal";
    this.portal1.onCollideCallback = (pair) => {
      if (pair.bodyA.label === "playerSensor") {
        console.log("포탈 충돌");
      }
    };

    this.matter.add.gameObject(this.portal1, {
      isStatic: true,
      label: "portal1",
    });

    this.portal2 = this.matter.add.rectangle(593, 185, 32, 32, 0x9966ff);
    this.portal2.label = "portal2";
    this.portal2.onCollideCallback = (pair) => {
      if (pair.bodyA.label === "playerSensor") {
        console.log("포탈 충돌");
      }
    };

    this.matter.add.gameObject(this.portal2, {
      label: "portal2",
      isStatic: true,
    });
  }

  create() {
    super.create();
    this.createPortal();
  }

  update() {
    super.update();
  }
}
