import GameScene from "../scene/GameScene.js";
import { characterButton, chattingList, nameButton } from "./UILogic.js";

// 메시지가 너무 긴 경우 잘라서 처리한다.
export function divideMessage(message) {
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

  return text;
}

// ================= Game Function ====================
export function addChatting(text) {
  let newDiv = document.createElement("div");
  newDiv.innerHTML = text;
  newDiv.className = "msger-text";
  chattingList.appendChild(newDiv);
  chattingList.scrollTop = chattingList.scrollHeight;
}

export function setChattingList(chatList) {
  chattingList.innerHTML = "";
  chatList.forEach((chatting) => {
    let newDiv = document.createElement("div");
    newDiv.innerHTML = chatting;
    newDiv.className = "msger-text";
    chattingList.appendChild(newDiv);
  });
  chattingList.scrollTop = chattingList.scrollHeight;
}

export function setMyPlayer(scene, player) {
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

export function hideElement(el) {
  el.style.display = "none";
}

export function showElement(el) {
  el.style.display = "block";
}

export function updateVideoStatus(playerId, cameraOn, mikeOn) {
  let videoStatus = document.getElementById(`video-status-${playerId}`);
  videoStatus.innerText = `cam: ${cameraOn ? "✔️" : "❌"} mike: ${
    mikeOn ? "✔️" : "❌"
  }`;
}

export function colorPids(vol) {
  const allPids = [...document.querySelectorAll(".pid")];
  const numberOfPidsToColor = Math.round(vol / 10);
  const pidsToColor = allPids.slice(0, numberOfPidsToColor);
  for (const pid of allPids) {
    pid.style.backgroundColor = "#e6e7e8";
  }
  for (const pid of pidsToColor) {
    pid.style.backgroundColor = "#99d9ea";
  }
}
