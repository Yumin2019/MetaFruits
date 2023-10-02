import Player from "../Player.js";

export default class GameScene extends Phaser.Scene {
  constructor(data) {
    // sceneName: Phaser Scene 변수
    // mapName: map json 이름
    const { sceneName, mapName } = data;
    super({
      key: sceneName,
    });
    this.mapName = mapName;
  }

  init(data) {
    this.spawnPosX = data.spawnPosX || 400;
    this.spawnPosY = data.spawnPosY || 300;
  }

  preload() {
    Player.preload(this);

    // 공통 리소스를 로드한다.
    this.load.image("beach_tileset", "../assets/beach_tileset_extruded.png");
    this.load.image("beach_tileset2", "../assets/beach_tileset2_extruded.png");
    this.load.image("house1", "../assets/house1.png");
    this.load.image("house2", "../assets/house2.png");
    this.load.tilemapTiledJSON(this.mapName, `../assets/${this.mapName}.json`);
  }

  create() {
    this.createTileMap();
    this.createPlayer();
    this.createTextInfo();

    // add main camera to player
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.matter.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player);
  }

  updateTextInfo() {
    this.posText.setText(
      `x: ${Math.round(this.player.x)}\ny: ${Math.round(
        this.player.y
      )}\nfps: ${Math.round(this.game.loop.actualFps)}`
    );
  }

  update() {
    this.player.update();
    this.updateTextInfo();
  }

  createTextInfo() {
    this.posText = this.add
      .text(8, 8, "", {
        font: "16px",
        fill: "#000000",
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  createPortal(portalData) {
    // {portalName: "", destScene: "", x, y, width, height, data(json) }
    const { portalName, destScene, x, y, width, height } = portalData;
    const data = portalData.data || {};

    let portal = this.matter.add.rectangle(x, y, width, height);
    portal.onCollideCallback = (pair) => {
      if (pair.bodyA.label === "playerSensor") {
        this.scene.start(destScene, data);
      }
    };

    this.matter.add.gameObject(portal, {
      isStatic: true,
      label: portalName,
    });
  }

  createTileMap() {
    // create tilemap with tilemap.json
    const map = this.make.tilemap({
      key: this.mapName,
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
      x: this.spawnPosX,
      y: this.spawnPosY,
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
}
