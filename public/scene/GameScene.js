import Player from "../Player.js";

export default class GameScene extends Phaser.Scene {
  constructor(sceneName) {
    super({
      key: sceneName,
    });
  }

  preload() {
    Player.preload(this);
  }

  create() {
    this.createTileMap();
    this.createPlayer();

    this.posText = this.add
      .text(8, 8, "test", {
        font: "16px",
        fill: "#000000",
      })
      .setScrollFactor(0)
      .setDepth(100);

    // add main camera to player
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.matter.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player);
  }

  update() {
    this.player.update();

    this.posText.setText(
      `x: ${Math.round(this.player.x)}\ny: ${Math.round(
        this.player.y
      )}\nfps: ${Math.round(this.game.loop.actualFps)}`
    );
  }

  createTileMap() {}

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
}
