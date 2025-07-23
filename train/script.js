// =====================================================================
// ゲーム定数
// =====================================================================
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const TRAIN_SPEED_KPH = 900; 
const TRAIN_SPEED_MPS = TRAIN_SPEED_KPH * 1000 / 3600; 
const HOMESCREEN_APPEAR_TIME = 5; 
const DECELERATION_TIME = 3; 

// スコア計算定数
const BASE_SCORE_MAX = 10000; 
const CM_PER_POINT = 1; 

// 電車の描画位置とサイズ
const TRAIN_X = 0; 
const TRAIN_Y = CANVAS_HEIGHT / 2 - 50;
const TRAIN_WIDTH = 300; 
const TRAIN_HEIGHT = 100;

// ホームの描画と停止ライン
const HOME_WIDTH = 1200; // 900 から 1200 に変更
const HOME_HEIGHT = 70;
const HOME_Y = CANVAS_HEIGHT / 2 - 20;
const STOP_LINE_OFFSET_FROM_HOME_RIGHT = 150; 

// =====================================================================
// DOM要素の取得
// =====================================================================
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');
const titleScreen = document.getElementById('title-screen');
const gamePlayUI = document.getElementById('game-play-ui');
const resultScreen = document.getElementById('result-screen');
const pushStartButton = document.getElementById('push-start');
const lastResultText = document.getElementById('last-result');
const distanceDisplay = document.getElementById('distance-display');
const finalDistanceSpan = document.getElementById('final-distance');
const finalScoreSpan = document.getElementById('final-score');
const backToTitleButton = document.getElementById('back-to-title');

// =====================================================================
// ゲーム変数
// =====================================================================
let gameState = 'title'; 
let lastFrameTime = 0;
let distanceTraveled = 0; 
let trainCurrentSpeed = TRAIN_SPEED_MPS; 
let decelerationStartTime = 0; 

let stopDistance = 0; 
let displayedDistance = 0; 
let finalScore = 0; 

let countdownValue = 3; 
let countdownTimer = null; 

let homeAppearDistance = 0; 

// =====================================================================
// ゲーム初期化
// =====================================================================
function initGame() {
    gameCanvas.width = CANVAS_WIDTH;
    gameCanvas.height = CANVAS_HEIGHT;
    showScreen('title'); 

    homeAppearDistance = TRAIN_SPEED_MPS * HOMESCREEN_APPEAR_TIME;
    console.log("Game initialized. Home appears at:", homeAppearDistance.toFixed(2), "m");
}

// =====================================================================
// 画面表示切り替え
// =====================================================================
function showScreen(screenName) {
    console.log("Changing screen to:", screenName);
    titleScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    gamePlayUI.classList.remove('active'); 

    if (screenName === 'title') {
        titleScreen.classList.add('active');
        gameState = 'title'; 
        updateLastResultDisplay(); 
    } else if (screenName === 'result') {
        resultScreen.classList.add('active');
        gameState = 'result'; 
    } 
}

// =====================================================================
// 描画処理 (ゲームループ)
// =====================================================================
function draw(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = (timestamp - lastFrameTime) / 1000; 
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'skyblue';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2); 
    ctx.fillStyle = 'forestgreen';
    ctx.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2); 

    ctx.fillStyle = 'red';
    ctx.fillRect(TRAIN_X, TRAIN_Y, TRAIN_WIDTH, TRAIN_HEIGHT); 

    const backgroundScrollSpeedFactor = 0.9; 
    const scrollOffset = (distanceTraveled * backgroundScrollSpeedFactor) % (CANVAS_WIDTH * 2);

    ctx.fillStyle = 'gray';
    for (let i = 0; i < CANVAS_WIDTH / 50 + 2; i++) {
        ctx.fillRect((i * 50) - scrollOffset, CANVAS_HEIGHT / 2 + 30, 40, 5);
    }

    const homeCurrentScreenX = CANVAS_WIDTH - (distanceTraveled - homeAppearDistance);

    if (homeCurrentScreenX < CANVAS_WIDTH && homeCurrentScreenX + HOME_WIDTH > 0) {
        ctx.fillStyle = 'lightgray';
        ctx.fillRect(homeCurrentScreenX, HOME_Y, HOME_WIDTH, HOME_HEIGHT); 

        ctx.fillStyle = 'yellow';
        ctx.fillRect(homeCurrentScreenX + HOME_WIDTH - STOP_LINE_OFFSET_FROM_HOME_RIGHT, HOME_Y, 5, HOME_HEIGHT); 
    }

    if (gameState === 'playing') {
        distanceTraveled += trainCurrentSpeed * deltaTime;
        updateDistanceDisplay();
    } else if (gameState === 'decelerating') {
        const timeElapsed = performance.now() - decelerationStartTime; 
        const remainingTimeMs = DECELERATION_TIME * 1000 - timeElapsed; 

        if (remainingTimeMs <= 0) {
            trainCurrentSpeed = 0; 
            gameState = 'stopped'; 
            calculateScore(); 
            console.log("Train stopped. Final distance:", displayedDistance.toFixed(2), "m. Final score:", finalScore);

            setTimeout(() => {
                showScreen('result');
            }, 3000); 
        } else {
            trainCurrentSpeed = TRAIN_SPEED_MPS * (remainingTimeMs / (DECELERATION_TIME * 1000));
            distanceTraveled += trainCurrentSpeed * deltaTime;
            updateDistanceDisplay();
        }
    } else if (gameState === 'stopped') {
        updateDistanceDisplay();
    }

    requestAnimationFrame(draw);
}

// =====================================================================
// UI更新
// =====================================================================
function updateDistanceDisplay() {
    const homeCurrentScreenX = CANVAS_WIDTH - (distanceTraveled - homeAppearDistance);
    const stopLineScreenX = homeCurrentScreenX + HOME_WIDTH - STOP_LINE_OFFSET_FROM_HOME_RIGHT;

    const trainReferenceX = TRAIN_X + TRAIN_WIDTH; 
    const pixelDistanceDiff = stopLineScreenX - trainReferenceX;

    const PIXELS_TO_METER_FACTOR = 10; 

    displayedDistance = Math.abs(pixelDistanceDiff) / PIXELS_TO_METER_FACTOR;
    
    distanceDisplay.textContent = `距離: ${displayedDistance.toFixed(2)}m`;
}

function updateLastResultDisplay() {
    const storedDistance = localStorage.getItem('lastPlayedDistance');
    const storedScore = localStorage.getItem('lastPlayedScore');

    if (storedDistance !== null && storedScore !== null) {
        lastResultText.textContent = `距離 ${parseFloat(storedDistance).toFixed(2)}m　スコア ${parseInt(storedScore)}`;
    } else {
        lastResultText.textContent = '';
    }
}

// =====================================================================
// ゲームロジック
// =====================================================================
function startGame() {
    console.log("Starting game...");
    titleScreen.classList.remove('active'); 
    resetGame();
    gameState = 'countdown'; 
    gamePlayUI.classList.add('active'); 
    startCountdown();
}

function resetGame() {
    distanceTraveled = 0;
    trainCurrentSpeed = TRAIN_SPEED_MPS;
    decelerationStartTime = 0;
    stopDistance = 0;
    displayedDistance = 0;
    finalScore = 0;
    countdownValue = 3;
    if (countdownTimer) clearInterval(countdownTimer);
    distanceDisplay.textContent = '距離: --.--m';
    homeAppearDistance = TRAIN_SPEED_MPS * HOMESCREEN_APPEAR_TIME; 
}

function startCountdown() {
    distanceDisplay.textContent = `3`;
    countdownTimer = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            distanceDisplay.textContent = `${countdownValue}`;
        } else if (countdownValue === 0) {
            distanceDisplay.textContent = `GO!`;
        } else {
            clearInterval(countdownTimer);
            gameState = 'playing'; 
        }
    }, 1000);
}

function stopTrain() {
    if (gameState === 'playing') {
        console.log("Stopping train...");
        gameState = 'decelerating'; 
        decelerationStartTime = performance.now(); 
    }
}

function calculateScore() {
    stopDistance = Math.abs(displayedDistance); 

    let baseScore = BASE_SCORE_MAX - Math.floor(stopDistance * 100);
    if (baseScore < 0) baseScore = 0;

    let bonusScore = 0;
    if (stopDistance >= 0 && stopDistance < 1) { 
        bonusScore = 500; 
    } else if (stopDistance >= 1 && stopDistance < 3) { 
        bonusScore = 200; 
    } else if (stopDistance >= 3 && stopDistance <= 10) {
        bonusScore = 100; 
    }

    finalScore = baseScore + bonusScore;

    finalDistanceSpan.textContent = stopDistance.toFixed(2);
    finalScoreSpan.textContent = finalScore;

    localStorage.setItem('lastPlayedDistance', stopDistance.toFixed(2));
    localStorage.setItem('lastPlayedScore', finalScore);
    updateLastResultDisplay(); 
}

// =====================================================================
// イベントリスナー
// =====================================================================
pushStartButton.addEventListener('click', startGame);
backToTitleButton.addEventListener('click', () => { showScreen('title'); });

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        console.log("Enter key pressed. Current gameState:", gameState);
        if (gameState === 'title') {
            startGame();
        } else if (gameState === 'playing') {
            stopTrain();
        } else if (gameState === 'result') {
            showScreen('title');
        }
    }
});

gameCanvas.addEventListener('click', (e) => {
    if (gameState === 'playing') {
        stopTrain();
    }
});

// =====================================================================
// ゲーム開始
// =====================================================================
initGame();
requestAnimationFrame(draw);