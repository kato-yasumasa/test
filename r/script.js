const boardElement = document.getElementById('board');
const currentPlayerDisplay = document.getElementById('current-player-display');
const whiteCountDisplay = document.getElementById('white-count');
const blackCountDisplay = document.getElementById('black-count');
const messageElement = document.getElementById('message');
const resetButton = document.getElementById('reset-button');

const EMPTY = 0;
const WHITE = 1;
const BLACK = -1;

let board = []; // ゲーム盤の状態を保持する2次元配列
let currentPlayer = WHITE; // 現在の手番
let whiteCount = 0;
let blackCount = 0;
let gameOver = false;

// 初期化関数
function initializeGame() {
    board = Array(8).fill(0).map(() => Array(8).fill(EMPTY));

    // 初期配置
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;

    currentPlayer = WHITE; // プレイヤーは常に白
    gameOver = false;
    messageElement.textContent = '';
    renderBoard();
    updateCounts();
    updatePlayerDisplay();
    highlightValidMoves(); // ゲーム開始時はプレイヤーのターンなのでハイライト表示
}

// 盤面を描画する関数
function renderBoard() {
    boardElement.innerHTML = ''; // 一度クリア
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            // 石が存在する場合のみ石の要素を作成・追加
            if (board[r][c] !== EMPTY) {
                const stone = document.createElement('div');
                stone.classList.add('stone', board[r][c] === WHITE ? 'white' : 'black');
                cell.appendChild(stone);
            }

            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }
}

// 石の数を更新して表示する関数
function updateCounts() {
    whiteCount = 0;
    blackCount = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === WHITE) {
                whiteCount++;
            } else if (board[r][c] === BLACK) {
                blackCount++;
            }
        }
    }
    whiteCountDisplay.textContent = whiteCount;
    blackCountDisplay.textContent = blackCount;
}

// 現在の手番を表示する関数
function updatePlayerDisplay() {
    currentPlayerDisplay.textContent = currentPlayer === WHITE ? '白' : '黒';
    currentPlayerDisplay.style.color = currentPlayer === WHITE ? 'white' : 'black';
    currentPlayerDisplay.style.backgroundColor = currentPlayer === WHITE ? 'black' : 'white';
    currentPlayerDisplay.style.padding = '0 5px';
    currentPlayerDisplay.style.borderRadius = '3px';
}


// 有効な手があるマスをハイライトする関数
function highlightValidMoves() {
    // 既存のハイライトを削除
    document.querySelectorAll('.cell.highlight').forEach(cell => {
        cell.classList.remove('highlight');
    });

    // ゲーム終了時、またはNPCのターン中はハイライトしない
    if (gameOver || currentPlayer === BLACK) {
        return;
    }

    const validMoves = getValidMoves(currentPlayer);
    validMoves.forEach(move => {
        const cell = boardElement.children[move.r * 8 + move.c];
        cell.classList.add('highlight');
    });
}

// 指定された座標が盤面内にあるかチェック
function isValid(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// 指定された位置に石を置けるか（ひっくり返せる石があるか）チェックし、ひっくり返せる石のリストを返す
function checkFlip(r, c, player, boardState) {
    if (boardState[r][c] !== EMPTY) {
        return []; // 既に石がある場合は置けない
    }

    const opponent = -player;
    let flippedStones = [];

    // 8方向をチェック
    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1], // 上下左右
        [-1, -1], [-1, 1], [1, -1], [1, 1]  // 斜め
    ];

    for (const [dr, dc] of directions) {
        let tempFlipped = [];
        let curR = r + dr;
        let curC = c + dc;

        while (isValid(curR, curC) && boardState[curR][curC] === opponent) {
            tempFlipped.push({ r: curR, c: curC });
            curR += dr;
            curC += dc;
        }

        // 自分の石で挟まれているかチェック
        if (isValid(curR, curC) && boardState[curR][curC] === player) {
            flippedStones = flippedStones.concat(tempFlipped);
        }
    }
    return flippedStones;
}

// 有効な手をすべて取得する関数
function getValidMoves(player) {
    const validMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (checkFlip(r, c, player, board).length > 0) {
                validMoves.push({ r: r, c: c });
            }
        }
    }
    return validMoves;
}

// 石を置く処理とひっくり返す処理
async function placeStoneAndFlip(r, c, player) {
    const flipped = checkFlip(r, c, player, board);

    if (flipped.length === 0) {
        return false; // ひっくり返せる石がない場合は置けない
    }

    // 新しい石を盤面データに置く
    board[r][c] = player;

    // 新しい石をDOMに描画
    const newStoneCell = boardElement.children[r * 8 + c];
    let newStoneElement = newStoneCell.querySelector('.stone');
    if (!newStoneElement) { // まだ石が置かれていない場合
        newStoneElement = document.createElement('div');
        newStoneElement.classList.add('stone', player === WHITE ? 'white' : 'black');
        newStoneCell.appendChild(newStoneElement);
    } else { // 既に石があった場合（通常は発生しないはずだが念のため）
        newStoneElement.classList.remove('white', 'black');
        newStoneElement.classList.add(player === WHITE ? 'white' : 'black');
    }

    // ひっくり返すアニメーション
    // アニメーションを順番に実行するためのループ
    for (const stonePos of flipped) {
        const cell = boardElement.children[stonePos.r * 8 + stonePos.c];
        const stone = cell.querySelector('.stone');

        if (stone) {
            // アニメーションクラスを追加
            stone.classList.add(player === WHITE ? 'animate-flip-white' : 'animate-flip-black');

            // アニメーションが完了するのを待つ
            await new Promise(resolve => {
                const onAnimationEnd = () => {
                    // アニメーション完了後に、元の色クラスを削除し新しい色クラスを適用
                    stone.classList.remove('animate-flip-white', 'animate-flip-black');
                    stone.classList.remove(player === WHITE ? 'black' : 'white');
                    stone.classList.add(player === WHITE ? 'white' : 'black');
                    board[stonePos.r][stonePos.c] = player; // 盤面データを更新
                    stone.removeEventListener('animationend', onAnimationEnd);
                    resolve();
                };
                stone.addEventListener('animationend', onAnimationEnd);
            });
        }
    }

    updateCounts(); // 石の数を更新
    return true;
}

// ターンを切り替える関数
function switchTurn() {
    // 現在のハイライトをすべて削除
    document.querySelectorAll('.cell.highlight').forEach(cell => {
        cell.classList.remove('highlight');
    });

    currentPlayer = -currentPlayer; // プレイヤーを切り替え
    updatePlayerDisplay();
    checkGameStatus(); // ゲームの状態をチェック（パス、終了など）
}

// ゲームの状態（パス、終了）をチェックする関数
function checkGameStatus() {
    const playerValidMoves = getValidMoves(currentPlayer);

    if (playerValidMoves.length === 0) {
        // 現在のプレイヤーが置ける場所がない場合
        messageElement.textContent = `${currentPlayer === WHITE ? '白' : '黒'}は置ける場所がないのでパスします。`;
        const opponentValidMoves = getValidMoves(-currentPlayer);

        if (opponentValidMoves.length === 0) {
            // 相手も置ける場所がない場合、ゲーム終了
            endGame();
        } else {
            // 相手は置ける場所がある場合、ターンをスキップして相手のターンへ
            setTimeout(() => {
                switchTurn(); // ターンを切り替えて次の処理へ
                // ターンが切り替わった後、現在のプレイヤーが白の場合のみハイライト
                if (currentPlayer === WHITE && !gameOver) {
                    highlightValidMoves();
                } else if (currentPlayer === BLACK && !gameOver) {
                    setTimeout(npcTurn, 1000); // 黒（NPC）のターン
                }
            }, 1000); // メッセージ表示のため少し待つ
        }
    } else {
        // 置ける場所がある場合
        // 黒（NPC）の場合はハイライトせずNPCターンを開始
        if (currentPlayer === BLACK && !gameOver) {
            setTimeout(npcTurn, 1000);
        } else if (currentPlayer === WHITE && !gameOver) {
            // 白（プレイヤー）の場合はハイライト
            highlightValidMoves();
        }
    }
}

// ゲーム終了処理
function endGame() {
    gameOver = true;
    let resultMessage = '';
    if (whiteCount > blackCount) {
        resultMessage = `ゲーム終了！ 白の勝ち (${whiteCount} vs ${blackCount})`;
    } else if (blackCount > whiteCount) {
        resultMessage = `ゲーム終了！ 黒の勝ち (${whiteCount} vs ${blackCount})`;
    } else {
        resultMessage = `ゲーム終了！ 引き分け (${whiteCount} vs ${blackCount})`;
    }
    messageElement.textContent = resultMessage;
    // 全てのハイライトを削除
    document.querySelectorAll('.cell.highlight').forEach(cell => {
        cell.classList.remove('highlight');
    });
}

// プレイヤーのクリックイベントハンドラ
async function handleCellClick(event) {
    if (gameOver || currentPlayer === BLACK) { // ゲーム終了時、またはNPCのターン中はクリックできない
        return;
    }

    let r = parseInt(event.target.dataset.row);
    let c = parseInt(event.target.dataset.col);

    // 石がクリックされた場合は親のセルを探す
    if (isNaN(r) || isNaN(c)) {
        const cell = event.target.closest('.cell');
        if (cell) {
            r = parseInt(cell.dataset.row);
            c = parseInt(cell.dataset.col);
        } else {
            return;
        }
    }

    const success = await placeStoneAndFlip(r, c, currentPlayer);
    if (success) {
        messageElement.textContent = ''; // 成功したらメッセージをクリア
        switchTurn();
    } else {
        messageElement.textContent = 'そこには置けません。';
    }
}

// NPCのターン処理
async function npcTurn() {
    if (gameOver) return;

    // NPCのターンが始まる前に、全てのハイライトを削除する
    document.querySelectorAll('.cell.highlight').forEach(cell => {
        cell.classList.remove('highlight');
    });

    messageElement.textContent = '黒（NPC）のターン...';
    const validMoves = getValidMoves(BLACK);

    if (validMoves.length > 0) {
        // シンプルなNPC: 置ける場所からランダムに選択
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        const { r, c } = validMoves[randomIndex];

        // 考えるふりをするための遅延
        await new Promise(resolve => setTimeout(resolve, 1500));

        const success = await placeStoneAndFlip(r, c, BLACK);
        if (success) {
            messageElement.textContent = ''; // 成功したらメッセージをクリア
            switchTurn();
        }
    } else {
        // NPCも置ける場所がない場合
        checkGameStatus(); // パスまたはゲーム終了判定へ
    }
}

// リセットボタンのイベントリスナー
resetButton.addEventListener('click', initializeGame);

// ゲーム開始
initializeGame();