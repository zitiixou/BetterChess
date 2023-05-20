var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
var _this = this;
var board = [];
var pieceToFen = {
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
};
var underAttack = [];
var moveListObserver;
var attackEnemyColour = "chartreuse";
var underAttackColour = "red";
var controlledByEnemyColour = "orange";
var bestMoveColour = "blue";
var controlledByEnemyOpacity = "0.5";
var enemyUnderAttackOpacity = "1";
var selfUnderAttackOpacity = "1";
var bestMoveOpacity = "1";
var latestFEN = "";
var isFirstPass = false;
var lastBestMove = "";
var depth = 14;
var fenCache = "";
var evaluation = 0;
var resultFen = "";
var includeEvalBar = true;
var includeOpeningsExplorer = true;
var currentEval = 0;
chrome.storage.local.set({ status: "Not Running" });
[
    "controlledByEnemyOpacity",
    "enemyUnderAttackOpacity",
    "selfUnderAttackOpacity",
    "bestMoveOpacity"
].forEach(function (id) {
    chrome.storage.sync.get([id]).then(function (res) {
        if (res[id]) {
            if (id === "controlledByEnemyOpacity") {
                controlledByEnemyOpacity = (res[id] / 100).toString();
            }
            else if (id === "enemyUnderAttackOpacity") {
                enemyUnderAttackOpacity = (res[id] / 100).toString();
            }
            else if (id === "selfUnderAttackOpacity") {
                selfUnderAttackOpacity = (res[id] / 100).toString();
            }
            else if (id === "bestMoveOpacity") {
                selfUnderAttackOpacity = (res[id] / 100).toString();
            }
        }
    });
});
chrome.storage.sync.get(["engineDepth", "toggleEvalBar", "toggleOpeningsExplorer"]).then(function (res) {
    if (res["engineDepth"]) {
        depth = res["engineDepth"];
    }
    if (res["toggleEvalBar"] !== undefined) {
        includeEvalBar = res["toggleEvalBar"];
    }
    if (res["toggleOpeningsExplorer"] !== undefined) {
        includeOpeningsExplorer = res["toggleOpeningsExplorer"];
    }
});
[
    "colourControlledByEnemy",
    "colourEnemyUnderAttack",
    "colourSelfUnderAttack",
    "colourBestMove",
].forEach(function (id) {
    chrome.storage.sync
        .get([id])
        .then(function (res) {
        if (res[id]) {
            if (id === "colourControlledByEnemy") {
                controlledByEnemyColour = res[id];
            }
            else if (id === "colourEnemyUnderAttack") {
                attackEnemyColour = res[id];
            }
            else if (id === "colourSelfUnderAttack") {
                underAttackColour = res[id];
            }
            else if (id === "colourBestMove") {
                bestMoveColour = res[id];
            }
        }
    })["finally"](function () {
        setColorToMeaningMap();
        setMeaningToColourMap();
    });
});
var colourToMeaning = (_a = {},
    _a[attackEnemyColour] = "enemyUnderAttack",
    _a[underAttackColour] = "selfUnderAttack",
    _a[controlledByEnemyColour] = "controlledByEnemy",
    _a[bestMoveColour] = "bestMove",
    _a);
var meaningToColour = {
    "enemyUnderAttack": attackEnemyColour,
    "selfUnderAttack": underAttackColour,
    "controlledByEnemy": controlledByEnemyColour,
    "bestMove": bestMoveColour
};
var highlightsToInclude = {
    enemyUnderAttack: true,
    controlledByEnemy: true,
    selfUnderAttack: true,
    bestMove: true
};
["enemyUnderAttack", "controlledByEnemy", "selfUnderAttack", "bestMove"].forEach(function (key) {
    var storageKey = "toggle" + key[0].toUpperCase() + key.substring(1, key.length);
    chrome.storage.sync.get([storageKey]).then(function (res) {
        if (res[storageKey] === false) {
            highlightsToInclude[key] = false;
        }
    });
});
var playerColour = "w";
var boardSize = 0;
var url = 0 /* computer */;
for (var i = 0; i < 8; i++) {
    board.push(["", "", "", "", "", "", "", ""]);
}
var createEvalBarOverlay = function () {
    var evaluationBar = document.querySelector(".board-layout-evaluation");
    if (!evaluationBar)
        return;
    var black = document.createElement("div");
    black.style.backgroundColor = "#403D39";
    black.style.height = "50%";
    black.style.width = "100%";
    black.style.position = "absolute";
    black.style.left = "0px";
    black.style.margin = "0px";
    black.id = "chessAid-eval";
    black.style.transition = "height 1.5s";
    var evalText = document.createElement("span");
    evalText.innerText = "0.0";
    evalText.style.position = "absolute";
    evalText.id = "evalText";
    evalText.style.margin = "0px";
    evalText.style.textAlign = "center";
    evalText.style.width = "100%";
    if (playerColour === "w") {
        black.style.top = "0px";
        black.style.bottom = "";
        evalText.style.color = "black";
        evalText.style.bottom = "0px";
        evalText.style.top = "";
    }
    else {
        black.style.top = "";
        black.style.bottom = "0px";
        evalText.style.color = "white";
        evalText.style.top = "0px";
        evalText.style.bottom = "";
    }
    evaluationBar.style.position = "relative";
    evaluationBar.style.backgroundColor = "white";
    evaluationBar.appendChild(black);
    evaluationBar.appendChild(evalText);
};
var getPlayerToMoveInResultFen = function () {
    return resultFen ? resultFen.split(" ")[1] : "w";
};
var setEvalBar = function (eval) {
    var yval;
    var evalBar = document.querySelector("#chessAid-eval");
    if (!evalBar)
        return;
    var evalText = document.querySelector("#evalText");
    if (eval[0] === "M") {
        eval = eval;
        evalText.innerText = eval[1] === "-" ? eval[0] + eval.substring(2, eval.length) : eval;
        if (getPlayerToMoveInResultFen() !== playerColour) {
            if (eval[1] === "-") {
                yval = 100;
            }
            else {
                yval = 0;
            }
        }
        else {
            if (eval[1] === "-") {
                yval = 0;
            }
            else {
                yval = 100;
            }
        }
    }
    else {
        eval = parseFloat(eval);
        if (getPlayerToMoveInResultFen() !== playerColour && eval !== 0.0) {
            eval *= -1;
        }
        eval /= 100;
        yval = (100 / (1 + Math.exp(-0.25 * eval)));
        if (eval < 0) {
            evalText.style.top = "0px";
            evalText.style.bottom = "";
        }
        else {
            evalText.style.top = "";
            evalText.style.bottom = "0px";
        }
        evalText.innerText = Math.abs(parseFloat(eval.toFixed(1))).toString();
    }
    if (playerColour === "w") {
        yval = 100 - yval;
    }
    // black bar is 0, so white is mating
    if (yval === 0) {
        evalText.style.color = "black";
    }
    if (yval === 100) {
        evalText.style.color = "white";
    }
    evalBar.style.height = yval.toString() + "%";
    // Do this in new game logic
    if (playerColour === "w") {
        evalBar.style.top = "0px";
        evalBar.style.bottom = "";
        if (yval !== 0 && yval !== 100) {
            evalText.style.color = eval < 0 ? "white" : "black";
        }
    }
    else {
        evalBar.style.top = "";
        evalBar.style.bottom = "0px";
        if (yval !== 0 && yval !== 100) {
            evalText.style.color = eval < 0 ? "black" : "white";
        }
    }
};
var showEvalBar = function () {
    var evalBar = document.querySelector("#chessAid-eval");
    if (!evalBar) {
        createEvalBarOverlay();
    }
    setEvalBar(currentEval);
};
var resetBoard = function () {
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            board[i][j] = "";
        }
    }
};
var underAttackByRook = function (row, col) {
    var underAttack = [];
    var rookColour = board[row][col][0];
    // Under attack on row going left
    var tempCol = col - 1;
    while (true) {
        if (tempCol < 0) {
            break;
        }
        if (board[row][tempCol]) {
            if (board[row][tempCol][0] === playerColour &&
                rookColour !== playerColour) {
                addColourUnderAttackLocal(row, tempCol, underAttackColour, underAttack);
            }
            if (board[row][tempCol][0] !== playerColour &&
                rookColour === playerColour) {
                addColourUnderAttackLocal(row, tempCol, attackEnemyColour, underAttack);
            }
            break;
        }
        else if (rookColour !== playerColour) {
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
            if (board[row][tempCol][0] === playerColour &&
                rookColour !== playerColour) {
                addColourUnderAttackLocal(row, tempCol, underAttackColour, underAttack);
            }
            if (board[row][tempCol][0] !== playerColour &&
                rookColour === playerColour) {
                addColourUnderAttackLocal(row, tempCol, attackEnemyColour, underAttack);
            }
            break;
        }
        else if (rookColour !== playerColour) {
            addColourUnderAttackLocal(row, tempCol, controlledByEnemyColour, underAttack);
        }
        tempCol += 1;
    }
    // Under attack on column going up
    var tempRow = row - 1;
    while (true) {
        if (tempRow < 0) {
            break;
        }
        if (board[tempRow][col]) {
            if (board[tempRow][col][0] === playerColour &&
                rookColour !== playerColour) {
                addColourUnderAttackLocal(tempRow, col, underAttackColour, underAttack);
            }
            if (board[tempRow][col][0] !== playerColour &&
                rookColour === playerColour) {
                addColourUnderAttackLocal(tempRow, col, attackEnemyColour, underAttack);
            }
            break;
        }
        else if (rookColour !== playerColour) {
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
            if (board[tempRow][col][0] === playerColour &&
                rookColour !== playerColour) {
                addColourUnderAttackLocal(tempRow, col, underAttackColour, underAttack);
            }
            if (board[tempRow][col][0] !== playerColour &&
                rookColour === playerColour) {
                addColourUnderAttackLocal(tempRow, col, attackEnemyColour, underAttack);
            }
            break;
        }
        else if (rookColour !== playerColour) {
            addColourUnderAttackLocal(tempRow, col, controlledByEnemyColour, underAttack);
        }
        tempRow += 1;
    }
    return underAttack;
};
var underAttackByKnight = function (row, col) {
    var knightColour = board[row][col][0];
    var underAttack = [];
    var options = [
        [-1, -2],
        [-2, -1],
        [-2, 1],
        [-1, 2],
        [1, 2],
        [2, 1],
        [2, -1],
        [1, -2],
    ];
    for (var _i = 0, options_1 = options; _i < options_1.length; _i++) {
        var option = options_1[_i];
        if (row + option[0] >= 0 &&
            col + option[1] >= 0 &&
            row + option[0] < 8 &&
            col + option[1] < 8) {
            if (board[row + option[0]][col + option[1]]) {
                if (board[row + option[0]][col + option[1]][0] === playerColour &&
                    knightColour !== playerColour) {
                    addColourUnderAttackLocal(row + option[0], col + option[1], underAttackColour, underAttack);
                }
                else if (board[row + option[0]][col + option[1]][0] !== playerColour &&
                    knightColour === playerColour) {
                    addColourUnderAttackLocal(row + option[0], col + option[1], attackEnemyColour, underAttack);
                }
            }
            else if (knightColour !== playerColour) {
                addColourUnderAttackLocal(row + option[0], col + option[1], controlledByEnemyColour, underAttack);
            }
        }
    }
    return underAttack;
};
var underAttackByKing = function (row, col) {
    var kingColour = board[row][col][0];
    var underAttack = [];
    var options = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
    ];
    for (var _i = 0, options_2 = options; _i < options_2.length; _i++) {
        var option = options_2[_i];
        if (row + option[0] >= 0 &&
            col + option[1] >= 0 &&
            row + option[0] < 8 &&
            col + option[1] < 8) {
            if (board[row + option[0]][col + option[1]]) {
                if (board[row + option[0]][col + option[1]][0] === playerColour &&
                    kingColour !== playerColour) {
                    addColourUnderAttackLocal(row + option[0], col + option[1], underAttackColour, underAttack);
                }
                else if (board[row + option[0]][col + option[1]][0] !== playerColour &&
                    kingColour === playerColour) {
                    addColourUnderAttackLocal(row + option[0], col + option[1], attackEnemyColour, underAttack);
                }
            }
            else if (kingColour !== playerColour) {
                addColourUnderAttackLocal(row + option[0], col + option[1], controlledByEnemyColour, underAttack);
            }
        }
    }
    return underAttack;
};
var underAttackByBishop = function (row, col) {
    var bishopColour = board[row][col][0];
    var underAttack = [];
    // Under attack going up and left
    var tempRow = row - 1;
    var tempCol = col - 1;
    while (true) {
        if (tempRow < 0 || tempCol < 0) {
            break;
        }
        if (board[tempRow][tempCol]) {
            if (board[tempRow][tempCol][0] === playerColour &&
                bishopColour !== playerColour) {
                addColourUnderAttackLocal(tempRow, tempCol, underAttackColour, underAttack);
            }
            else if (board[tempRow][tempCol][0] !== playerColour &&
                bishopColour === playerColour) {
                addColourUnderAttackLocal(tempRow, tempCol, attackEnemyColour, underAttack);
            }
            break;
        }
        else if (bishopColour !== playerColour) {
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
            if (board[tempRow][tempCol][0] === playerColour &&
                bishopColour !== playerColour) {
                addColourUnderAttackLocal(tempRow, tempCol, underAttackColour, underAttack);
            }
            else if (board[tempRow][tempCol][0] !== playerColour &&
                bishopColour === playerColour) {
                addColourUnderAttackLocal(tempRow, tempCol, attackEnemyColour, underAttack);
            }
            break;
        }
        else if (bishopColour !== playerColour) {
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
            if (board[tempRow][tempCol][0] === playerColour &&
                bishopColour !== playerColour) {
                addColourUnderAttackLocal(tempRow, tempCol, underAttackColour, underAttack);
            }
            else if (board[tempRow][tempCol][0] !== playerColour &&
                bishopColour === playerColour) {
                addColourUnderAttackLocal(tempRow, tempCol, attackEnemyColour, underAttack);
            }
            break;
        }
        else if (bishopColour !== playerColour) {
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
            if (board[tempRow][tempCol][0] === playerColour &&
                bishopColour !== playerColour) {
                addColourUnderAttackLocal(tempRow, tempCol, underAttackColour, underAttack);
            }
            else if (board[tempRow][tempCol][0] !== playerColour &&
                bishopColour === playerColour) {
                addColourUnderAttackLocal(tempRow, tempCol, attackEnemyColour, underAttack);
            }
            break;
        }
        else if (bishopColour !== playerColour) {
            addColourUnderAttackLocal(tempRow, tempCol, controlledByEnemyColour, underAttack);
        }
        tempRow += 1;
        tempCol += 1;
    }
    return underAttack;
};
var setPlayerColour = function () {
    try {
        var isBlack = document
            .getElementsByTagName("chess-board")[0]
            .classList.contains("flipped");
        playerColour = isBlack ? "b" : "w";
    }
    catch (e) {
        playerColour = "w";
        console.log("Caught error: " + e);
    }
};
var init = function () {
    // const isBlack = document
    //   .querySelector("#game-board")
    //   .classList.contains("flipped");
    // if (isBlack) {
    //   playerColour = "b";
    // }
    setPlayerColour();
    if (includeEvalBar) {
        createEvalBarOverlay();
    }
    if (includeOpeningsExplorer) {
        createOpeningsOverlay(true);
    }
    // getPiecePositions();
    // setBoardSizeAndPosition();
    // createEvalBarOverlay();
};
var getPiecePositions = function () {
    var urlString = window.location.href;
    var isBlack = false;
    if (urlString.indexOf("https://www.chess.com/live") !== -1) {
        url = 2 /* live */;
        try {
            isBlack = document
                .querySelector("#game-board")
                .classList.contains("flipped");
        }
        catch (e) {
            isBlack = false;
        }
        var pieces = document.querySelector(".pieces").childNodes;
        for (var _i = 0, _a = pieces; _i < _a.length; _i++) {
            var piece = _a[_i];
            var coord = piece.classList[1].split("-")[1];
            var col = parseInt(coord[1]);
            var row = parseInt(coord[3]);
            var name_1 = piece.style.backgroundImage
                .split("/")[7]
                .substring(0, 2);
            assignPieceToBoard(isBlack, row, col, name_1);
        }
    }
    else {
        try {
            var board_1 = document.getElementsByTagName("chess-board")[0];
            if (board_1) {
                isBlack = document
                    .getElementsByTagName("chess-board")[0]
                    .classList.contains("flipped");
            }
            else if (document.querySelector("#board")) {
                isBlack = false;
            }
        }
        catch (e) {
            alert("ChessAid was not able to find the chess board");
            isBlack = false;
        }
        var pieces = document.querySelectorAll(".piece");
        for (var _b = 0, _c = pieces; _b < _c.length; _b++) {
            var piece = _c[_b];
            var classList = piece.classList;
            var coord = "";
            var name_2 = "";
            for (var i = 0; i < classList.length; i++) {
                var class_ = classList[i];
                if (class_.indexOf("square") !== -1) {
                    coord = class_.split("-")[1];
                }
                else if (class_.length === 2) {
                    name_2 = class_;
                }
            }
            var col = parseInt(coord[0]);
            var row = parseInt(coord[1]);
            assignPieceToBoard(isBlack, row, col, name_2);
        }
    }
    playerColour = isBlack ? "b" : "w";
    return board;
};
var assignPieceToBoard = function (isBlack, row, col, name) {
    if (!isBlack) {
        board[8 - row][col - 1] = name;
    }
    else {
        board[row - 1][8 - col] = name;
    }
};
var underAttackByPawn = function (row, col) {
    var underAttack = [];
    var pawnColour = board[row][col][0];
    if (pawnColour !== playerColour) {
        if (row + 1 < 8 && col - 1 >= 0) {
            if (board[row + 1][col - 1] &&
                board[row + 1][col - 1][0] === playerColour) {
                addColourUnderAttackLocal(row + 1, col - 1, underAttackColour, underAttack);
            }
            else if (!board[row + 1][col - 1]) {
                addColourUnderAttackLocal(row + 1, col - 1, controlledByEnemyColour, underAttack);
            }
        }
        if (row + 1 < 8 && col + 1 < 8) {
            if (board[row + 1][col + 1] &&
                board[row + 1][col + 1][0] === playerColour) {
                addColourUnderAttackLocal(row + 1, col + 1, underAttackColour, underAttack);
            }
            else if (!board[row + 1][col + 1]) {
                addColourUnderAttackLocal(row + 1, col + 1, controlledByEnemyColour, underAttack);
            }
        }
    }
    else {
        if (row - 1 < 8 &&
            col - 1 >= 0 &&
            board[row - 1][col - 1] &&
            board[row - 1][col - 1][0] !== playerColour) {
            addColourUnderAttackLocal(row - 1, col - 1, attackEnemyColour, underAttack);
        }
        if (row + 1 < 8 &&
            col + 1 < 8 &&
            board[row - 1][col + 1] &&
            board[row - 1][col + 1][0] !== playerColour) {
            addColourUnderAttackLocal(row - 1, col + 1, attackEnemyColour, underAttack);
        }
    }
    return underAttack;
};
var getPiecesUnderAttack = function () {
    var underAttack = [];
    for (var row = 0; row < 8; row++) {
        for (var col = 0; col < 8; col++) {
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
var highlightSquareByCoordinate = function (row, col, meaning) {
    // Return early if that color is toggled off
    // const meaning = colourToMeaning[colour];
    if (!highlightsToInclude[meaning])
        return;
    var colour = meaningToColour[meaning];
    var left = col * boardSize;
    var top = row * boardSize;
    var div = document.createElement("div");
    div.className = "highlights";
    div.style.position = "absolute";
    div.style.width = boardSize + "px";
    div.style.height = boardSize + "px";
    div.style.background = colour;
    div.style.opacity = "1";
    if (colour === controlledByEnemyColour) {
        div.style.opacity = controlledByEnemyOpacity;
    }
    else if (colour === attackEnemyColour) {
        div.style.opacity = enemyUnderAttackOpacity;
    }
    else if (colour === underAttackColour) {
        div.style.opacity = selfUnderAttackOpacity;
    }
    else if (colour === bestMoveColour) {
        div.style.opacity = bestMoveOpacity;
        div.className += " bestMove";
    }
    div.style.left = left + "px";
    div.style.top = top + "px";
    if (url === 2 /* live */) {
        document.querySelector(".arrows-container").appendChild(div);
    }
    else {
        try {
            document
                .getElementsByTagName("chess-board")[0]
                .insertBefore(div, document.querySelector(".piece"));
        }
        catch (e) {
            document
                .querySelector("#board")
                .insertBefore(div, document.querySelector(".piece"));
        }
    }
};
var deleteHighlights = function () {
    var highlights = document.getElementsByClassName("highlights");
    while (highlights.length > 0)
        highlights[0].remove();
};
var isGameStarted = function () {
    return document.getElementsByTagName("vertical-move-list").length !== 0;
};
var sendFen = function () {
    // Wait until board is updated
    setTimeout(function () {
        var fen = getFen();
        if (getPlayerToMove() !== playerColour && depth >= 17) {
            chrome.runtime.sendMessage({
                kind: "stop"
            });
            return;
        }
        if (fen === fenCache)
            return;
        // console.log("Fen is ", fen)
        // console.log("Board is ", board)
        latestFEN = fen;
        fenCache = fen;
        chrome.runtime.sendMessage({
            kind: "fen",
            content: fen,
            depth: depth
        });
    }, 10);
};
var isBoardUpdated = function (board1) {
    for (var row = 0; row < 8; row++) {
        for (var col = 0; col < 8; col++) {
            if (board1[row][col] !== board[row][col]) {
                return true;
            }
        }
    }
    return false;
};
var forgotBestMove = function () {
    if (!lastBestMove) {
        return;
    }
    var highlights = document.querySelectorAll('.highlights');
    for (var i = 0; i < highlights.length; i++) {
        if (highlights[i].classList.contains("bestMove")) {
            return false;
        }
    }
    return true;
};
var mainLoop = function () {
    if (!window.sessionStorage.getItem("interval")) {
        return;
    }
    setBoardSizeAndPosition();
    var oldBoard = board.map(function (arr) {
        return arr.slice();
    });
    resetBoard();
    getPiecePositions();
    if (!isBoardUpdated(oldBoard) && !isFirstPass && lastBestMove !== "") {
        return;
    }
    isFirstPass = false;
    deleteHighlights();
    underAttack = getPiecesUnderAttack();
    for (var _i = 0, underAttack_1 = underAttack; _i < underAttack_1.length; _i++) {
        var square = underAttack_1[_i];
        highlightSquareByCoordinate(square[0], square[1], square[2]);
    }
    sendFen();
    if (includeOpeningsExplorer) {
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
var pause = function () {
    chrome.storage.local.set({ status: "Not Running" });
    resetBoard();
    underAttack = [];
    latestFEN = "";
    isFirstPass = false;
    lastBestMove = "";
    fenCache = "";
    var interval = window.sessionStorage.getItem("interval");
    if (interval) {
        window.clearInterval(parseInt(interval));
        deleteHighlights();
        deleteEvalBar();
        window.sessionStorage.removeItem("interval");
    }
};
var deleteEvalBar = function () {
    try {
        var evalBar = document.querySelector("#chessAid-eval");
        var evalText = document.querySelector("#evalText");
        if (evalBar) {
            evalBar.remove();
        }
        var boardLayoutEvaluation = document.querySelector(".board-layout-evaluation");
        if (boardLayoutEvaluation) {
            boardLayoutEvaluation.style.backgroundColor = "";
        }
        if (evalText) {
            evalText.remove();
        }
    }
    catch (e) {
        console.log("Caught error: ", e);
    }
};
var isRunning = function () {
    return window.sessionStorage.getItem("interval") !== null;
};
var start = function () {
    chrome.storage.local.set({ bestMove: null, eval: 0, fen: null, status: "Running" });
    lastBestMove = "";
    isFirstPass = true;
    if (window.sessionStorage.getItem("interval")) {
        window.sessionStorage.removeItem("interval");
    }
    if (document.getElementsByTagName("canvas").length !== 0) {
        alert("ChessAid was not able to find the chess board. Please make sure that animation type is NOT set to Natural or Arcade.");
        return;
    }
    init();
    var interval = window.setInterval(mainLoop, 750);
    window.sessionStorage.setItem("interval", interval.toString());
};
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message === "start") {
        start();
    }
    else if (message === "pause") {
        pause();
    }
    else if (message === "toggleControlledByEnemy") {
        highlightsToInclude["controlledByEnemy"] =
            !highlightsToInclude["controlledByEnemy"];
        resetHighlights();
    }
    else if (message === "toggleEnemyUnderAttack") {
        highlightsToInclude["enemyUnderAttack"] =
            !highlightsToInclude["enemyUnderAttack"];
        resetHighlights();
    }
    else if (message === "toggleSelfUnderAttack") {
        highlightsToInclude["selfUnderAttack"] =
            !highlightsToInclude["selfUnderAttack"];
        resetHighlights();
    }
    else if (message === "toggleBestMove") {
        highlightsToInclude["bestMove"] =
            !highlightsToInclude["bestMove"];
        resetHighlights();
    }
    else if (message.startsWith("colourChange")) {
        var split = message.split(" ");
        var id = split[1];
        var colour = split[2];
        if (id === "colourControlledByEnemy") {
            setControlledByEnemyColour(colour);
        }
        else if (id === "colourEnemyUnderAttack") {
            setEnemyunderAttackColour(colour);
        }
        else if (id === "colourSelfUnderAttack") {
            setUnderAttackColour(colour);
        }
        else if (id === "colourBestMove") {
            setBestMoveColour(colour);
        }
        setColorToMeaningMap();
        setMeaningToColourMap();
        resetHighlights();
    }
    else if (message.startsWith("opacityChange")) {
        var split = message.split(" ");
        var id = split[1];
        var value = split[2];
        if (id === "controlledByEnemyOpacity") {
            controlledByEnemyOpacity = (value / 100).toString();
        }
        else if (id === "enemyUnderAttackOpacity") {
            enemyUnderAttackOpacity = (value / 100).toString();
        }
        else if (id === "selfUnderAttackOpacity") {
            selfUnderAttackOpacity = (value / 100).toString();
        }
        else if (id === "bestMoveOpacity") {
            bestMoveOpacity = (value / 100).toString();
        }
        resetHighlights();
    }
    else if (message.startsWith("depth")) {
        depth = message.split(" ")[1];
        if (isRunning()) {
            pause();
            start();
        }
    }
    else if (message === "toggleEvalBar") {
        includeEvalBar = !includeEvalBar;
        if (!includeEvalBar) {
            deleteEvalBar();
        }
        else {
            showEvalBar();
        }
    }
    else if (message === "toggleOpeningsExplorer") {
        includeOpeningsExplorer = !includeOpeningsExplorer;
        if (!includeOpeningsExplorer) {
            deleteOpeningsExplorer();
        }
        else {
            createOpeningsOverlay(true);
        }
    }
    else if (message === "are_you_there_content_script?") {
        sendResponse({ status: "yes" });
    }
});
var deleteOpeningsExplorer = function () {
    var adContainer = document.querySelector("#board-layout-ad");
    adContainer.innerHTML = "";
};
function setColorToMeaningMap() {
    var _a;
    colourToMeaning = (_a = {},
        _a[attackEnemyColour] = "enemyUnderAttack",
        _a[underAttackColour] = "selfUnderAttack",
        _a[controlledByEnemyColour] = "controlledByEnemy",
        _a[bestMoveColour] = "bestMove",
        _a);
}
function setMeaningToColourMap() {
    meaningToColour = {
        "enemyUnderAttack": attackEnemyColour,
        "selfUnderAttack": underAttackColour,
        "controlledByEnemy": controlledByEnemyColour,
        "bestMove": bestMoveColour
    };
}
function setBoardSizeAndPosition() {
    if (url === 2 /* live */) {
        document.querySelector(".arrows-container").style.position = "relative";
        boardSize = document.querySelector(".arrows-container").clientHeight / 8;
    }
    else {
        try {
            document.getElementsByTagName("chess-board")[0].style.position = "relative";
            boardSize =
                document.getElementsByTagName("chess-board")[0].clientHeight / 8;
        }
        catch (e) {
            document.querySelector("#board").style.position =
                "relative";
            boardSize = document.querySelector("#board").clientHeight / 8;
        }
    }
}
var setUnderAttackColour = function (colour) {
    underAttackColour = colour;
};
var setEnemyunderAttackColour = function (colour) {
    attackEnemyColour = colour;
};
var setControlledByEnemyColour = function (colour) {
    controlledByEnemyColour = colour;
};
var setBestMoveColour = function (colour) {
    bestMoveColour = colour;
};
var getFen = function () {
    var fen = "";
    for (var rank = 0; rank < board.length; rank++) {
        // count empty fields
        var empty = 0;
        // empty string for each rank
        var rankFen = "";
        for (var file = 0; file < board[rank].length; file++) {
            var isEmpty = true;
            if ((playerColour === "w" && board[rank][file].length !== 0) ||
                (playerColour === "b" && board[7 - rank][7 - file].length !== 0)) {
                isEmpty = false;
            }
            if (isEmpty) {
                empty++;
            }
            else {
                // add the number to the fen if not zero.
                if (empty !== 0)
                    rankFen += empty;
                // add the letter to the fen
                if (playerColour === 'w') {
                    rankFen += pieceToFen[board[rank][file]];
                }
                else {
                    rankFen += pieceToFen[board[7 - rank][7 - file]];
                }
                // reset the empty
                empty = 0;
            }
        }
        // add the number to the fen if not zero.
        if (empty != 0)
            rankFen += empty;
        // add the rank to the fen
        fen += rankFen;
        // add rank separator. If last then add a space
        if (!(rank === board.length - 1)) {
            fen += "/";
        }
        else {
            fen += " ";
        }
    }
    fen += getPlayerToMove();
    fen += " " + getCastlingString();
    fen += " - 0 1";
    // Todo add enpessant target square
    return fen;
};
var getPlayerToMove = function () {
    try {
        var moves = document.querySelectorAll('.move');
        var lastMove = moves[moves.length - 1];
        var children = lastMove.children;
        if (children[0].classList.contains("game-result")) {
            lastMove = moves[moves.length - 2];
            children = lastMove.children;
        }
        for (var i = 0; i < children.length; i++) {
            if (children[i].classList.contains("black")) {
                return "w";
            }
        }
        return "b";
        // return moves[moves.length - 1].children. ? 'w' : 'b';
    }
    catch (e) {
        return 'w';
    }
};
var getWhiteCastlingAvailability = function () {
    var kingside = true;
    var queenside = true;
    var whiteMoves = document.querySelectorAll('.white.node');
    for (var i = 0; i < whiteMoves.length; i++) {
        var node = whiteMoves[i];
        var text = node.innerText;
        var nodeChildren = node.children;
        var rookIcon = false;
        var kingIcon = false;
        if (nodeChildren.length > 0) {
            rookIcon = Array.from(nodeChildren[0].classList).includes('rook-white');
            kingIcon = Array.from(nodeChildren[0].classList).includes('king-white');
        }
        if (text.includes("K") || kingIcon || text.includes("O")) {
            return "";
        }
        else if ((rookIcon || text.includes("R"))) {
            if (text.includes("h") || text.includes("g1") || text.includes("f1")) {
                kingside = false;
            }
            else if (text.includes("a") || text.includes("b1") || text.includes("c1") || text.includes("d1")) {
                queenside = false;
            }
        }
    }
    var castling = kingside ? "K" : "";
    castling += queenside ? "Q" : "";
    return castling;
};
var getBlackCastlingAvailability = function () {
    var kingside = true;
    var queenside = true;
    var blackMoves = document.querySelectorAll('.black.node');
    for (var i = 0; i < blackMoves.length; i++) {
        var node = blackMoves[i];
        var text = node.innerText;
        var nodeChildren = node.children;
        var rookIcon = false;
        var kingIcon = false;
        if (nodeChildren.length > 0) {
            rookIcon = Array.from(nodeChildren[0].classList).includes('rook-black');
            kingIcon = Array.from(nodeChildren[0].classList).includes('king-black');
        }
        if (text.includes("K") || kingIcon || text.includes("O")) {
            return "";
        }
        else if ((rookIcon || text.includes("R"))) {
            if (text.includes("h") || text.includes("g8") || text.includes("f8")) {
                kingside = false;
            }
            else if (text.includes("a") || text.includes("b8") || text.includes("c8") || text.includes("d8")) {
                queenside = false;
            }
        }
    }
    var castling = kingside ? "k" : "";
    castling += queenside ? "q" : "";
    return castling;
};
var getCastlingString = function () {
    var whiteCastlingString = getWhiteCastlingAvailability();
    var blackCastlingString = getBlackCastlingAvailability();
    var castlingString = whiteCastlingString + blackCastlingString;
    return castlingString !== "" ? castlingString : "-";
};
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
chrome.storage.onChanged.addListener(function (changes, namespace) {
    return __awaiter(this, void 0, void 0, function () {
        var letterToCol, curFen, res, startSquare, endSquare, startSquareRow, startSquareColumn, endSquareRow, endSquareColumn, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    letterToCol = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    curFen = getFen();
                    if (!("fen" in changes && curFen === changes.fen.newValue)) return [3 /*break*/, 3];
                    return [4 /*yield*/, chrome.storage.local.get(["bestMove", "eval"])];
                case 2:
                    res = _a.sent();
                    resultFen = curFen;
                    currentEval = res.eval;
                    if (includeEvalBar) {
                        showEvalBar();
                    }
                    else {
                        deleteEvalBar();
                    }
                    if (getPlayerToMoveInResultFen() === playerColour) {
                        // console.log("Best move: " + res.bestMove + "eval " + res.eval) 
                        lastBestMove = res.bestMove;
                        startSquare = res.bestMove.substring(0, 2);
                        endSquare = res.bestMove.substring(2, 4);
                        startSquareRow = 8 - startSquare[1];
                        startSquareColumn = letterToCol[startSquare[0]];
                        endSquareRow = 8 - endSquare[1];
                        endSquareColumn = letterToCol[endSquare[0]];
                        if (playerColour === 'w') {
                            startSquareRow = 8 - startSquare[1];
                            startSquareColumn = letterToCol[startSquare[0]];
                            endSquareRow = 8 - endSquare[1];
                            endSquareColumn = letterToCol[endSquare[0]];
                        }
                        else {
                            startSquareRow = startSquare[1] - 1;
                            startSquareColumn = 7 - letterToCol[startSquare[0]];
                            endSquareRow = endSquare[1] - 1;
                            endSquareColumn = 7 - letterToCol[endSquare[0]];
                        }
                        addColourUnderAttack(startSquareRow, startSquareColumn, bestMoveColour);
                        addColourUnderAttack(endSquareRow, endSquareColumn, bestMoveColour);
                        highlightSquareByCoordinate(startSquareRow, startSquareColumn, "bestMove");
                        highlightSquareByCoordinate(endSquareRow, endSquareColumn, "bestMove");
                    }
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    // Sometimes we don't get the message back properly, in this case resend it
                    console.log("Caught type error, resending: " + e_1);
                    if (e_1 instanceof TypeError) {
                        chrome.storage.local.set({ bestMove: null, eval: 0, fen: null });
                        sendFen();
                    }
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
});
window.onresize = function () {
    resetHighlights();
};
var resetHighlights = function () {
    setBoardSizeAndPosition();
    deleteHighlights();
    for (var _i = 0, underAttack_2 = underAttack; _i < underAttack_2.length; _i++) {
        var square = underAttack_2[_i];
        highlightSquareByCoordinate(square[0], square[1], square[2]);
    }
};
var addColourUnderAttack = function (row, col, colour) {
    var meaning = colourToMeaning[colour];
    // if (!highlightsToInclude[meaning]) return;
    underAttack.push([row, col, meaning]);
};
var addColourUnderAttackLocal = function (row, col, colour, underAttack) {
    var meaning = colourToMeaning[colour];
    // if (!highlightsToInclude[meaning]) return;
    underAttack.push([row, col, colourToMeaning[colour]]);
};
var getOpenings = function (fen) { return __awaiter(_this, void 0, void 0, function () {
    var url;
    return __generator(this, function (_a) {
        url = transformFen(fen);
        return [2 /*return*/, fetch("https://explorer.lichess.ovh/master?fen=".concat(url))
                .then(function (res) { return res.json(); })
                .then(function (json) { return (json.moves.map(function (res) { return ({ "move": res.san, "white": res.white, "black": res.black, "draws": res.draws }); })); })];
    });
}); };
var transformFen = function (fen) {
    return fen.replace(/ /g, "_");
};
var getTotalText = function (total) {
    if (total > 1000000) {
        return Math.round(total / 1000000) + "M";
    }
    else if (total > 1000) {
        return Math.round(total / 1000) + "K";
    }
    else {
        return total.toString();
    }
};
var createOpeningsOverlay = function (justOpened) {
    if (justOpened === void 0) { justOpened = false; }
    return __awaiter(_this, void 0, void 0, function () {
        var fen, openings, sidebar, left, width, adContainer, openingsContainer, heading, caption;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fen = getFen();
                    if (fen === fenCache && !justOpened)
                        return [2 /*return*/];
                    return [4 /*yield*/, getOpenings(fen)];
                case 1:
                    openings = _a.sent();
                    sidebar = document.querySelector(".board-layout-sidebar");
                    left = sidebar.getBoundingClientRect().x;
                    width = sidebar.offsetWidth;
                    adContainer = document.querySelector("#board-layout-ad");
                    adContainer.style.position = "absolute";
                    adContainer.style.left = (left + width + 10) + "px";
                    adContainer.style.width = (window.innerWidth - (left + width + 40)) + "px";
                    adContainer.style.margin = "0px";
                    adContainer.innerHTML = "";
                    openingsContainer = document.createElement("div");
                    heading = document.createElement("h2");
                    heading.innerText = "Openings Explorer";
                    heading.style.color = "white";
                    openingsContainer.appendChild(heading);
                    caption = document.createElement("div");
                    caption.innerText = "Win rate % by move";
                    caption.style.color = "white";
                    caption.style.marginBottom = "5px";
                    openingsContainer.appendChild(caption);
                    openingsContainer.style.width = "100%";
                    openings.forEach(function (move) {
                        var total = move.white + move.black + move.draws;
                        var totalText = getTotalText(total);
                        var numGames = document.createElement("div");
                        numGames.innerText = totalText;
                        numGames.style.position = "absolute";
                        numGames.style.bottom = "0px";
                        numGames.style.left = "0px";
                        numGames.style.fontSize = "11px";
                        var moveContainer = document.createElement("div");
                        moveContainer.style.display = "flex";
                        moveContainer.style.marginBottom = "5px";
                        var text = document.createElement("span");
                        text.innerText = "".concat(move.move);
                        text.style.marginRight = "5px";
                        text.style.color = "white";
                        text.style.width = "50px";
                        var white = document.createElement("div");
                        var whitePercent = move.white / total * 100;
                        white.style.width = whitePercent + "%";
                        white.style.backgroundColor = "white";
                        white.style.height = "30px";
                        white.innerText = whitePercent >= 5 ? Math.round(whitePercent).toString() : "";
                        white.style.textAlign = "center";
                        white.style.color = "black";
                        var black = document.createElement("div");
                        var blackPercent = move.black / total * 100;
                        black.style.width = blackPercent + "%";
                        black.style.backgroundColor = "black";
                        black.style.height = "30px";
                        black.innerText = blackPercent >= 5 ? Math.round(blackPercent).toString() : "";
                        black.style.textAlign = "center";
                        black.style.color = "white";
                        var draw = document.createElement("div");
                        var drawPercent = move.draws / total * 100;
                        draw.style.width = drawPercent + "%";
                        draw.style.backgroundColor = "grey";
                        draw.style.height = "30px";
                        draw.innerText = drawPercent >= 5 ? Math.round(drawPercent).toString() : "";
                        draw.style.textAlign = "center";
                        draw.style.color = "white";
                        draw.style.zIndex = "5";
                        var percentagesContainer = document.createElement("div");
                        percentagesContainer.style.width = "100%";
                        percentagesContainer.style.display = "flex";
                        percentagesContainer.style.position = "relative";
                        if (playerColour === "w") {
                            percentagesContainer.appendChild(white);
                            percentagesContainer.appendChild(draw);
                            percentagesContainer.appendChild(black);
                            numGames.style.color = "black";
                        }
                        else {
                            percentagesContainer.appendChild(black);
                            percentagesContainer.appendChild(draw);
                            percentagesContainer.appendChild(white);
                            numGames.style.color = "white";
                        }
                        percentagesContainer.appendChild(numGames);
                        moveContainer.appendChild(text);
                        moveContainer.appendChild(percentagesContainer);
                        openingsContainer.appendChild(moveContainer);
                    });
                    adContainer.appendChild(openingsContainer);
                    return [2 /*return*/];
            }
        });
    });
};
// get openings
// Algorithm
// on board change
//    send the current fen
//    get the response
//    for each move, get wins, losses, and draws
//    win pct = win/total, l pct = l/total, draw pct = draw / total
//    create opening overlay on board
//     create div with win, draw,loss
//# sourceMappingURL=chess.js.map