// 받은 메시지를 토대로 메시지를 표출한다.
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
