import GameScene from "../scene/GameScene.js";
import { game, getCurScene } from "../index.js";
import { addChatting, setChattingList } from "./GameFunc.js";
import {
  getDevices,
  getLocalStream,
  handleCameraClick,
  handleMikeClick,
  socket,
} from "./SocketLogic.js";

// 채팅 UI
export const chattingInput = document.getElementById("chatting-input");
export const chattingList = document.getElementById("chatting-list");
export const chattingOpen = document.getElementById("chatting-open");
export const chattingClose = document.getElementById("chatting-close");
export const chattingContainer = document.getElementById("chatting-container");
export const chattingChannel = document.getElementById("chatting-channel");

chattingContainer.style.display = "none";

// 하단 컨트롤러
export const characterButton = document.getElementById("character-button");
export const nameButton = document.getElementById("name-button");
export const settingButton = document.getElementById("setting-button");
export const minimapButton = document.getElementById("minimap-button");

export const cameraButton = document.getElementById("camera-button");
export const mikeButton = document.getElementById("mike-button");
export const cameraStatus = document.getElementById("camera-status");
export const mikeStatus = document.getElementById("mike-status");

cameraStatus.style.display = "none";
mikeStatus.style.display = "none";

// 이름 변경 Dialog
export const nameDialog = document.getElementById("nameDialog");
export const nameDialogInput = document.getElementById("nameDialog-input");
export const nameDialogOk = document.getElementById("nameDialog-ok");
export const nameDialogClose = document.getElementById("nameDialog-close");

// 장치설정 Dialog
export const deviceDialog = document.getElementById("deviceDialog");
export const deviceDialogOk = document.getElementById("deviceDialog-ok");
export const deviceDialogClose = document.getElementById("deviceDialog-close");

// 장치 설정쪽
export const cameraDropdown = document.getElementById("cameraDropdown");
export const cameraDropdownDiv = document.getElementById("cameraDropdownDiv");
export const mikeDropdown = document.getElementById("mikeDropdown");
export const mikeDropdownDiv = document.getElementById("mikeDropdownDiv");
export const speakerDropdown = document.getElementById("speakerDropdown");
export const speakerDropdownDiv = document.getElementById("speakerDropdownDiv");

// 채팅 입력창 Focusing 처리
chattingInput.addEventListener("focusin", (event) => {
  game.input.keyboard.enabled = false;
});

chattingInput.addEventListener("focusout", (event) => {
  game.input.keyboard.enabled = true;
  chattingInput.blur();
});

// 채팅 On/Off
chattingOpen.addEventListener("click", (event) => {
  chattingContainer.style.display = "block";
  chattingOpen.style.display = "none";
});

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
      chattingChannel: game.global.chattingChannel,
    });

    let message = `${game.global.name}: ${chattingInput.value}`;
    addChatting(message);
    chattingInput.value = "";

    // 글로벌 chatting list 갱신
    if (game.global.chattingChannel === "all") {
      game.global.allChattingList.push(message);
    } else {
      game.global.roomChattingList.push(message);
    }
  }
});

chattingChannel.addEventListener("click", (event) => {
  event.preventDefault();
  let sceneName = getCurScene().sceneName;
  if (sceneName === "MainScene") return;

  if (game.global.chattingChannel === "all") {
    game.global.chattingChannel = "room";
    chattingChannel.innerText = "회의";
    setChattingList(game.global.roomChattingList);
  } else {
    game.global.chattingChannel = "all";
    chattingChannel.innerText = "전체";
    setChattingList(game.global.allChattingList);
  }
});

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
    nameDialog.close();
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

nameDialogClose.addEventListener("click", (event) => {
  nameDialog.close();
});

deviceDialog.addEventListener("close", (event) => {
  game.input.keyboard.enabled = true;
});

deviceDialogOk.addEventListener("click", (event) => {
  deviceDialog.close();
});

deviceDialogClose.addEventListener("click", (event) => {
  deviceDialog.close();
});

cameraButton.addEventListener("click", (event) => {
  // 카메라 온오프, 상태 표시
  if (cameraStatus.style.display === "block") {
    cameraStatus.style.display = "none";
  } else {
    cameraStatus.style.display = "block";
  }

  handleCameraClick();
});

mikeButton.addEventListener("click", (event) => {
  // 마이크 온오프, 상태 표시
  if (mikeStatus.style.display === "block") {
    mikeStatus.style.display = "none";
  } else {
    mikeStatus.style.display = "block";
  }

  handleMikeClick();
});

settingButton.addEventListener("click", (event) => {
  deviceDialog.open ? deviceDialog.close() : deviceDialog.show();
  game.input.keyboard.enabled = !deviceDialog.open;

  if (deviceDialog.open) {
    getDevices("videoinput", "camera");
    getDevices("audioinput", "mike");
    getDevices("audiooutput", "speaker");
  }
});

minimapButton.addEventListener("click", (event) => {
  GameScene.toggleMinimap(getCurScene());
});

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
// 드롭다운 메뉴에서 처리된다.
window.onclick = (event) => {
  if (!event.target.matches(".dropbtn")) {
    event.preventDefault();

    let dropdowns = document.getElementsByClassName("dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
      let openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

// fix: game.canvas.addEventListener on Load of window elemment
window.onload = (e) => {
  game.canvas.addEventListener("mousedown", (event) => {
    game.input.keyboard.enabled = true;
    document.getElementById("chatting-input").blur();
  });

  getLocalStream();
};
