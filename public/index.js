import GameScene from "./scene/GameScene.js";
import HouseScene from "./scene/HouseScene.js";
import MainScene from "./scene/MainScene.js";

function setMyPlayer(scene, player) {
  nameButton.innerText = player.name;
  switch (player.character) {
    case "apple":
      characterButton.innerHTML = "🍎";
      break;
    case "strawberry":
      characterButton.innerHTML = "🍓";
      break;
    case "watermelon":
      characterButton.innerHTML = "🍉";
      break;
    case "pear":
      characterButton.innerHTML = "🍐";
      break;
    case "orange":
      characterButton.innerHTML = "🍊";
      break;
    case "lemon":
      characterButton.innerHTML = "🍋";
      break;
  }

  GameScene.setMyPlayer(scene, player);
}

// Socket Code
const socket = io();
socket.on("currentPlayers", (players) => {
  // currentScene
  // 플레이어 정보 추가
  // GameScene.eventQueue: Scene이 초기화되지 않은 경우 콜백을 등록하여 처리
  let player = players[socket.id];
  if (getCurScene()) {
    setMyPlayer(getCurScene(), player);
  } else {
    GameScene.eventQueue.push(() => {
      setMyPlayer(getInActiveScene(), player);
    });
  }

  // 다른 플레이어의 정보를 추가한다.
  delete players[socket.id];
  console.log(players);

  let playerArray = Object.values(players);
  playerArray.forEach((player) => {
    if (getCurScene()) {
      GameScene.addPlayer(getCurScene(), player);
    } else {
      GameScene.eventQueue.push(() => {
        GameScene.addPlayer(getInActiveScene(), player);
      });
    }
  });
});

socket.on("newPlayer", (player) => {
  GameScene.addPlayer(getCurScene(), player);
});

socket.on("exitPlayer", (playerId) => {
  GameScene.removePlayer(getCurScene(), playerId);
});

socket.on("updatePlayer", (player) => {
  GameScene.updatePlayer(getCurScene(), player);
});

socket.on("chatting", (data) => {
  const { playerId, message, name } = data;
  GameScene.setMessage(getCurScene(), playerId, message);
  addChatting(`${name}: ${message}`);
});

// 토스트 메시지를 처리한다. (CurrentScene)
socket.on("toast", (data) => {
  const { playerId, containerMessage } = data;
  GameScene.setMessage(getCurScene(), playerId, containerMessage);
});

const config = {
  type: Phaser.CANVAS,
  width: 600, // 800, 400
  height: 300,
  backgroundColor: "#999999",
  parent: "game-root",
  scene: [MainScene, HouseScene],
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

function getCurScene() {
  return game.scene.getScenes()[0];
}

function getInActiveScene() {
  return game.scene.getScenes(false)[0];
}

function addChatting(text) {
  let newDiv = document.createElement("div");
  newDiv.innerHTML = text;
  newDiv.className = "msger-text";
  chattingList.appendChild(newDiv);
  chattingList.scrollTop = chattingList.scrollHeight;
}

const game = new Phaser.Game(config);

game.global = {
  // global variables
  minimap: true,
  character: "apple",
  name: "",
  playerId: "",
  socket: socket,
};

const chattingInput = document.getElementById("chatting-input");
const chattingList = document.getElementById("chatting-list");
const chattingForm = document.getElementById("chatting-form");
const chattingOpen = document.getElementById("chatting-open");
const chattingClose = document.getElementById("chatting-close");
const chattingContainer = document.getElementById("chatting-container");

// 채팅 입력창 Focusing 처리
chattingInput.addEventListener("focusin", (event) => {
  game.input.keyboard.enabled = false;
});

chattingInput.addEventListener("focusout", (event) => {
  game.input.keyboard.enabled = true;
  chattingInput.blur();
});

game.canvas.addEventListener("mousedown", (event) => {
  game.input.keyboard.enabled = true;
  chattingInput.blur();
});

// ignore submit
chattingForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

// 채팅 On/Off
chattingOpen.addEventListener("click", (event) => {
  chattingContainer.style.display = "block";
  chattingOpen.style.display = "none";
});

chattingContainer.style.display = "none";
chattingClose.addEventListener("click", (event) => {
  chattingContainer.style.display = "none";
  chattingOpen.style.display = "block";
});

// 채팅 엔터키
chattingInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter" && chattingInput.value.length > 0) {
    // 플레이어 상단에 메시지를 표출한다.
    GameScene.setMessage(getCurScene(), socket.id, chattingInput.value);

    // 채팅창에 추가한다.
    socket.emit("chatting", {
      playerId: socket.id,
      message: chattingInput.value,
      name: game.global.name,
    });
    addChatting(`${game.global.name}: ${chattingInput.value}`);
    chattingInput.value = "";
  }
});

const characterButton = document.getElementById("character-button");
const nameButton = document.getElementById("name-button");

const settingButton = document.getElementById("setting-button");
const minimapButton = document.getElementById("minimap-button");

const nameDialog = document.getElementById("nameDialog");
const nameDialogInput = document.getElementById("nameDialog-input");
const nameDialogOk = document.getElementById("nameDialog-ok");

const deviceDialog = document.getElementById("deviceDialog");
const deviceDialogOk = document.getElementById("deviceDialog-ok");

const cameraButton = document.getElementById("camera-button");
const mikeButton = document.getElementById("mike-button");
const cameraStatus = document.getElementById("camera-status");
const mikeStatus = document.getElementById("mike-status");

cameraStatus.style.display = "none";
mikeStatus.style.display = "none";

characterButton.addEventListener("click", (event) => {
  switch (game.global.character) {
    case "apple":
      characterButton.innerHTML = "🍓";
      game.global.character = "strawberry";
      break;
    case "strawberry":
      characterButton.innerHTML = "🍉";
      game.global.character = "watermelon";
      break;
    case "watermelon":
      characterButton.innerHTML = "🍐";
      game.global.character = "pear";
      break;
    case "pear":
      characterButton.innerHTML = "🍊";
      game.global.character = "orange";
      break;
    case "orange":
      characterButton.innerHTML = "🍋";
      game.global.character = "lemon";
      break;
    case "lemon":
      characterButton.innerHTML = "🍎";
      game.global.character = "apple";
      break;
  }

  let containerMessage = `Changed character to ${characterButton.innerHTML}`;
  GameScene.setMessage(getCurScene(), socket.id, containerMessage);

  // 캐릭터 변경 이벤트(받는 쪽에선 그대로 처리)
  socket.emit("character", {
    playerId: socket.id,
    containerMessage,
    character: game.global.character,
  });
});

nameButton.innerText = game.global.name;
nameButton.addEventListener("click", (event) => {
  nameDialog.open ? nameDialog.close() : nameDialog.show();
  game.input.keyboard.enabled = !nameDialog.open;
  if (nameDialog.open) nameDialogInput.value = game.global.name;
});

nameDialog.addEventListener("close", (event) => {
  game.input.keyboard.enabled = true;
});

nameDialogOk.addEventListener("click", (event) => {
  let name = nameDialogInput.value;
  if (name === game.global.name || name.length === 0) {
    event.preventDefault();
    return;
  }

  let containerMessage = `Changed name to ${name}`;
  GameScene.setMessage(getCurScene(), socket.id, containerMessage);

  // 글로벌변수, 하단이름, 캐릭터 이름을 갱신한다.
  game.global.name = name;
  nameButton.innerText = name;
  GameScene.setName(getCurScene(), name);

  // 이름 변경 이벤트(받는 쪽에선 그대로 처리)
  socket.emit("name", {
    playerId: socket.id,
    containerMessage,
    name,
  });
});

deviceDialog.addEventListener("close", (event) => {
  game.input.keyboard.enabled = true;
});

deviceDialogOk.addEventListener("click", (event) => {});

cameraButton.addEventListener("click", (event) => {
  // 카메라 온오프, 상태 표시
  if (cameraStatus.style.display === "block") {
    cameraStatus.style.display = "none";
  } else {
    cameraStatus.style.display = "block";
  }

  // 실제 처리
});

mikeButton.addEventListener("click", (event) => {
  // 마이크 온오프, 상태 표시
  if (mikeStatus.style.display === "block") {
    mikeStatus.style.display = "none";
  } else {
    mikeStatus.style.display = "block";
  }

  // 실제 처리
});

settingButton.addEventListener("click", (event) => {
  deviceDialog.open ? deviceDialog.close() : deviceDialog.show();
  game.input.keyboard.enabled = !deviceDialog.open;
});

minimapButton.addEventListener("click", (event) => {
  GameScene.toggleMinimap(getCurScene());
});

// 장치 설정쪽
const cameraDropdown = document.getElementById("cameraDropdown");
const cameraDropdownDiv = document.getElementById("cameraDropdownDiv");
const mikeDropdown = document.getElementById("mikeDropdown");
const mikeDropdownDiv = document.getElementById("mikeDropdownDiv");
const speakerDropdown = document.getElementById("speakerDropdown");
const speakerDropdownDiv = document.getElementById("speakerDropdownDiv");

cameraDropdownDiv.addEventListener("click", (event) => {
  cameraDropdown.classList.toggle("show");
});

mikeDropdownDiv.addEventListener("click", (event) => {
  mikeDropdown.classList.toggle("show");
});

speakerDropdownDiv.addEventListener("click", (event) => {
  speakerDropdown.classList.toggle("show");
});

// Close the dropdown menu if the user clicks outside of it
window.onclick = function (event) {
  if (!event.target.matches(".dropbtn")) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};
