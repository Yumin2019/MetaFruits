import { socket } from "../gameLogic/SocketLogic.js";
import GameScene from "../scene/GameScene.js";

export default class Player extends Phaser.Physics.Matter.Sprite {
  constructor(data) {
    let { scene, x, y, texture, frame, isMyInfo, playerId } = data;
    super(scene.matter.world, x, y, texture, frame);
    this.scene.add.existing(this);

    const { Body, Bodies } = Phaser.Physics.Matter.Matter;
    let playerCollider = Bodies.circle(this.x, this.y, 12, {
      isSenor: false,
      label: "playerCollider",
    });
    let playerSensor = Bodies.circle(this.x, this.y, 12, {
      isSensor: true,
      label: "playerSensor",
      onCollideCallback: (pair) => {},
    });

    const compoundBody = Body.create({
      parts: [playerCollider, playerSensor],
      frictionAir: 0.35,
    });

    this.setExistingBody(compoundBody);
    this.setFixedRotation();
    this.isKeyPressed = false;
    this.isMyInfo = isMyInfo;
    this.playerId = playerId;
    this.oldPosition = {
      x: 0,
      y: 0,
    };
  }

  static preload(scene) {
    scene.load.atlas(
      "cute_fruits",
      "assets/cute_fruits.png",
      "assets/cute_fruits_atlas.json"
    );
    scene.load.animation("fruits_anim", "assets/cute_fruits_anim.json");
  }

  // this function is only called by my player
  update() {
    // 미니맵 키
    if (this.inputKeys.minimap.isDown) {
      if (!this.isKeyPressed) {
        this.isKeyPressed = true;
        GameScene.toggleMinimap(this.scene);
      }
    }

    if (this.inputKeys.minimap.isUp) {
      this.isKeyPressed = false;
    }

    // 플레이어 이동
    const speed = 5.0;
    let playerVelocity = new Phaser.Math.Vector2();
    if (this.inputKeys.left.isDown) {
      playerVelocity.x = -1;
      this.setFlipX(true);
    } else if (this.inputKeys.right.isDown) {
      playerVelocity.x = 1;
      this.setFlipX(false);
    }

    if (this.inputKeys.up.isDown) {
      playerVelocity.y = -1;
    } else if (this.inputKeys.down.isDown) {
      playerVelocity.y = 1;
    }

    playerVelocity.scale(speed);
    this.setVelocity(playerVelocity.x, playerVelocity.y);

    if (playerVelocity.x === 0 && playerVelocity.y === 0) {
      this.anims.play(`${this.scene.game.global.character}_idle`, true);
    } else {
      this.anims.play(`${this.scene.game.global.character}_walk`, true);
    }

    // 위치의 변화가 있었다면 서버에 데이터를 보낸다.
    if (this.x !== this.oldPosition.x || this.y != this.oldPosition.y) {
      socket.emit("playerMovement", {
        x: this.x,
        y: this.y,
        flipX: this.flipX,
        curAnim: this.anims.getName(),
      });
    }

    this.oldPosition = {
      x: this.x,
      y: this.y,
    };
  }
}
