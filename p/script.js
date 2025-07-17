// script.js

document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const timerBarContainer = document.getElementById('timer-bar-container');
    const timerBar = document.getElementById('timer-bar');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const restartButton = document.getElementById('restart-button');

    const BOARD_SIZE = 8;
    // TILE_SIZE は動的に計算するため、ここでは初期値としてのみ残します。
    // 実際には updateBoardDimensions で計算されます。
    let TILE_SIZE = 60; // 基本となるタイルのサイズ

    const ANIMATION_DURATION_MS = 300;
    const INITIAL_TIME = 60;
    const TIME_BONUS_PER_TILE = 0.5;
    const TILE_TYPES = 6;
    const animals = ['🍎', '🍌', '🍓', '🍇', '🍍', '🍊'];

    let board = [];
    let selectedTile = null;
    let isProcessing = false;

    let timeLeft = INITIAL_TIME;
    let timerInterval;

    let isGameOver = false;

    // ゲーム初期設定（DOMロード時に一度だけ実行）
    function setupGame() {
        // ここでボードのサイズを計算し、CSS変数として設定
        updateBoardDimensions();
        // ウィンドウのリサイズ時にもボードサイズを更新
        window.addEventListener('resize', updateBoardDimensions);
        
        restartButton.addEventListener('click', startGame); 
        
        startGame();
    }

    // ボードの寸法を更新する関数
    function updateBoardDimensions() {
        const gameContainer = document.getElementById('game-container'); // game-container要素を取得

        // 画面の短い辺（幅または高さ）に基づいてタイルサイズを計算
        // 縦長のスマホ画面では幅、横長のタブレット画面では高さが基準になりやすい
        const minScreenDimension = Math.min(window.innerWidth, window.innerHeight);
        // パディングや余白を考慮し、ボードが画面の80%程度を占めるように調整
        // 10pxはgame-containerのbox-shadowやborder-radiusなどを考慮した余裕
        TILE_SIZE = Math.floor((minScreenDimension * 0.8 - 10) / BOARD_SIZE);
        // 最小・最大サイズを設定することも可能（例: TILE_SIZE = Math.max(40, Math.min(80, calculatedSize));）
        TILE_SIZE = Math.max(40, Math.min(80, TILE_SIZE)); // 最小40px、最大80pxに制限

        const boardPxSize = BOARD_SIZE * TILE_SIZE;

        gameBoard.style.width = `${boardPxSize}px`;
        gameBoard.style.height = `${boardPxSize}px`;
        gameBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, ${TILE_SIZE}px)`;

        // style.css の .animal-tile にも TILE_SIZE を反映させるためのCSS変数
        document.documentElement.style.setProperty('--tile-size', `${TILE_SIZE}px`);
        document.documentElement.style.setProperty('--board-size-px', `${boardPxSize}px`); // CSSアニメーション用

        // タイマーバーの幅もボードサイズに合わせる
        if (timerBarContainer) { // timerBarContainerが存在することを確認
            timerBarContainer.style.maxWidth = `${boardPxSize}px`;
        }
        if (gameContainer) { // gameContainerの幅もボードサイズに合わせる
            gameContainer.style.width = `${boardPxSize}px`;
            gameContainer.style.height = `${boardPxSize}px`;
        }

        // 既存のタイル要素があれば、新しいサイズに合わせて位置を更新
        // (initializeBoardやreloadBoardの後に呼ばれることを想定)
        Array.from(gameBoard.children).forEach(tile => {
            const row = parseInt(tile.dataset.row);
            const col = parseInt(tile.dataset.col);
            tile.style.width = `${TILE_SIZE}px`;
            tile.style.height = `${TILE_SIZE}px`;
            tile.style.fontSize = `${TILE_SIZE * 0.6}px`; // フォントサイズも調整
            tile.style.transform = `translate(${col * TILE_SIZE}px, ${row * TILE_SIZE}px)`;
        });
    }


    async function startGame() {
        isProcessing = false; 
        isGameOver = false;

        timeLeft = INITIAL_TIME;
        selectedTile = null;
        
        updateTimerBar();
        gameOverOverlay.classList.add('hidden');

        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);

        isProcessing = true; 
        await initializeBoard(); 

        isProcessing = false; 
        console.log("Game started!");
        scheduleStalemateCheck(); 
    }

    async function initializeBoard() {
        gameBoard.innerHTML = ''; 
        board = createInitialBoardData(); 

        await animateBoardReload(); 

        await checkMatchesWrapper(); 

        console.log("Board initialized and ready!");
    }

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

    function updateTimer() {
        if (isGameOver) return; 

        timeLeft--;
        
        if (timeLeft <= 0) {
            timeLeft = 0; 
            updateTimerBar(); 
            endGame();
        } else {
            updateTimerBar(); 
        }
    }

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

    function addTime(amount) {
        timeLeft += amount;
        if (timeLeft > INITIAL_TIME) { 
            timeLeft = INITIAL_TIME;
        }
        updateTimerBar(); 
    }

    function endGame() {
        if (isGameOver) return; 

        isGameOver = true;
        isProcessing = false; 
        clearInterval(timerInterval); 
        
        timerBar.style.transition = 'none';
        timerBar.style.width = '0%';
        timerBar.classList.remove('warning', 'critical');
        
        setTimeout(() => {
            timerBar.style.transition = 'width 1s linear, background-color 0.5s ease-in-out';
        }, 50);

        gameOverOverlay.classList.remove('hidden'); 
        console.log("Game Over!");
    }


    function createTileElement(row, col, type) {
        const tile = document.createElement('div');
        tile.classList.add('animal-tile', `animal-${type}`);
        tile.dataset.row = row;
        tile.dataset.col = col;
        tile.textContent = animals[type];
        tile.addEventListener('click', handleTileClick);
        // 動的に計算された TILE_SIZE を適用
        tile.style.width = `${TILE_SIZE}px`;
        tile.style.height = `${TILE_SIZE}px`;
        tile.style.fontSize = `${TILE_SIZE * 0.6}px`; // フォントサイズも調整
        return tile;
    }

    function updateFullBoardDOM() {
        // gameBoardの子要素を一度すべて削除
        Array.from(gameBoard.children).forEach(tile => gameBoard.removeChild(tile));
        
        // 新しい（または更新された）ボード状態に基づいてDOMを再構築
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const type = board[r][c];
                if (type !== null) { 
                    const tileDiv = createTileElement(r, c, type);
                    gameBoard.appendChild(tileDiv);
                    // 位置はCSS transformで設定
                    tileDiv.style.transform = `translate(${c * TILE_SIZE}px, ${r * TILE_SIZE}px)`;
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
                
                // DOM要素の入れ替えアニメーション
                await animateSwapDOM(prevRow, prevCol, row, col);

                const matchesFoundDuringChain = await checkMatchesWrapper(); 

                if (!matchesFoundDuringChain) { 
                    console.log('No match after swap, rolling back.');
                    board = boardBeforeSwap; 
                    // ロールバックのアニメーション
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
            updateFullBoardDOM(); // 強制的にボード全体を更新
            await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION_MS)); // アニメーション時間分待つ
            return; 
        }

        // データセットを更新 (DOM要素の物理的な位置はCSS transformで制御)
        tile1.dataset.row = r2;
        tile1.dataset.col = c2;
        tile2.dataset.row = r1;
        tile2.dataset.col = c1;
        
        // CSS transform を更新してアニメーションをトリガー
        tile1.style.transform = `translate(${c2 * TILE_SIZE}px, ${r2 * TILE_SIZE}px)`;
        tile2.style.transform = `translate(${c1 * TILE_SIZE}px, ${r1 * TILE_SIZE}px)`;

        await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION_MS)); // アニメーション完了を待つ
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
                    // transitionend イベントリスナーでアニメーションの終了を待つ
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
        // 内部ボードのデータ移動
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

            // 新しいタイルを上部に生成
            for (let i = 0; i < emptySpacesInColumn; i++) {
                const newRow = i; 
                const newAnimalType = Math.floor(Math.random() * TILE_TYPES);
                board[newRow][c] = newAnimalType; 
            }
        }
        
        // DOMを現在のボード状態に合わせて更新し、落下アニメーションをトリガー
        updateFullBoardDOM(); 
        
        // アニメーション完了を待つ
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
                // CSS変数 `--board-size-px` を使ってアニメーションを調整
                tile.style.setProperty('--board-size-px', `${BOARD_SIZE * TILE_SIZE}px`); // CSSで使えるように設定
                tile.style.animationDelay = `${c * 0.03 + r * 0.05}s`; 
                fallPromises.push(new Promise(resolve => {
                    tile.addEventListener('animationend', function handler() {
                        tile.removeEventListener('animationend', handler);
                        tile.classList.remove('falling');
                        tile.style.animationDelay = ''; 
                        // アニメーション後の最終位置を確保するために transform をリセットまたは設定
                        tile.style.transform = `translate(${c * TILE_SIZE}px, ${r * TILE_SIZE}px)`;
                        tile.style.opacity = '1';
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
                // CSS変数 `--board-size-px` を使ってアニメーションを調整
                tile.style.setProperty('--board-size-px', `${BOARD_SIZE * TILE_SIZE}px`); // CSSで使えるように設定
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
                // CSS変数 `--board-size-px` を使ってアニメーションを調整
                tile.style.setProperty('--board-size-px', `${BOARD_SIZE * TILE_SIZE}px`); // CSSで使えるように設定
                tile.style.animationDelay = `${c * 0.03 + r * 0.05}s`; 
                fallPromises.push(new Promise(resolve => {
                    tile.addEventListener('animationend', function handler() {
                        tile.removeEventListener('animationend', handler);
                        tile.classList.remove('falling'); 
                        // アニメーション後の最終位置を確保するために transform をリセットまたは設定
                        tile.style.transform = `translate(${c * TILE_SIZE}px, ${r * TILE_SIZE}px)`;
                        tile.style.opacity = '1';
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