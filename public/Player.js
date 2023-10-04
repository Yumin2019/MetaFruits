export default class Player extends Phaser.Physics.Matter.Sprite {
  constructor(data) {
    let { scene, x, y, texture, frame } = data;
    super(scene.matter.world, x, y, texture, frame);
    this.scene.add.existing(this);

    const { Body, Bodies } = Phaser.Physics.Matter.Matter;
    var playerCollider = Bodies.circle(this.x, this.y, 12, {
      isSenor: false,
      label: "playerCollider",
    });
    var playerSensor = Bodies.circle(this.x, this.y, 12, {
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
  }

  static preload(scene) {
    scene.load.atlas(
      "cute_fruits",
      "assets/cute_fruits.png",
      "assets/cute_fruits_atlas.json"
    );
    scene.load.animation("fruits_anim", "assets/cute_fruits_anim.json");
  }

  update() {
    const speed = 5.0; //2.5;
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
  }
}
