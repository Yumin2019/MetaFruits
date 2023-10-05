import Player from "../Player.js";

export default class GameScene extends Phaser.Scene {
  constructor(data) {
    // sceneName: Phaser Scene 변수, mapName: map json 이름
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

  static setName(scene, name) {
    scene.nameText.setText(name);
  }

  static setMessage(scene, message) {
    // 받은 메시지를 토대로 메시지를 표출한다.
    // 메시지가 너무 긴 경우 잘라서 처리한다.
    let text = "";
    if (message.length <= 25) {
      text = message;
    } else {
      let count = parseInt(message.length / 25) + 1;
      for (let i = 0; i < count; i++) {
        text += message.substring(i * 25, (i + 1) * 25);
        if (i != count - 1) text += "\n";
      }
    }

    scene.messageRect.clear();
    scene.messageText.setText(text);
    scene.container.setActive(true).setVisible(true);
    if (scene.tweenAnim) scene.tweenAnim.destroy();

    scene.messageWidth = scene.messageText.width + scene.messagePadding * 2;
    scene.messageHeight = scene.messageText.height + scene.messagePadding * 2;
    scene.messageRect
      .lineStyle(2, 0x000000, 1)
      .fillStyle(0xffffff, 1.0)
      .fillRoundedRect(0, 0, scene.messageWidth, scene.messageHeight, 5)
      .strokeRoundedRect(0, 0, scene.messageWidth, scene.messageHeight, 5);

    // Tween 애니메이션은 재활용이 안 된다.
    scene.tweenAnim = scene.tweens.add({
      targets: [scene.container],
      ease: "Sine.easeInOut",
      duration: 4000,
      alpha: {
        getStart: () => 1.0,
        getEnd: () => 0.0,
      },
      onComplete: () => {
        scene.container.setActive(false).setVisible(false);
      },
    });
  }

  createMessageContainer() {
    // 메시지 컨테이너를 생성한다. 세부 설정은 하지 않음
    this.messageWidth = 0;
    this.messageHeight = 0;
    this.messagePadding = 2;

    // positions are relative to the container
    this.messageRect = this.add.graphics();
    this.messageText = this.add
      .text(this.messagePadding, this.messagePadding, "")
      .setFont("10px")
      .setColor("#000000");

    this.container = this.add
      .container(0, 0, [this.messageRect, this.messageText])
      .setDepth(100)
      .setVisible(false)
      .setActive(false);
  }

  create() {
    this.createTileMap();
    this.createPlayer();
    this.createText();
    this.createMessageContainer();
    this.createCamera();
  }

  updateTextInfo() {
    // update left top info text
    this.posText.setText(
      `x: ${Math.round(this.player.x)}\ny: ${Math.round(
        this.player.y
      )}\nfps: ${Math.round(this.game.loop.actualFps)}`
    );

    // update name text
    this.nameText.x = this.player.x - this.nameText.width * 0.5;
    this.nameText.y =
      this.player.y - this.player.height * 0.5 - this.nameText.height;
  }

  updateMessageContainer() {
    // player's offset is 0.5
    // x는 중간에 오도록 처리하고 y는 플레이어 상단 기준에서 메시지 크기 만큼 올린다. (12 is yOffset)
    if (this.container.visible) {
      this.container.x = this.player.x - this.messageWidth * 0.5;
      this.container.y =
        this.player.y - this.player.height * 0.5 - this.messageHeight - 12;
    }
  }

  update() {
    this.player.update();
    this.updateTextInfo();
    this.updateMessageContainer();
  }

  createText() {
    this.posText = this.add
      .text(0, 0, "", {
        font: "16px",
        fill: "#000000",
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.nameText = this.add
      .text(0, 0, this.game.global.name)
      .setFont("10px")
      .setColor("#000000");
  }

  createCamera() {
    // add main camera to player
    this.cameras.main
      .setBounds(0, 0, this.mapWidth, this.mapHeight)
      .setName("MainCamera");
    this.matter.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player);

    // 미니맵 추가
    let { width, height } = this.game.canvas;

    // offset 0.5, leftTop을 기준으로 배치한다.
    this.minimapBackground = this.add
      .rectangle(
        parseInt(this.mapWidth * 0.05 + width - this.mapWidth * 0.1) - 4,
        parseInt(this.mapHeight * 0.05 + height - this.mapHeight * 0.1) - 4,
        parseInt(this.mapWidth * 0.1) + 8,
        parseInt(this.mapHeight * 0.1) + 8,
        0x9dde85
      )
      .setDepth(100)
      .setScrollFactor(0);

    this.minimap = this.cameras
      .add(
        parseInt(width - this.mapWidth * 0.1) - 4,
        parseInt(height - this.mapHeight * 0.1) - 4,
        parseInt(this.mapWidth * 0.1),
        parseInt(this.mapHeight * 0.1)
      )
      .setZoom(0.1)
      .setName("MiniMap")
      .setScroll(this.mapWidth * 0.45, this.mapHeight * 0.45)
      .ignore(this.minimapBackground); // ignore background object

    // 미니앱이 off 상태인 경우, 생성까지만 진행한다.
    if (!this.game.global.minimap) {
      this.minimapBackground.setActive(false).setVisible(false);
      this.cameras.remove(this.minimap, false);
    }
  }

  static toggleMinimap(scene) {
    let flag = !scene.minimapBackground.active;
    scene.game.global.minimap = flag;
    scene.minimapBackground.setActive(flag).setVisible(flag);

    // remove: 카메라를 재사용하는 경우 2번째 인자를 false로 주고,
    // 나중에 CameraManager에 해당 카메라를 추가하여 사용한다.
    if (flag) scene.cameras.addExisting(scene.minimap);
    else scene.cameras.remove(scene.minimap, false);
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
      frame: `${this.game.global.character}_idle_1`,
    });

    this.player.inputKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      minimap: Phaser.Input.Keyboard.KeyCodes.M,
    });
  }
}
