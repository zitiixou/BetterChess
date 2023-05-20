const board = [];
const pieceToFen = {
  "bp": "p",
  "br": "r",
  "bn": "n",
  "bq": "q",
  "bb": "b",
  "bk": "k",
  "wp": "P",
  "wr": "R",
  "wn": "N",
  "wq": "Q",
  "wb": "B",
  "wk": "K"
}

let underAttack = [];
let attackEnemyColour = "chartreuse";
let underAttackColour = "red";
let controlledByEnemyColour = "orange";
let bestMoveColour = "blue";
let controlledByEnemyOpacity = "0.5";
let enemyUnderAttackOpacity = "1";
let selfUnderAttackOpacity = "1";
let bestMoveOpacity = "1";
let latestFEN = "";
let isFirstPass = false;
let lastBestMove = "";
let depth = 14;
let fenCache = ""
let evaluation = 0;
let resultFen = ""
let includeEvalBar = true;
let includeOpeningsExplorer = true;
let includeStockFishSpinner = true;
let currentEval = 0;
let depthReached = 0
let totalMovesPlayed = 0
chrome.storage.local.set({status: "Not Running"});

[
  "controlledByEnemyOpacity",
  "enemyUnderAttackOpacity",
  "selfUnderAttackOpacity",
  "bestMoveOpacity"
].forEach((id) => {
  chrome.storage.sync.get([id]).then((res) => {
    if (res[id]) {
      if (id === "controlledByEnemyOpacity") {
        controlledByEnemyOpacity = (res[id] / 100).toString();
      } else if (id === "enemyUnderAttackOpacity") {
        enemyUnderAttackOpacity = (res[id] / 100).toString();
      } else if (id === "selfUnderAttackOpacity") {
        selfUnderAttackOpacity = (res[id] / 100).toString();
      } else if (id === "bestMoveOpacity") {
        selfUnderAttackOpacity = (res[id] / 100).toString();
      }
    }
  });
});

chrome.storage.sync.get(["engineDepth", "toggleEvalBar", "toggleOpeningsExplorer", "toggleStockfishSpinner"]).then((res) => {
  if (res["engineDepth"]) {
    depth = res["engineDepth"]
  }
  if (res["toggleEvalBar"] !== undefined){
    includeEvalBar = res["toggleEvalBar"]
  }
  if (res["toggleOpeningsExplorer"] !== undefined){
    includeOpeningsExplorer = res["toggleOpeningsExplorer"]
  }
  if (res["toggleStockfishSpinner"] !== undefined){
    includeStockFishSpinner = res["toggleStockfishSpinner"]
  }
});

[
  "colourControlledByEnemy",
  "colourEnemyUnderAttack",
  "colourSelfUnderAttack",
  "colourBestMove",
].forEach((id) => {
  chrome.storage.sync
    .get([id])
    .then((res) => {
      if (res[id]) {
        if (id === "colourControlledByEnemy") {
          controlledByEnemyColour = res[id];
        } else if (id === "colourEnemyUnderAttack") {
          attackEnemyColour = res[id];
        }
        else if (id === "colourSelfUnderAttack") {
          underAttackColour = res[id];
        } 
        else if (id === "colourBestMove") {
          bestMoveColour = res[id];
        }
      }
    })
    .finally(()=>{
      setColorToMeaningMap();
      setMeaningToColourMap();
    }
      );
});

let colourToMeaning = {
  [attackEnemyColour]: "enemyUnderAttack",
  [underAttackColour]: "selfUnderAttack",
  [controlledByEnemyColour]: "controlledByEnemy",
  [bestMoveColour]: "bestMove",
};

let meaningToColour = {
  "enemyUnderAttack": attackEnemyColour,
  "selfUnderAttack": underAttackColour,
  "controlledByEnemy": controlledByEnemyColour,
  "bestMove": bestMoveColour,
};
let highlightsToInclude = {
  enemyUnderAttack: true,
  controlledByEnemy: true,
  selfUnderAttack: true,
  bestMove: true
};

["enemyUnderAttack", "controlledByEnemy", "selfUnderAttack", "bestMove"].forEach((key) => {
  const storageKey =
    "toggle" + key[0].toUpperCase() + key.substring(1, key.length);
  chrome.storage.sync.get([storageKey]).then((res) => {
    if (res[storageKey] === false) {
      highlightsToInclude[key] = false;
    }
  });
});

const enum urls {
  computer,
  play,
  live,
}
let playerColour = "w";
let boardSize = 0;
let url = urls.computer;

for (let i = 0; i < 8; i++) {
  board.push(["", "", "", "", "", "", "", ""]);
}

const createEvalBarOverlay = () => {
  const evaluationBar = document.querySelector(
    ".board-layout-evaluation"
  ) as HTMLDivElement;
  if (!evaluationBar) return;
  const black = document.createElement("div");
  black.style.backgroundColor = "#403D39";
  black.style.height = "50%";
  black.style.width = "100%";
  black.style.position = "absolute";
  black.style.left = "0px";
  black.style.margin = "0px";
  black.id = "chessAid-eval"
  black.style.transition = "height 1.5s"

  const evalText = document.createElement("span");
  evalText.innerText = "0.0"
  evalText.style.position = "absolute";
  evalText.id = "evalText"
  evalText.style.margin = "0px";
  evalText.style.textAlign = "center"
  evalText.style.width = "100%"

  if (playerColour === "w"){
    black.style.top = "0px";
    black.style.bottom = ""
    evalText.style.color = "black";
    evalText.style.bottom = "0px";
    evalText.style.top = "";
  } else {
    black.style.top = "";
    black.style.bottom = "0px"
    evalText.style.color = "white";
    evalText.style.top = "0px";
    evalText.style.bottom = "";

  }
 
  evaluationBar.style.position = "relative";
  evaluationBar.style.backgroundColor = "white";
  evaluationBar.appendChild(black);
  evaluationBar.appendChild(evalText)
  
};

const getPlayerToMoveInResultFen = () => {
  return  resultFen ? resultFen.split(" ")[1]: "w"
}

const setEvalBar = (eval:string | number) =>{
  let yval;
  const evalBar = document.querySelector("#chessAid-eval") as HTMLDivElement;
  if (!evalBar)return;
  const evalText = document.querySelector("#evalText") as HTMLDivElement;
  if (eval[0] === "M"){
    eval = eval as string;
    evalText.innerText = eval[1] === "-" ? eval[0] + eval.substring(2, eval.length): eval;

    if (getPlayerToMoveInResultFen() !== playerColour){
      if (eval[1] === "-"){
        yval = 100;
      } else {
        yval = 0;
      }
    } else {
      if (eval[1] === "-"){
        yval = 0;
      } else {
        yval = 100;
      }
    }
  } else {
    eval = parseFloat(eval as string);
    if (getPlayerToMoveInResultFen() !== playerColour && eval !== 0.0){
      eval *= -1
    }
    eval /= 100;
    yval = (100 / (1 + Math.exp(-0.25 * eval)));
    
    if (eval < 0){
      evalText.style.top = "0px"
      evalText.style.bottom = ""
    } else {
      evalText.style.top = ""
      evalText.style.bottom = "0px"
    }
    evalText.innerText = Math.abs(parseFloat(eval.toFixed(1))).toString()
  }
  if (playerColour === "w"){
    yval = 100 - yval
  }
  // black bar is 0, so white is mating
  if (yval === 0){
    evalText.style.color = "black"
  }
  if (yval === 100){
    evalText.style.color = "white"
  }
  evalBar.style.height = yval.toString() + "%"


   // Do this in new game logic
   if (playerColour === "w"){
    evalBar.style.top = "0px";
    evalBar.style.bottom = ""
    if (yval !== 0 && yval !== 100){
      evalText.style.color = eval < 0 ? "white" : "black";
    }
  } else {
    evalBar.style.top = "";
    evalBar.style.bottom = "0px"
    if (yval !== 0 && yval !== 100){
      evalText.style.color = eval < 0 ? "black" : "white";
    }
  }
  
}

const showEvalBar = () => {
  const evalBar = document.querySelector("#chessAid-eval");
  if (!evalBar){
    createEvalBarOverlay()
  } 
  setEvalBar(currentEval);
}

const resetBoard = () => {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      board[i][j] = "";
    }
  }
};

const underAttackByRook = (row, col) => {
  const underAttack = [];
  const rookColour = board[row][col][0];

  // Under attack on row going left
  let tempCol = col - 1;
  while (true) {
    if (tempCol < 0) {
      break;
    }
    if (board[row][tempCol]) {
      if (
        board[row][tempCol][0] === playerColour &&
        rookColour !== playerColour
      ) {
        addColourUnderAttackLocal(row, tempCol, underAttackColour, underAttack);
      }
      if (
        board[row][tempCol][0] !== playerColour &&
        rookColour === playerColour
      ) {
        addColourUnderAttackLocal(row, tempCol, attackEnemyColour, underAttack);
      }
      break;
    } else if (rookColour !== playerColour) {
      addColourUnderAttackLocal(row, tempCol, controlledByEnemyColour, underAttack);
    }
    tempCol -= 1;
  }
  // Under attack on row going right
  tempCol = col + 1;
  while (true) {
    if (tempCol >= 8) {
      break;
    }
    if (board[row][tempCol]) {
      if (
        board[row][tempCol][0] === playerColour &&
        rookColour !== playerColour
      ) {
        addColourUnderAttackLocal(row, tempCol, underAttackColour, underAttack);
      }
      if (
        board[row][tempCol][0] !== playerColour &&
        rookColour === playerColour
      ) {
        addColourUnderAttackLocal(row, tempCol, attackEnemyColour, underAttack);
      }
      break;
    } else if (rookColour !== playerColour) {
      addColourUnderAttackLocal(row, tempCol, controlledByEnemyColour, underAttack);
    }
    tempCol += 1;
  }

  // Under attack on column going up
  let tempRow = row - 1;
  while (true) {
    if (tempRow < 0) {
      break;
    }
    if (board[tempRow][col]) {
      if (
        board[tempRow][col][0] === playerColour &&
        rookColour !== playerColour
      ) {
        addColourUnderAttackLocal(tempRow, col, underAttackColour, underAttack);
      }
      if (
        board[tempRow][col][0] !== playerColour &&
        rookColour === playerColour
      ) {
        addColourUnderAttackLocal(tempRow, col, attackEnemyColour, underAttack);
      }
      break;
    } else if (rookColour !== playerColour) {
      addColourUnderAttackLocal(tempRow, col, controlledByEnemyColour, underAttack);
    }
    tempRow -= 1;
  }

  // Under attack on column going down
  tempRow = row + 1;
  while (true) {
    if (tempRow >= 8) {
      break;
    }
    if (board[tempRow][col]) {
      if (
        board[tempRow][col][0] === playerColour &&
        rookColour !== playerColour
      ) {
        addColourUnderAttackLocal(tempRow, col, underAttackColour, underAttack);
      }
      if (
        board[tempRow][col][0] !== playerColour &&
        rookColour === playerColour
      ) {
        addColourUnderAttackLocal(tempRow, col, attackEnemyColour, underAttack);
      }
      break;
    } else if (rookColour !== playerColour) {
      addColourUnderAttackLocal(tempRow, col, controlledByEnemyColour, underAttack);
    }
    tempRow += 1;
  }
  return underAttack;
};

const underAttackByKnight = (row, col) => {
  const knightColour = board[row][col][0];
  const underAttack = [];
  const options = [
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
  ];
  for (const option of options) {
    if (
      row + option[0] >= 0 &&
      col + option[1] >= 0 &&
      row + option[0] < 8 &&
      col + option[1] < 8
    ) {
      if (board[row + option[0]][col + option[1]]) {
        if (
          board[row + option[0]][col + option[1]][0] === playerColour &&
          knightColour !== playerColour
        ) {
          addColourUnderAttackLocal(
            row + option[0],
            col + option[1],
            underAttackColour,
            underAttack
          );
        } else if (
          board[row + option[0]][col + option[1]][0] !== playerColour &&
          knightColour === playerColour
        ) {
          addColourUnderAttackLocal(
            row + option[0],
            col + option[1],
            attackEnemyColour,
            underAttack
          );
        }
      } else if (knightColour !== playerColour) {
        addColourUnderAttackLocal(
          row + option[0],
          col + option[1],
          controlledByEnemyColour,
          underAttack
        );
      }
    }
  }
  return underAttack;
};

const underAttackByKing = (row, col) => {
  const kingColour = board[row][col][0];
  const underAttack = [];
  const options = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  for (const option of options) {
    if (
      row + option[0] >= 0 &&
      col + option[1] >= 0 &&
      row + option[0] < 8 &&
      col + option[1] < 8
    ) {
      if (board[row + option[0]][col + option[1]]) {
        if (
          board[row + option[0]][col + option[1]][0] === playerColour &&
          kingColour !== playerColour
        ) {
          addColourUnderAttackLocal(
            row + option[0],
            col + option[1],
            underAttackColour,
            underAttack
          );
        } else if (
          board[row + option[0]][col + option[1]][0] !== playerColour &&
          kingColour === playerColour
        ) {
          addColourUnderAttackLocal(
            row + option[0],
            col + option[1],
            attackEnemyColour,
          underAttack);
        }
      } else if (kingColour !== playerColour) {
        addColourUnderAttackLocal(
          row + option[0],
          col + option[1],
          controlledByEnemyColour,
        underAttack);
      }
    }
  }
  return underAttack;
};
const underAttackByBishop = (row, col) => {
  const bishopColour = board[row][col][0];
  const underAttack = [];

  // Under attack going up and left
  let tempRow = row - 1;
  let tempCol = col - 1;
  while (true) {
    if (tempRow < 0 || tempCol < 0) {
      break;
    }
    if (board[tempRow][tempCol]) {
      if (
        board[tempRow][tempCol][0] === playerColour &&
        bishopColour !== playerColour
      ) {
        addColourUnderAttackLocal(tempRow, tempCol, underAttackColour, underAttack);
      } else if (
        board[tempRow][tempCol][0] !== playerColour &&
        bishopColour === playerColour
      ) {
        addColourUnderAttackLocal(tempRow, tempCol, attackEnemyColour, underAttack);
      }
      break;
    } else if (bishopColour !== playerColour) {
      addColourUnderAttackLocal(tempRow, tempCol, controlledByEnemyColour, underAttack);
    }
    tempRow -= 1;
    tempCol -= 1;
  }

  // Under attack going up and right
  tempRow = row - 1;
  tempCol = col + 1;
  while (true) {
    if (tempRow < 0 || tempCol >= 8) {
      break;
    }
    if (board[tempRow][tempCol]) {
      if (
        board[tempRow][tempCol][0] === playerColour &&
        bishopColour !== playerColour
      ) {
        addColourUnderAttackLocal(tempRow, tempCol, underAttackColour, underAttack);
      } else if (
        board[tempRow][tempCol][0] !== playerColour &&
        bishopColour === playerColour
      ) {
        addColourUnderAttackLocal(tempRow, tempCol, attackEnemyColour, underAttack);
      }
      break;
    } else if (bishopColour !== playerColour) {
      addColourUnderAttackLocal(tempRow, tempCol, controlledByEnemyColour, underAttack);
    }
    tempRow -= 1;
    tempCol += 1;
  }

  // Under attack going down and left
  tempRow = row + 1;
  tempCol = col - 1;
  while (true) {
    if (tempRow >= 8 || tempCol < 0) {
      break;
    }
    if (board[tempRow][tempCol]) {
      if (
        board[tempRow][tempCol][0] === playerColour &&
        bishopColour !== playerColour
      ) {
        addColourUnderAttackLocal(tempRow, tempCol, underAttackColour, underAttack);
      } else if (
        board[tempRow][tempCol][0] !== playerColour &&
        bishopColour === playerColour
      ) {
        addColourUnderAttackLocal(tempRow, tempCol, attackEnemyColour, underAttack);
      }
      break;
    } else if (bishopColour !== playerColour) {
      addColourUnderAttackLocal(tempRow, tempCol, controlledByEnemyColour, underAttack);
    }
    tempRow += 1;
    tempCol -= 1;
  }

  // Under attack going down and right
  tempRow = row + 1;
  tempCol = col + 1;
  while (true) {
    if (tempRow >= 8 || tempCol >= 8) {
      break;
    }
    if (board[tempRow][tempCol]) {
      if (
        board[tempRow][tempCol][0] === playerColour &&
        bishopColour !== playerColour
      ) {
        addColourUnderAttackLocal(tempRow, tempCol, underAttackColour, underAttack);
      } else if (
        board[tempRow][tempCol][0] !== playerColour &&
        bishopColour === playerColour
      ) {
        addColourUnderAttackLocal(tempRow, tempCol, attackEnemyColour, underAttack);
      }
      break;
    } else if (bishopColour !== playerColour) {
      addColourUnderAttackLocal(tempRow, tempCol, controlledByEnemyColour, underAttack);
    }
    tempRow += 1;
    tempCol += 1;
  }
  return underAttack;
};

const setPlayerColour = () =>{
  try {
    const isBlack = document
    .getElementsByTagName("chess-board")[0]
    .classList.contains("flipped");
playerColour = isBlack ? "b" : "w";
  } catch (e){
    playerColour = "w"
    console.log("Caught error: " + e)
  }

}
const init = () => {
  // const isBlack = document
  //   .querySelector("#game-board")
  //   .classList.contains("flipped");
  // if (isBlack) {
  //   playerColour = "b";
  // }
  
  setPlayerColour();
  if (includeEvalBar){
    createEvalBarOverlay();
  }
  if (includeStockFishSpinner){
    showCurrentDepth()
  }
  // getPiecePositions();
  // setBoardSizeAndPosition();
  // createEvalBarOverlay();
};

const getPiecePositions = () => {
  const urlString = window.location.href;
  let isBlack = false;
  if (urlString.indexOf("https://www.chess.com/live") !== -1) {
    url = urls.live;
    try {
      isBlack = document
        .querySelector("#game-board")
        .classList.contains("flipped");
    } catch (e) {
      isBlack = false;
    }

    const pieces = document.querySelector(".pieces").childNodes;

    for (const piece of pieces as any) {
      const coord = (piece as HTMLElement).classList[1].split("-")[1];
      const col = parseInt(coord[1]);
      const row = parseInt(coord[3]);
      const name = (piece as HTMLElement).style.backgroundImage
        .split("/")[7]
        .substring(0, 2);
      assignPieceToBoard(isBlack, row, col, name);
    }
  } else {
    try {
      const board = document.getElementsByTagName("chess-board")[0];
      if (board) {
        isBlack = document
          .getElementsByTagName("chess-board")[0]
          .classList.contains("flipped");
      } else if (document.querySelector("#board")) {
        isBlack = false;
      }
    } catch (e) {
      alert("ChessAid was not able to find the chess board");
      isBlack = false;
    }

    const pieces = document.querySelectorAll(".piece");
    for (const piece of pieces as any) {
      const classList = (piece as HTMLElement).classList;
      let coord = "";
      let name = "";
      for (let i = 0; i < classList.length; i++) {
        let class_ = classList[i];
        if (class_.indexOf("square") !== -1) {
          coord = class_.split("-")[1];
        } else if (class_.length === 2) {
          name = class_;
        }
      }
      const col = parseInt(coord[0]);
      const row = parseInt(coord[1]);
      assignPieceToBoard(isBlack, row, col, name);
    }
  }
  playerColour = isBlack ? "b" : "w";
  return board;
};

const assignPieceToBoard = (isBlack, row, col, name) => {
  if (!isBlack) {
    board[8 - row][col - 1] = name;
  } else {
    board[row - 1][8 - col] = name;
  }
};

const underAttackByPawn = (
  row: number,
  col: number
): [number, number, string][] => {
  const underAttack: [number, number, string][] = [];
  const pawnColour = board[row][col][0];
  if (pawnColour !== playerColour) {
    if (row + 1 < 8 && col - 1 >= 0) {
      if (
        board[row + 1][col - 1] &&
        board[row + 1][col - 1][0] === playerColour
      ) {
        addColourUnderAttackLocal(row + 1, col - 1, underAttackColour, underAttack);
      } else if (!board[row + 1][col - 1]) {
        addColourUnderAttackLocal(row + 1, col - 1, controlledByEnemyColour, underAttack);
      }
    }
    if (row + 1 < 8 && col + 1 < 8) {
      if (
        board[row + 1][col + 1] &&
        board[row + 1][col + 1][0] === playerColour
      ) {
        addColourUnderAttackLocal(row + 1, col + 1, underAttackColour, underAttack);
      } else if (!board[row + 1][col + 1]) {
        addColourUnderAttackLocal(row + 1, col + 1, controlledByEnemyColour, underAttack);
      }
    }
  } else {
    if (
      row - 1 < 8 &&
      col - 1 >= 0 &&
      board[row - 1][col - 1] &&
      board[row - 1][col - 1][0] !== playerColour
    ) {
      addColourUnderAttackLocal(row - 1, col - 1, attackEnemyColour, underAttack);
    }
    if (
      row + 1 < 8 &&
      col + 1 < 8 &&
      board[row - 1][col + 1] &&
      board[row - 1][col + 1][0] !== playerColour
    ) {
      addColourUnderAttackLocal(row - 1, col + 1, attackEnemyColour, underAttack);
    }
  }
  return underAttack;
};
const getPiecesUnderAttack = () => {
  let underAttack = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!board[row][col]) {
        continue;
      }
      // Pieces under attack by pawn
      if (board[row][col][1] === "p") {
        underAttack = underAttack.concat(underAttackByPawn(row, col));
      }
      // Pieces under attack by rook
      else if (board[row][col][1] === "r") {
        underAttack = underAttack.concat(underAttackByRook(row, col));
      }

      // Pieces under attack by bishop
      else if (board[row][col][1] === "b") {
        underAttack = underAttack.concat(underAttackByBishop(row, col));
      }
      // Pieces under attack by queen
      else if (board[row][col][1] === "q") {
        underAttack = underAttack.concat(underAttackByBishop(row, col));
        underAttack = underAttack.concat(underAttackByRook(row, col));
      }
      // Pieces under attack by knight
      else if (board[row][col][1] === "n") {
        underAttack = underAttack.concat(underAttackByKnight(row, col));
      }
      // Pieces under attack by king
      else if (board[row][col][1] === "k") {
        underAttack = underAttack.concat(underAttackByKing(row, col));
      }
    }
  }
  return underAttack;
};

const highlightSquareByCoordinate = (row, col, meaning) => {
  // Return early if that color is toggled off
  // const meaning = colourToMeaning[colour];
  if (!highlightsToInclude[meaning]) return;

  const colour = meaningToColour[meaning];
  const left = col * boardSize;
  const top = row * boardSize;
  let div = document.createElement("div");
  div.className = "highlights";
  div.style.position = "absolute";
  div.style.width = boardSize + "px";
  div.style.height = boardSize + "px";
  div.style.background = colour;
  div.style.opacity = "1";

  if (colour === controlledByEnemyColour) {
    div.style.opacity = controlledByEnemyOpacity;
  } else if (colour === attackEnemyColour) {
    div.style.opacity = enemyUnderAttackOpacity;
  } else if (colour === underAttackColour) {
    div.style.opacity = selfUnderAttackOpacity;
  } else if (colour === bestMoveColour) {
    div.style.opacity = bestMoveOpacity;
    div.className += " bestMove"
  }
  div.style.left = left + "px";
  div.style.top = top + "px";
  if (url === urls.live) {
    document.querySelector(".arrows-container").appendChild(div);
  } else {
    try {
      document
        .getElementsByTagName("chess-board")[0]
        .insertBefore(div, document.querySelector(".piece"));
    } catch (e) {
      document
        .querySelector("#board")
        .insertBefore(div, document.querySelector(".piece"));
    }
  }
};

const deleteHighlights = () => {
  const highlights = document.getElementsByClassName("highlights");
  while (highlights.length > 0) highlights[0].remove();
};

const isGameStarted = () =>{
  return document.getElementsByTagName("vertical-move-list").length !== 0;
}

const sendFen = () =>{
  // Wait until board is updated
  setTimeout(()=>{
    let fen = getFen();
    if (getPlayerToMove() !== playerColour && depth >= 17){
      chrome.runtime.sendMessage({
        kind: "stop"
    });
    return;
    }
    if (fen === fenCache) return;
    // console.log("Fen is ", fen)
    // console.log("Board is ", board)
    latestFEN = fen;
    fenCache = fen
    chrome.storage.local.set({bestMove: ""})
    chrome.runtime.sendMessage({
      kind: "fen",
      content: fen,
      depth: totalMovesPlayed < 10 ? Math.min(depth, 17): depth,
  });
  }, 10)

}

const isBoardUpdated = (board1) => {
  for (let row = 0; row < 8; row++){
    for (let col = 0; col < 8; col++){
      if (board1[row][col] !== board[row][col]){
        return true;
      }
    }
  }
  return false;
}

const forgotBestMove = () =>{
  if (!lastBestMove){return}
  const highlights = document.querySelectorAll('.highlights') 
  for (let i = 0 ; i < highlights.length; i++){
    if ((highlights[i] as HTMLDivElement).classList.contains("bestMove")){
      return false
    }
  }
  return true;
}

const mainLoop = () => {
  if (!window.sessionStorage.getItem("interval")) {
    return;
  }

  setBoardSizeAndPosition();
  const oldBoard = board.map(function(arr) {
    return arr.slice();
  });
  resetBoard();
  getPiecePositions();
  if (!isBoardUpdated(oldBoard) && !isFirstPass && lastBestMove !== ""){return;}
  isFirstPass = false;

  deleteHighlights();
  underAttack = getPiecesUnderAttack();
  for (const square of underAttack) {
    highlightSquareByCoordinate(square[0], square[1], square[2]);
  }
    sendFen();
    if (includeOpeningsExplorer){
      createOpeningsOverlay();
    }
  if (getPlayerToMove() !== playerColour) {
    lastBestMove = "";
  }

  // if (isGameStarted() && getPlayerToMove() === playerColour ){
  //   sendFen();
  // } else {
  //   lastBestMove = "";
  // }

  // setEvalBar(evaluation);
};


const pause = () => {
  chrome.storage.local.set({status: "Not Running"})

 resetBoard();
 underAttack = [];
 latestFEN = "";
 isFirstPass = false;
 lastBestMove = "";
 fenCache = "" 
 
  const interval = window.sessionStorage.getItem("interval");
  if (interval) {
    window.clearInterval(parseInt(interval));
    deleteHighlights();
    deleteEvalBar();
    removeCurrentDepth();
    deleteOpeningsExplorer();
    window.sessionStorage.removeItem("interval");
  }
};

const deleteEvalBar = () =>{
  try{
    const evalBar = document.querySelector("#chessAid-eval")
    const evalText = document.querySelector("#evalText")
    if (evalBar){
      evalBar.remove();
    }
    const boardLayoutEvaluation = document.querySelector(".board-layout-evaluation");
    if (boardLayoutEvaluation){
      (boardLayoutEvaluation as HTMLDivElement).style.backgroundColor = ""
    }
    if (evalText){
      evalText.remove();
    }

  } catch(e){
    console.log("Caught error: ", e)
  }

}

const isRunning = () => {
  return window.sessionStorage.getItem("interval") !== null
}

const start = () => {
chrome.storage.local.set({bestMove: null, eval: 0, fen: null, status: "Running"})
lastBestMove = ""
isFirstPass = true;

  if (window.sessionStorage.getItem("interval")) {
    window.sessionStorage.removeItem("interval");
  }
  if (window.location.href.indexOf("https://www.chess.com/variants") !== -1){
    chrome.storage.local.set({status: "Not Running"});
    alert(
      "ChessAid does not work for variants. Please try puzzles or regular chess."
    );
    return;
  }
  if (document.getElementsByTagName("canvas").length !== 0) {
    alert(
      "ChessAid was not able to find the chess board. Please make sure that animation type is NOT set to Natural or Arcade."
    );
    return;
  }
  init();
  let interval = window.setInterval(mainLoop, 750);
  window.sessionStorage.setItem("interval", interval.toString());

};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "start") {
    start();
  } else if (message === "pause") {
    pause();
  } else if (message === "toggleControlledByEnemy") {
    highlightsToInclude["controlledByEnemy"] =
      !highlightsToInclude["controlledByEnemy"];
      resetHighlights(); 
  } else if (message === "toggleEnemyUnderAttack") {
    highlightsToInclude["enemyUnderAttack"] =
      !highlightsToInclude["enemyUnderAttack"];
      resetHighlights();
  } else if (message === "toggleSelfUnderAttack") {
    highlightsToInclude["selfUnderAttack"] =
      !highlightsToInclude["selfUnderAttack"];
      resetHighlights();
  } else if (message === "toggleBestMove") {
    highlightsToInclude["bestMove"] =
      !highlightsToInclude["bestMove"];
      resetHighlights();
  }
   else if ((message as string).startsWith("colourChange")) {
    const split = message.split(" ");
    const id = split[1];
    const colour = split[2];
    if (id === "colourControlledByEnemy") {
      setControlledByEnemyColour(colour);
    } else if (id === "colourEnemyUnderAttack") {
      setEnemyunderAttackColour(colour);
    } else if (id === "colourSelfUnderAttack") {
      setUnderAttackColour(colour);
    } else if (id === "colourBestMove") {
      setBestMoveColour(colour);
    }
    setColorToMeaningMap();
    setMeaningToColourMap();
    resetHighlights();
  } else if ((message as string).startsWith("opacityChange")) {
    const split = message.split(" ");
    const id = split[1];
    const value = split[2];
    if (id === "controlledByEnemyOpacity") {
      controlledByEnemyOpacity = (value / 100).toString();
    } else if (id === "enemyUnderAttackOpacity") {
      enemyUnderAttackOpacity = (value / 100).toString();
    } else if (id === "selfUnderAttackOpacity") {
      selfUnderAttackOpacity = (value / 100).toString();
    } else if (id === "bestMoveOpacity") {
      bestMoveOpacity = (value / 100).toString();
    }
    resetHighlights();
  }  else if ((message as string).startsWith("depth")){
    depth = message.split(" ")[1]

    if (isRunning()){
      pause()
      start()
    }
  } else if (message === "toggleEvalBar"){
    includeEvalBar = !includeEvalBar
    if (!includeEvalBar){
      deleteEvalBar();
    } else if (isRunning()){
      showEvalBar()
    }
  }else if (message === "toggleOpeningsExplorer"){
    includeOpeningsExplorer = !includeOpeningsExplorer
    if (!includeOpeningsExplorer){
      deleteOpeningsExplorer();
    } else if (isRunning()){
      createOpeningsOverlay(true)
    }
  }
  else if (message === "toggleStockfishSpinner"){
    includeStockFishSpinner = !includeStockFishSpinner
    if (!includeStockFishSpinner){
      removeCurrentDepth();
    } else if(isRunning()) {
      showCurrentDepth();
    }
  }
   else if (message === "are_you_there_content_script?"){
    sendResponse({status: "yes"});
  }
});

const deleteOpeningsExplorer = () =>{
  // const adContainer = document.querySelector("#board-layout-ad") as HTMLDivElement;
  clearAdContainer("depthSpinnerContainer")
}


function setColorToMeaningMap() {
  colourToMeaning = {
    [attackEnemyColour]: "enemyUnderAttack",
    [underAttackColour]: "selfUnderAttack",
    [controlledByEnemyColour]: "controlledByEnemy",
    [bestMoveColour]: "bestMove"
  };
}

function setMeaningToColourMap() {
   meaningToColour = {
    "enemyUnderAttack": attackEnemyColour,
    "selfUnderAttack": underAttackColour,
    "controlledByEnemy": controlledByEnemyColour,
    "bestMove": bestMoveColour,
  };
}

function setBoardSizeAndPosition() {
  if (url === urls.live) {
    (
      document.querySelector(".arrows-container") as HTMLDivElement
    ).style.position = "relative";
    boardSize = document.querySelector(".arrows-container").clientHeight / 8;
  } else {
    try {
      (
        document.getElementsByTagName("chess-board")[0] as HTMLDivElement
      ).style.position = "relative";
      boardSize =
        document.getElementsByTagName("chess-board")[0].clientHeight / 8;
    } catch (e) {
      (document.querySelector("#board") as HTMLDivElement).style.position =
        "relative";
      boardSize = document.querySelector("#board").clientHeight / 8;
    }
  }
}

const setUnderAttackColour = (colour: string) => {
  underAttackColour = colour;
};

const setEnemyunderAttackColour = (colour: string) => {
  attackEnemyColour = colour;
};

const setControlledByEnemyColour = (colour: string) => {
  controlledByEnemyColour = colour;
};

const setBestMoveColour = (colour: string) => {
  bestMoveColour = colour;
};

const getFen = () => {
  let fen = "";
  for (let rank = 0; rank < board.length; rank++) {
      // count empty fields
      let empty = 0;
      // empty string for each rank
      let rankFen = "";
      for (let file = 0; file < board[rank].length; file++) {
        let isEmpty = true;
        if ((playerColour === "w" && board[rank][file].length !== 0) || 
          (playerColour === "b" && board[7-rank][7-file].length !== 0)){
            isEmpty = false;
          }
        
          if(isEmpty) {
              empty++;
          } else {
              // add the number to the fen if not zero.
              if (empty !== 0) rankFen += empty;
              // add the letter to the fen
              if (playerColour === 'w'){
                rankFen += pieceToFen[board[rank][file]];
              } else {
                rankFen += pieceToFen[board[7 - rank][7 - file]];
              }
              // reset the empty
              empty = 0;
          }
      }
      // add the number to the fen if not zero.
      if (empty != 0) rankFen += empty;
      // add the rank to the fen
      fen += rankFen;
      // add rank separator. If last then add a space
      if (!(rank === board.length-1)) {
          fen += "/";
      } else {
          fen += " ";
      }
  }
  fen += getPlayerToMove();
  fen += " " + getCastlingString();
  fen += " - 0 1";
  // Todo add enpessant target square
  return fen;
}

const getPlayerToMove = () =>{
  let urlString = window.location.href;
  if (urlString.indexOf("https://www.chess.com/puzzles") !== -1) {
    return playerColour;
  }

  try {
    const moves = document.querySelectorAll('.move');
    if (moves){
      totalMovesPlayed = moves.length;
    }
    let lastMove = moves[moves.length - 1]
    let children = lastMove.children
    if (children[0].classList.contains("game-result")){
       lastMove = moves[moves.length - 2]
       children = lastMove.children
    }
    for (let i = 0 ; i < children.length; i++){
      if (children[i].classList.contains("black")){
        return "w"
      }
    }
    return "b"
  // return moves[moves.length - 1].children. ? 'w' : 'b';

  } catch (e){
    return 'w';
  } 
}

const getWhiteCastlingAvailability = () => {
  let kingside = true;
  let queenside = true; 
  const whiteMoves = document.querySelectorAll('.white.node')
  for (let i = 0; i < whiteMoves.length; i++){
    const node = whiteMoves[i]
    const text = (node as HTMLDivElement).innerText;
    const nodeChildren = node.children;
    let rookIcon = false;
    let kingIcon = false;
    if (nodeChildren.length > 0){
       rookIcon = Array.from(nodeChildren[0].classList).includes('rook-white')
       kingIcon = Array.from(nodeChildren[0].classList).includes('king-white')
    }
    
    if (text.includes("K") || kingIcon || text.includes("O")){
      return ""
    } else if ((rookIcon || text.includes("R"))){
      if (text.includes("h") || text.includes("g1") ||text.includes("f1") ){
        kingside = false
      }
      else if (text.includes("a") || text.includes("b1") ||text.includes("c1") ||text.includes("d1")){
        queenside = false
      }
    } 
  }


  let castling = kingside ? "K" : ""
  castling += queenside ? "Q": ""
  return castling;
}

const getBlackCastlingAvailability = () => {
  let kingside = true;
  let queenside = true; 
  const blackMoves = document.querySelectorAll('.black.node')
  for (let i = 0; i < blackMoves.length; i++){
    const node = blackMoves[i]
    const text = (node as HTMLDivElement).innerText;
    const nodeChildren = node.children;
    let rookIcon = false;
    let kingIcon = false;
    if (nodeChildren.length > 0){
       rookIcon = Array.from(nodeChildren[0].classList).includes('rook-black')
       kingIcon = Array.from(nodeChildren[0].classList).includes('king-black')
    }
    if (text.includes("K") || kingIcon || text.includes("O")){
      return ""
    } else if ((rookIcon || text.includes("R"))){
      if (text.includes("h") || text.includes("g8") ||text.includes("f8") ){
        kingside = false
      }
      else if (text.includes("a") || text.includes("b8") ||text.includes("c8") ||text.includes("d8")){
        queenside = false
      }
    } 

  }


  let castling = kingside ? "k" : ""
  castling += queenside ? "q": ""
  return castling;
}

const getCastlingString = () => {
  let urlString = window.location.href;
  if (urlString.indexOf("https://www.chess.com/puzzles") !== -1) {
    return "-";
  }
  
  const whiteCastlingString = getWhiteCastlingAvailability();
  const blackCastlingString = getBlackCastlingAvailability();
  const castlingString = whiteCastlingString + blackCastlingString;
  return castlingString !== "" ? castlingString : "-"
}

// const getCastlingString = () =>{
//   let castling = "";
//   if (playerColour === "w"){
//     if (board[7][4] == 'wk') {
//       if (board[7][7] == 'wr') {
//           castling += 'K';
//       }
//       if (board[7][0] == 'wr') {
//           castling += 'Q';
//       }
//   }

//   if (board[0][4] == 'bk') {
//       if (board[0][7] == 'br') {
//           castling += 'k';
//       }
//       if (board[0][0] == 'br') {
//           castling += 'q';
//       }
//   }
//   } else {
//     if (board[7][3] == 'bk') {
//       if (board[7][0] == 'br') {
//           castling += 'k';
//       }
//       if (board[7][7] == 'br') {
//           castling += 'q';
//       }
//   }
//   if (board[0][3] == 'wk') {
//       if (board[0][0] == 'wr') {
//           castling += 'K';
//       }
//       if (board[0][7] == 'wr') {
//           castling += 'Q';
//       }
//   }
//   }
//   return castling !== "" ? castling : "-";
// }

const removeOldBestMove = () => {
  const toRemove:number[] = []
  for (let i = 0; i < underAttack.length; i++){
    const square = underAttack[i];
    if (square[2] === "bestMove"){
      toRemove.push(i)
    }
  }
  let increment = 0
  for (const index of toRemove){
    underAttack.splice(index - increment, 1)
    increment++;
  }

  let bestMoveHighlights = document.getElementsByClassName("highlights bestMove")
    while (bestMoveHighlights.length > 0)
    bestMoveHighlights[0].remove();
}

chrome.storage.onChanged.addListener(async function(changes, namespace) {
  const letterToCol = {'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7}
  try {
    const curFen = getFen();
    if ("bestMove" in changes) {
      const res = await chrome.storage.local.get(["bestMove", "eval", "fen", "depth", "searchComplete"])
      console.log("res is", JSON.stringify(res))
      if(res.fen !== curFen) return;
      resultFen =  curFen;
      currentEval = res.eval
      if (res.searchComplete === true){
        updateCurrentDepth(res.depth, true)
      } else {
        updateCurrentDepth(res.depth)
      }
      if (includeEvalBar){
        showEvalBar()
      } else {
        deleteEvalBar()
      }
      if (getPlayerToMoveInResultFen() === playerColour){
          // console.log("Best move: " + res.bestMove + "eval " + res.eval) 
        lastBestMove = res.bestMove;
        const startSquare = res.bestMove.substring(0, 2)
        const endSquare = res.bestMove.substring(2, 4)
  
        let startSquareRow = 8 - startSquare[1];
        let startSquareColumn = letterToCol[startSquare[0]]
        let endSquareRow = 8 - endSquare[1];
        let endSquareColumn = letterToCol[endSquare[0]];
  
        if (playerColour === 'w'){
        startSquareRow = 8 - startSquare[1];
        startSquareColumn = letterToCol[startSquare[0]]
        endSquareRow = 8 - endSquare[1];
        endSquareColumn = letterToCol[endSquare[0]]
        } else {
        startSquareRow = startSquare[1] - 1;
        startSquareColumn = 7 - letterToCol[startSquare[0]]
        endSquareRow = endSquare[1] - 1;
        endSquareColumn = 7 - letterToCol[endSquare[0]];
        }
        removeOldBestMove()
        addColourUnderAttack(startSquareRow, startSquareColumn, bestMoveColour);
        addColourUnderAttack(endSquareRow, endSquareColumn, bestMoveColour);
        highlightSquareByCoordinate(startSquareRow, startSquareColumn, "bestMove")
        highlightSquareByCoordinate(endSquareRow, endSquareColumn, "bestMove") 
      }
     
   }   else if ("depth" in changes){
    const res = await chrome.storage.local.get(["fen", "depth", "bestMove"])
    console.log("bestMove not in changes. res is", JSON.stringify(res))
      if(res.fen !== curFen) return;
      resultFen =  curFen;
      currentEval = res.eval
      updateCurrentDepth(res.depth)
   } else if ("searchComplete" in changes){
    console.log("SEARCHCOMPLETE", changes.searchComplete.newValue)

    updateCurrentDepth(-1, true)
   }
  } catch(e){
    // Sometimes we don't get the message back properly, in this case resend it
    console.log("Caught type error, resending: " + e)
    if (e instanceof TypeError){
      chrome.storage.local.set({bestMove: null, eval: 0, fen: null})
      sendFen();
    }
  }
  
});


window.onresize = () => {
  resetHighlights();
}

const resetHighlights = () => {
  setBoardSizeAndPosition()
  deleteHighlights();
  for (const square of underAttack) {
    highlightSquareByCoordinate(square[0], square[1], square[2]);
  }
}

const addColourUnderAttack = (row:number, col: number, colour: string) =>{
  const meaning = colourToMeaning[colour];
  // if (!highlightsToInclude[meaning]) return;
  underAttack.push([row, col, meaning])
}

const addColourUnderAttackLocal = (row:number, col: number, colour: string, underAttack: [number, number, string][]) =>{
  const meaning = colourToMeaning[colour];
  // if (!highlightsToInclude[meaning]) return;
  underAttack.push([row, col, colourToMeaning[colour]])
}

const getOpenings = async (fen: string) =>{
  const url = transformFen(fen);
  return fetch(`https://explorer.lichess.ovh/master?fen=${url}`)
  .then(res => res.json())
  .then(json => (json.moves.map(res => ({"move": res.san, "white": res.white, "black": res.black, "draws": res.draws}))))
}

const transformFen = (fen: string) => {
  return fen.replace(/ /g, "_")
}

const getTotalText = (total:number): string => {
  if(total > 1000000){
    return Math.round(total/1000000) + "M"
  } else if ( total > 1000){
    return Math.round(total / 1000) + "K"
  } else{
    return total.toString();
  }
}

const clearAdContainer = (except) =>{
  const adContainer = document.querySelector("#board-layout-ad") as HTMLDivElement;
  if (!adContainer || !adContainer.childNodes) return;
  
  let toRemove = []
  for (let i = 0; i < adContainer.childNodes.length; i++){
    const node = adContainer.childNodes[i];
    if ( !((node as HTMLDivElement).classList) || !Array.from((node as HTMLDivElement).classList).includes(except)){
      toRemove.push(node)
    }
  }

  toRemove.forEach(node => node.remove())

}

const showCurrentDepth = () =>{
  try {
    const sidebar = document.querySelector(".board-layout-sidebar") as HTMLDivElement;
  const left = sidebar.getBoundingClientRect().x;
  const width = sidebar.offsetWidth;
 const adContainer = document.querySelector("#board-layout-ad") as HTMLDivElement;
 adContainer.style.position = "absolute"
 adContainer.style.left = (left + width + 10) + "px";
 adContainer.style.width = (window.innerWidth - (left + width + 40)) + "px";
 adContainer.style.margin = "0px";
 adContainer.style.display = "flex"
 adContainer.style.flexDirection = "column"
 adContainer.style.alignItems = "center"
 clearAdContainer("openingsContainer")
 const depthSpinnerContainer = document.createElement("div");
 depthSpinnerContainer.className = "depthSpinnerContainer"
 depthSpinnerContainer.style.cssText = `
 position: relative;
 display: inline-block;
 margin-bottom: 18px;
 `
 const depthSpinner = document.createElement("div");
 depthSpinner.id = "loader"
 depthSpinner.style.cssText = `  
 border: 16px solid #f3f3f3;
  border-top: 16px solid #3498db;
  border-radius: 50%;
  width: 120px;
  height: 120px;
  animation: spin 2s linear infinite;
  display: block;
 `

  const loadText = document.createElement("div");
  loadText.id = "loader-text"
  loadText.style.cssText = `position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  margin: 0;
  color:white;`
  if (depthReached === -1){
    loadText.innerText = "Search Complete";
    (depthSpinner as HTMLDivElement).style.border ='16px solid #3498db';
  } else {
    loadText.innerText = `Depth\n${depthReached}`
  }
  var style = document.createElement("style");
  style.innerHTML = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
  document.getElementsByTagName("head")[0].appendChild(style);

  depthSpinnerContainer.appendChild(depthSpinner)
  depthSpinnerContainer.appendChild(loadText)
  adContainer.insertBefore(depthSpinnerContainer, adContainer.firstChild);
  } catch(e){
    console.log("Caught error:", e)
  }
}

const removeCurrentDepth = () =>{
  const spinner = document.querySelector(".depthSpinnerContainer");
  if (spinner){
    spinner.remove()
  }
}

const updateCurrentDepth = (curDepth:number, searchComplete = false) =>{
  depthReached = searchComplete ? -1 : curDepth
  try{
    const depthSpinnerText = document.querySelector("#loader-text");

    const depthSpinner = document.querySelector("#loader");
    if (searchComplete && depthSpinner){
      (depthSpinner as HTMLDivElement).style.border ='16px solid #3498db';
      (depthSpinnerText as HTMLDivElement).innerText = `Search Complete`;
    } else if (depthSpinner) {
      (depthSpinner as HTMLDivElement).style.border = '16px solid #f3f3f3';
      (depthSpinner as HTMLDivElement).style.borderTop = '16px solid #3498db';

      (depthSpinnerText as HTMLDivElement).innerText = `Depth\n${curDepth}`;
    }
  }catch(e){
    console.log("Caught error:", e)
  }
}


const createOpeningsOverlay = async (justOpened = false) => {
  const fen = getFen();
  if (fen === fenCache && !justOpened) return;
  const openings = await getOpenings(fen);
  const sidebar = document.querySelector(".board-layout-sidebar") as HTMLDivElement;
  const left = sidebar.getBoundingClientRect().x;
  const width = sidebar.offsetWidth;

 const adContainer = document.querySelector("#board-layout-ad") as HTMLDivElement;
 adContainer.style.position = "absolute"
 adContainer.style.left = (left + width + 10) + "px";
 adContainer.style.width = (window.innerWidth - (left + width + 40)) + "px";
 adContainer.style.margin = "0px";
 adContainer.style.display = "flex"
 adContainer.style.flexDirection = "column"
 adContainer.style.alignItems = "center"
 clearAdContainer("depthSpinnerContainer")
 const openingsContainer = document.createElement("div");
 const heading = document.createElement("h2")
 heading.innerText = "Openings Explorer"
 heading.style.color = "white"
 openingsContainer.appendChild(heading)

 const caption = document.createElement("div")
 caption.innerText = "Win rate % by move"
 caption.style.color = "white"
 caption.style.marginBottom = "5px"
 openingsContainer.appendChild(caption)
 openingsContainer.className = "openingsContainer"

 openingsContainer.style.width = "100%";

openings.forEach(move => {
  const total = move.white + move.black + move.draws;
  const totalText = getTotalText(total)
  const numGames = document.createElement("div")
  numGames.innerText = totalText;
  numGames.style.position = "absolute"
  numGames.style.bottom = "0px"
  numGames.style.left = "0px"
  numGames.style.fontSize = "11px"
  const moveContainer = document.createElement("div");
  moveContainer.style.display = "flex";
  moveContainer.style.marginBottom = "5px"

  const text = document.createElement("span");
  text.innerText = `${move.move}`
  text.style.marginRight = "5px"
  text.style.color = "white"
  text.style.width = "50px"


  const white = document.createElement("div");
  const whitePercent =  move.white/total * 100
  white.style.width =  whitePercent + "%";
  white.style.backgroundColor = "white";
  white.style.height = "30px"
  white.innerText = whitePercent >= 5 ? Math.round(whitePercent).toString() : "";
  white.style.textAlign = "center"
  white.style.color = "black"

  const black = document.createElement("div");
  const blackPercent =  move.black/total * 100

  black.style.width = blackPercent + "%";
  black.style.backgroundColor = "black"
  black.style.height = "30px"
  black.innerText = blackPercent >= 5 ? Math.round(blackPercent).toString() : "";
  black.style.textAlign = "center"
  black.style.color = "white"

  const draw = document.createElement("div");
  const drawPercent =  move.draws/total * 100

  draw.style.width = drawPercent + "%";
  draw.style.backgroundColor = "grey"
  draw.style.height = "30px"
  draw.innerText = drawPercent >= 5 ? Math.round(drawPercent).toString() : "";
  draw.style.textAlign = "center"
  draw.style.color = "white"
  draw.style.zIndex = "5"



  const percentagesContainer = document.createElement("div")
  percentagesContainer.style.width = "100%"
  percentagesContainer.style.display = "flex"
  percentagesContainer.style.position = "relative"
  if (playerColour === "w"){
    percentagesContainer.appendChild(white)
    percentagesContainer.appendChild(draw)
    percentagesContainer.appendChild(black)
    numGames.style.color = "black"
  } else {
    percentagesContainer.appendChild(black)
    percentagesContainer.appendChild(draw)
    percentagesContainer.appendChild(white)
    numGames.style.color = "white"
  }

  percentagesContainer.appendChild(numGames)

  moveContainer.appendChild(text)
  moveContainer.appendChild(percentagesContainer)
  


  openingsContainer.appendChild(moveContainer)
})

adContainer.appendChild(openingsContainer)
}