// script.js

document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    // timeDisplay および timerElement はHTMLから削除されたため、ここでは使用しません
    const timerBarContainer = document.getElementById('timer-bar-container'); // タイマーバーのコンテナ要素
    const timerBar = document.getElementById('timer-bar'); // タイマーバーの要素
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const restartButton = document.getElementById('restart-button');

    const BOARD_SIZE = 8; // 8x8のボード
    const TILE_SIZE = 60; // タイルのサイズ (px)
    const ANIMATION_DURATION_MS = 300; // アニメーションの時間（0.3秒）
    const INITIAL_TIME = 60; // 初期制限時間（秒）
    const TIME_BONUS_PER_TILE = 0.5; // 消したタイル1個あたりに増える時間（秒）
    const TILE_TYPES = 6; // 動物の種類数
    const animals = ['🍎', '🍌', '🍓', '🍇', '🍍', '🍊']; // 動物の絵文字 (果物に変更済み)

    let board = []; // 内部のボード状態（動物のタイプIDを保持）
    let selectedTile = null; // 選択中のタイル
    let isProcessing = false; // 処理中のフラグ。連続クリック防止
    
    let timeLeft = INITIAL_TIME; // 残り時間
    let timerInterval; // setIntervalのIDを保持

    let isGameOver = false; // ゲームオーバー状態を追跡

    // ゲーム初期設定（DOMロード時に一度だけ実行）
    function setupGame() {
        gameBoard.style.width = `${BOARD_SIZE * TILE_SIZE}px`;
        gameBoard.style.height = `${BOARD_SIZE * TILE_SIZE}px`;
        gameBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, ${TILE_SIZE}px)`;
        
        // リスタートボタンのイベントリスナーはここで設定
        restartButton.addEventListener('click', startGame); 
        
        startGame(); // DOMロード時にゲームを即開始
    }

    // ゲーム開始処理
    async function startGame() {
        isProcessing = false; 
        isGameOver = false; // ゲームオーバー状態をリセット

        timeLeft = INITIAL_TIME; // 残り時間を初期値にリセット
        selectedTile = null; // 選択中のタイルをリセット
        
        updateTimerBar(); // タイマーバーの表示を初期状態にリセット
        gameOverOverlay.classList.add('hidden'); // ゲームオーバー画面を隠す

        clearInterval(timerInterval); // 既存のタイマーをクリア
        timerInterval = setInterval(updateTimer, 1000); // 1秒ごとにタイマー更新

        isProcessing = true; 
        await initializeBoard(); 

        isProcessing = false; 
        console.log("Game started!");
        scheduleStalemateCheck(); 
    }

    // ゲームボードの初期化 (DOM生成とアニメーション)
    async function initializeBoard() {
        gameBoard.innerHTML = ''; 
        board = createInitialBoardData(); 

        await animateBoardReload(); 

        await checkMatchesWrapper(); 

        console.log("Board initialized and ready!");
    }

    // マッチがないことを確認しながら初期ボードデータを生成する関数
    function createInitialBoardData() {
        let newBoard = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            newBoard[r] = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                let animalType;
                do {
                    animalType = Math.floor(Math.random() * TILE_TYPES);
                } while (
                    (r >= 2 && newBoard[r - 1][c] === animalType && newBoard[r - 2][c] === animalType) || 
                    (c >= 2 && newBoard[r][c - 1] === animalType && newBoard[r][c - 2] === animalType)    
                );
                newBoard[r][c] = animalType;
            }
        }
        return newBoard;
    }

    // タイマー更新関数
    function updateTimer() {
        if (isGameOver) return; 

        timeLeft--;
        
        if (timeLeft <= 0) {
            timeLeft = 0; 
            updateTimerBar(); 
            endGame(); // バーを完全に0に更新してからゲームオーバー
        } else {
            updateTimerBar(); 
        }
    }

    // タイマーバーを更新する関数
    function updateTimerBar() {
        const percentage = (timeLeft / INITIAL_TIME) * 100;
        timerBar.style.width = `${Math.max(0, percentage)}%`; 

        timerBar.classList.remove('warning', 'critical');
        if (percentage < 20) {
            timerBar.classList.add('critical');
        } else if (percentage < 50) {
            timerBar.classList.add('warning');
        }
    }

    // 時間を追加する関数
    function addTime(amount) {
        timeLeft += amount;
        if (timeLeft > INITIAL_TIME) { 
            timeLeft = INITIAL_TIME;
        }
        updateTimerBar(); 
    }

    // ゲーム終了処理
    function endGame() {
        if (isGameOver) return; 

        isGameOver = true;
        isProcessing = false; 
        clearInterval(timerInterval); 
        
        // ★追加・変更点★
        // トランジションを一時的に無効にして、すぐに幅を0にする
        timerBar.style.transition = 'none'; // トランジションを無効化
        timerBar.style.width = '0%'; // 強制的に0%に設定
        timerBar.classList.remove('warning', 'critical'); // 色もリセット
        
        // 次のフレームでトランジションを元に戻す（リスタート時のアニメーションのため）
        // これにより、すぐに画面が表示され、見た目の問題が解決されます
        setTimeout(() => {
            timerBar.style.transition = 'width 1s linear, background-color 0.5s ease-in-out';
        }, 50); // 短い遅延を入れてブラウザに再描画させる時間を与える

        gameOverOverlay.classList.remove('hidden'); 
        console.log("Game Over!");
    }


    // 以下、その他の関数は変更なし
    // createTileElement, updateFullBoardDOM, handleTileClick, animateSwapDOM,
    // checkMatchesWrapper, checkMatches, clearTiles, dropTiles,
    // animateBoardReload, scheduleStalemateCheck, hasPossibleMoves,
    // checkMatchesOnBoard, reloadBoard
    // は、上記の変更には影響しないため、そのまま記述します。

    function createTileElement(row, col, type) {
        const tile = document.createElement('div');
        tile.classList.add('animal-tile', `animal-${type}`);
        tile.dataset.row = row;
        tile.dataset.col = col;
        tile.textContent = animals[type];
        tile.addEventListener('click', handleTileClick);
        return tile;
    }

    function updateFullBoardDOM() {
        Array.from(gameBoard.children).forEach(tile => gameBoard.removeChild(tile));
        
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const type = board[r][c];
                if (type !== null) { 
                    gameBoard.appendChild(createTileElement(r, c, type));
                }
            }
        }
    }

    async function handleTileClick(event) {
        if (isProcessing || isGameOver) return; 

        const clickedTile = event.target;
        const row = parseInt(clickedTile.dataset.row);
        const col = parseInt(clickedTile.dataset.col);

        if (selectedTile === null) {
            selectedTile = { element: clickedTile, row: row, col: col };
            clickedTile.classList.add('selected');
        } else {
            const prevRow = selectedTile.row;
            const prevCol = selectedTile.col;

            selectedTile.element.classList.remove('selected');

            if (prevRow === row && prevCol === col) {
                selectedTile = null;
                return;
            }

            const isAdjacent = (
                (Math.abs(row - prevRow) === 1 && col === prevCol) || 
                (Math.abs(col - prevCol) === 1 && row === prevRow)    
            );

            if (isAdjacent) {
                isProcessing = true; 
                
                const boardBeforeSwap = board.map(arr => [...arr]);

                [board[row][col], board[prevRow][prevCol]] = [board[prevRow][prevCol], board[row][col]];
                
                await animateSwapDOM(prevRow, prevCol, row, col);

                const matchesFoundDuringChain = await checkMatchesWrapper(); 

                if (!matchesFoundDuringChain) { 
                    console.log('No match after swap, rolling back.');
                    board = boardBeforeSwap; 
                    await animateSwapDOM(row, col, prevRow, prevCol); 
                }
                
                isProcessing = false; 
            }
            selectedTile = null;
            scheduleStalemateCheck();
        }
    }

    async function animateSwapDOM(r1, c1, r2, c2) {
        const tile1 = gameBoard.querySelector(`.animal-tile[data-row="${r1}"][data-col="${c1}"]`);
        const tile2 = gameBoard.querySelector(`.animal-tile[data-row="${r2}"][data-col="${c2}"]`);

        if (!tile1 || !tile2) {
            console.error("Missing tile during swap DOM animation. Forcing full board update.");
            updateFullBoardDOM(); 
            return; 
        }

        tile1.dataset.row = r2;
        tile1.dataset.col = c2;
        tile2.dataset.row = r1;
        tile2.dataset.col = c1;
        
        updateFullBoardDOM(); 
        
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION_MS)); 
    }
    
    async function checkMatchesWrapper() {
        let matchedTiles = checkMatches(); 

        if (matchedTiles.length > 0) { 
            console.log(`Matches found: ${matchedTiles.length}`);
            
            addTime(matchedTiles.length * TIME_BONUS_PER_TILE);

            await clearTiles(matchedTiles); 
            await dropTiles(); 
            
            return await checkMatchesWrapper() || true; 
        } else {
            console.log('No more matches.');
            return false; 
        }
    }

    function checkMatches() {
        let tilesToClear = new Set(); 

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE - 2; c++) {
                const type = board[r][c];
                if (type !== null && board[r][c+1] === type && board[r][c+2] === type) {
                    tilesToClear.add(JSON.stringify({row: r, col: c}));
                    tilesToClear.add(JSON.stringify({row: r, col: c+1}));
                    tilesToClear.add(JSON.stringify({row: r, col: c+2}));
                }
            }
        }

        for (let c = 0; c < BOARD_SIZE; c++) {
            for (let r = 0; r < BOARD_SIZE - 2; r++) {
                const type = board[r][c];
                if (type !== null && board[r+1][c] === type && board[r+2][c] === type) {
                    tilesToClear.add(JSON.stringify({row: r, col: c}));
                    tilesToClear.add(JSON.stringify({row: r+1, col: c}));
                    tilesToClear.add(JSON.stringify({row: r+2, col: c}));
                }
            }
        }
        return Array.from(tilesToClear).map(s => JSON.parse(s)); 
    }

    async function clearTiles(tiles) {
        const animationPromises = [];
        
        tiles.forEach(tileCoords => {
            const row = tileCoords.row;
            const col = tileCoords.col;
            
            const tileDiv = gameBoard.querySelector(`.animal-tile[data-row="${row}"][data-col="${col}"]`);
            
            if (tileDiv) { 
                tileDiv.classList.add('clearing'); 

                animationPromises.push(new Promise(resolve => {
                    tileDiv.addEventListener('transitionend', function handler() {
                        tileDiv.removeEventListener('transitionend', handler);
                        if (tileDiv.parentNode === gameBoard) { 
                           gameBoard.removeChild(tileDiv); 
                        }
                        resolve(); 
                    }, { once: true }); 
                }));
                board[row][col] = null; 
            }
        });

        await Promise.all(animationPromises); 
        console.log("Tiles cleared (DOM elements removed).");
    }

    async function dropTiles() {
        for (let c = 0; c < BOARD_SIZE; c++) {
            let emptySpacesInColumn = 0;
            for (let r = BOARD_SIZE - 1; r >= 0; r--) {
                if (board[r][c] === null) {
                    emptySpacesInColumn++;
                } else if (emptySpacesInColumn > 0) {
                    const targetRow = r + emptySpacesInColumn;
                    
                    board[targetRow][c] = board[r][c];
                    board[r][c] = null; 
                }
            }

            for (let i = 0; i < emptySpacesInColumn; i++) {
                const newRow = i; 
                const newAnimalType = Math.floor(Math.random() * TILE_TYPES);
                board[newRow][c] = newAnimalType; 
            }
        }
        
        updateFullBoardDOM(); 
        
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION_MS)); 

        console.log("Tiles dropped and refilled.");
    }

    async function animateBoardReload() {
        const fallPromises = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const tile = createTileElement(r, c, board[r][c]);
                gameBoard.appendChild(tile);
                tile.classList.add('falling');
                tile.style.animationDelay = `${c * 0.03 + r * 0.05}s`; 
                fallPromises.push(new Promise(resolve => {
                    tile.addEventListener('animationend', function handler() {
                        tile.removeEventListener('animationend', handler);
                        tile.classList.remove('falling');
                        tile.style.animationDelay = ''; 
                        resolve();
                    }, { once: true });
                }));
            }
        }
        await Promise.all(fallPromises);
    }


    let stalemateCheckTimeout = null;
    function scheduleStalemateCheck() {
        if (stalemateCheckTimeout) {
            clearTimeout(stalemateCheckTimeout);
        }
        stalemateCheckTimeout = setTimeout(async () => {
            if (!isProcessing && !isGameOver) { 
                if (!hasPossibleMoves()) {
                    console.log("Stalemate detected! Board needs to be reloaded.");
                    await reloadBoard(); 
                }
            }
        }, ANIMATION_DURATION_MS * 2); 
    }

    function hasPossibleMoves() {
        const tempBoard = board.map(row => [...row]); 

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (c < BOARD_SIZE - 1) {
                    [tempBoard[r][c], tempBoard[r][c+1]] = [tempBoard[r][c+1], tempBoard[r][c]];
                    if (checkMatchesOnBoard(tempBoard).length > 0) {
                        return true;
                    }
                    [tempBoard[r][c], tempBoard[r][c+1]] = [tempBoard[r][c+1], tempBoard[r][c]]; 
                }

                if (r < BOARD_SIZE - 1) {
                    [tempBoard[r][c], tempBoard[r+1][c]] = [tempBoard[r+1][c], tempBoard[r][c]];
                    if (checkMatchesOnBoard(tempBoard).length > 0) {
                        return true;
                    }
                    [tempBoard[r][c], tempBoard[r+1][c]] = [tempBoard[r+1][c], tempBoard[r][c]]; 
                }
            }
        }
        return false; 
    }

    function checkMatchesOnBoard(targetBoard) {
        let matches = new Set();
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE - 2; c++) {
                const type = targetBoard[r][c];
                if (type !== null && targetBoard[r][c+1] === type && targetBoard[r][c+2] === type) {
                    matches.add(JSON.stringify({row: r, col: c}));
                    matches.add(JSON.stringify({row: r, col: c+1}));
                    matches.add(JSON.stringify({row: r, col: c+2}));
                }
            }
        }
        for (let c = 0; c < BOARD_SIZE; c++) {
            for (let r = 0; r < BOARD_SIZE - 2; r++) {
                const type = targetBoard[r][c];
                if (type !== null && targetBoard[r+1][c] === type && targetBoard[r+2][c] === type) {
                    matches.add(JSON.stringify({row: r, col: c}));
                    matches.add(JSON.stringify({row: r+1, col: c}));
                    matches.add(JSON.stringify({row: r+2, col: c}));
                }
            }
        }
        return Array.from(matches).map(s => JSON.parse(s));
    }


    async function reloadBoard() {
        isProcessing = true; 

        const currentTiles = Array.from(gameBoard.children);
        const dropPromises = currentTiles.map((tile, index) => {
            return new Promise(resolve => {
                tile.classList.add('drop-off');
                tile.style.setProperty('--drop-delay', `${Math.random() * 0.15 + 0.05}s`); 
                tile.addEventListener('animationend', function handler() {
                    tile.removeEventListener('animationend', handler);
                    if (tile.parentNode === gameBoard) { 
                        gameBoard.removeChild(tile); 
                    }
                    resolve();
                }, { once: true });
            });
        });
        await Promise.all(dropPromises); 
        
        gameBoard.innerHTML = ''; 
        console.log("All tiles dropped off screen.");

        board = createInitialBoardData(); 
        
        const fallPromises = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const tile = createTileElement(r, c, board[r][c]); 
                gameBoard.appendChild(tile);
                tile.classList.add('falling'); 
                tile.style.animationDelay = `${c * 0.03 + r * 0.05}s`; 
                fallPromises.push(new Promise(resolve => {
                    tile.addEventListener('animationend', function handler() {
                        tile.removeEventListener('animationend', handler);
                        tile.classList.remove('falling'); 
                        tile.style.transform = ''; 
                        tile.style.opacity = '';
                        tile.style.animationDelay = ''; 
                        resolve();
                    }, { once: true });
                }));
            }
        }
        await Promise.all(fallPromises); 

        console.log("Board reloaded and new tiles fell.");

        await checkMatchesWrapper();
        
        isProcessing = false; 
        scheduleStalemateCheck(); 
    }


    setupGame();
});