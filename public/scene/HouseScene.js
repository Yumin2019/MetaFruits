import GameScene from "./GameScene.js";

export default class HouseScene extends GameScene {
  constructor() {
    super({ sceneName: "HouseScene", mapName: "house_map" });
  }

  create() {
    super.create();
    super.createPortal({
      portalName: "portal1",
      destScene: "MainScene",
      x: 220,
      y: 1010,
      width: 90,
      height: 12,
      data: { spawnPosX: 400, spawnPosY: 230 },
    });

    super.createPortal({
      portalName: "portal2",
      destScene: "MainScene",
      x: 800,
      y: 1010,
      width: 90,
      height: 12,
      data: { spawnPosX: 590, spawnPosY: 230 },
    });
  }
}
