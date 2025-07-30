// =====================================================================
// ゲーム定数
// =====================================================================
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const TRAIN_SPEED_KPH = 200;
const TRAIN_SPEED_MPS = TRAIN_SPEED_KPH * 1000 / 3600;
const HOMESCREEN_APPEAR_TIME = 5;
const DECELERATION_TIME = 3;

// スコア計算定数
const BASE_SCORE_MAX = 10000;
const CM_PER_POINT = 1;
const PIXELS_TO_METER_FACTOR = 20;

// 電車の描画位置とサイズ
const TRAIN_X = 0;
const TRAIN_WIDTH = 600;
const TRAIN_HEIGHT = 200;
const TRAIN_BOTTOM_OFFSET = 50; // 電車の下端を画面の底から50px上に配置 (調整可能)
const TRAIN_Y = CANVAS_HEIGHT - TRAIN_HEIGHT - TRAIN_BOTTOM_OFFSET; // 電車のY座標を計算 (例: 1080 - 200 - 50 = 830)

// ホームの描画と停止ライン
// HOME_WIDTH, HOME_HEIGHT, HOME_Y はhomeImageの自然なサイズを使用するため削除済み
const STOP_LINE_OFFSET_FROM_HOME_RIGHT = 200; // ホームの右端からのオフセット

// 多重スクロール背景の定数
const SKY_IMAGE_WIDTH = 1920;
const BUILDINGS_WIDTH = 1920;
const SKY_Y_OFFSET = 0;
const BUILDINGS_Y_OFFSET = 300;
const FAR_BUILDINGS_SCROLL_FACTOR = 0.05;
const MID_BUILDINGS_SCROLL_FACTOR = 0.15;

// lines_far_tile.png (1920x400) の定数
const LINES_FAR_WIDTH = 1920;
const LINES_FAR_Y_OFFSET = CANVAS_HEIGHT - 400; // 画面下部に配置
const LINES_FAR_SCROLL_FACTOR = 0.25;

// lines_mid_tile.png (1920x100) の定数
const LINES_MID_WIDTH = 1920;
const LINES_MID_Y_OFFSET = CANVAS_HEIGHT - 100; // 画面最下部に配置
const LINES_MID_SCROLL_FACTOR = 0.6;


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

// 背景画像オブジェクト
let skyImage = new Image();
let buildingsFarImage = new Image();
let buildingsMidImage = new Image();
let linesFarImage = new Image();
let linesMidImage = new Image();
let homeImage = new Image();
let trainImage = new Image(); // 電車画像を追加
let allImagesLoaded = false;

// home画像の実際のY座標とサイズを保持する変数
let actualHomeY = 0;
let actualHomeWidth = 0;
let actualHomeHeight = 0;

// タイトルBGM
let titleBGM = new Audio('audio/title_bgm.mp3');
titleBGM.loop = true; // ループ再生を有効にする

// クリックSE
let clickSE = new Audio('audio/click_se.wav');

// カウントダウンSE
let countdownSE = new Audio('audio/countdown_se.wav');

// GO! SE
let goSE = new Audio('audio/go_se.wav');

// 走行音SE
let runSE = new Audio('audio/run_se.mp3');
runSE.loop = true; // ループ再生を有効にする

// ブレーキSEの追加
let brakeSE = new Audio('audio/brake_se.mp3');


// =====================================================================
// ゲーム初期化
// =====================================================================
function initGame() {
    gameCanvas.width = CANVAS_WIDTH;
    gameCanvas.height = CANVAS_HEIGHT;
    showScreen('title');

    homeAppearDistance = TRAIN_SPEED_MPS * HOMESCREEN_APPEAR_TIME;
    console.log("Game initialized. Home appears at:", homeAppearDistance.toFixed(2), "m");

    // 画像のプリロード
    const imagesToLoad = [
        { img: skyImage, src: 'images/sky_tile.png' },
        { img: buildingsFarImage, src: 'images/buildings_far_tile.png' },
        { img: buildingsMidImage, src: 'images/buildings_mid_tile.png' },
        { img: linesFarImage, src: 'images/lines_far_tile.png' },
        { img: linesMidImage, src: 'images/lines_mid_tile.png' },
        { img: homeImage, src: 'images/home.png' },
        { img: trainImage, src: 'images/train.png' } // train.png をプリロード対象に追加
    ];

    let loadedCount = 0;
    const totalImages = imagesToLoad.length;

    imagesToLoad.forEach(item => {
        item.img.onload = () => {
            loadedCount++;
            if (item.img === homeImage) {
                // homeImageがロードされたら、その自然なサイズに基づいてY座標とサイズを計算
                actualHomeWidth = homeImage.naturalWidth;
                actualHomeHeight = homeImage.naturalHeight;
                // 画面の最下部にホームの底辺が揃うようにY座標を設定
                actualHomeY = CANVAS_HEIGHT - homeImage.naturalHeight;
                console.log("Home image loaded. Natural size:", actualHomeWidth, "x", actualHomeHeight, "Display Y:", actualHomeY);
            }
            if (loadedCount === totalImages) {
                allImagesLoaded = true;
                console.log("All background images loaded.");
                requestAnimationFrame(draw);
            }
        };
        item.img.onerror = () => {
            console.error(`Failed to load image: ${item.src}`);
            loadedCount++;
            if (loadedCount === totalImages) {
                allImagesLoaded = true;
                requestAnimationFrame(draw);
            }
        };
        item.img.src = item.src;
    });
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
        titleBGM.play().catch(e => console.log("BGM再生エラー:", e));
    } else if (screenName === 'result') {
        resultScreen.classList.add('active');
        gameState = 'result';
        titleBGM.pause();
        titleBGM.currentTime = 0;
    } else { // 'playing' や 'countdown' などゲームプレイ中の状態
        titleBGM.pause();
        titleBGM.currentTime = 0;
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

    // 画像がロードされていない場合は何もしない
    if (!allImagesLoaded) {
        requestAnimationFrame(draw);
        return;
    }

    // 空の描画（固定）
    ctx.drawImage(skyImage, 0, SKY_Y_OFFSET, CANVAS_WIDTH, CANVAS_HEIGHT / 2);

    // 地面（フォアグラウンド）の描画
    ctx.fillStyle = 'forestgreen';
    ctx.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);

    // 遠い山の描画 (多重スクロール)
    const farBuildingsScrollOffset = (distanceTraveled * FAR_BUILDINGS_SCROLL_FACTOR * PIXELS_TO_METER_FACTOR) % BUILDINGS_WIDTH;
    ctx.drawImage(buildingsFarImage, -farBuildingsScrollOffset, BUILDINGS_Y_OFFSET, BUILDINGS_WIDTH, buildingsFarImage.height);
    if (farBuildingsScrollOffset > 0) {
        ctx.drawImage(buildingsFarImage, BUILDINGS_WIDTH - farBuildingsScrollOffset, BUILDINGS_Y_OFFSET, BUILDINGS_WIDTH, buildingsFarImage.height);
    }

    // 近い山の描画 (多重スクロール)
    const midBuildingsScrollOffset = (distanceTraveled * MID_BUILDINGS_SCROLL_FACTOR * PIXELS_TO_METER_FACTOR) % BUILDINGS_WIDTH;
    ctx.drawImage(buildingsMidImage, -midBuildingsScrollOffset, BUILDINGS_Y_OFFSET, BUILDINGS_WIDTH, buildingsMidImage.height);
    if (midBuildingsScrollOffset > 0) {
        ctx.drawImage(buildingsMidImage, BUILDINGS_WIDTH - midBuildingsScrollOffset, BUILDINGS_Y_OFFSET, BUILDINGS_WIDTH, buildingsMidImage.height);
    }

    // 遠い線路の描画 (多重スクロール)
    const farLinesScrollOffset = (distanceTraveled * LINES_FAR_SCROLL_FACTOR * PIXELS_TO_METER_FACTOR) % LINES_FAR_WIDTH;
    ctx.drawImage(linesFarImage, -farLinesScrollOffset, LINES_FAR_Y_OFFSET, LINES_FAR_WIDTH, linesFarImage.height);
    if (farLinesScrollOffset > 0) {
        ctx.drawImage(linesFarImage, LINES_FAR_WIDTH - farLinesScrollOffset, LINES_FAR_Y_OFFSET, LINES_FAR_WIDTH, linesFarImage.height);
    }

    // 現在の地面の描画（元からあった灰色の線路）は削除されました

    // ホームの登場と描画
    const homeCurrentScreenX = CANVAS_WIDTH - ((distanceTraveled - homeAppearDistance) * PIXELS_TO_METER_FACTOR);
    // homeImageのサイズが取得できているか確認してから描画
    if (actualHomeWidth > 0 && actualHomeHeight > 0 && homeCurrentScreenX < CANVAS_WIDTH && homeCurrentScreenX + actualHomeWidth > 0) {
        ctx.drawImage(homeImage, homeCurrentScreenX, actualHomeY, actualHomeWidth, actualHomeHeight);

        // 停止線の描画 (HOME_WIDTHの代わりにactualHomeWidthを使用)
        ctx.fillStyle = 'yellow';
        ctx.fillRect(homeCurrentScreenX + actualHomeWidth - STOP_LINE_OFFSET_FROM_HOME_RIGHT, actualHomeY, 5, actualHomeHeight);
    }

    // 中間の線路の描画 (電車の後ろに来るよう、ここに配置)
    const midLinesScrollOffset = (distanceTraveled * LINES_MID_SCROLL_FACTOR * PIXELS_TO_METER_FACTOR) % LINES_MID_WIDTH;
    ctx.drawImage(linesMidImage, -midLinesScrollOffset, LINES_MID_Y_OFFSET, LINES_MID_WIDTH, linesMidImage.height);
    if (midLinesScrollOffset > 0) {
        ctx.drawImage(linesMidImage, LINES_MID_WIDTH - midLinesScrollOffset, LINES_MID_Y_OFFSET, LINES_MID_WIDTH, linesMidImage.height);
    }

    // 電車の描画 (一番手前に表示するため、他の要素の後に描画)
    ctx.drawImage(trainImage, TRAIN_X, TRAIN_Y, TRAIN_WIDTH, TRAIN_HEIGHT);


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
    // 停止線のX座標は、ホームの動的な幅(actualHomeWidth)に基づいて計算
    const stopLineScreenX = (CANVAS_WIDTH - ((distanceTraveled - homeAppearDistance) * PIXELS_TO_METER_FACTOR)) + actualHomeWidth - STOP_LINE_OFFSET_FROM_HOME_RIGHT;
    const trainReferenceX = TRAIN_X + TRAIN_WIDTH;

    const pixelDistanceDiff = stopLineScreenX - trainReferenceX;
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
    titleBGM.pause();
    titleBGM.currentTime = 0;
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
    countdownSE.play().catch(e => console.log("カウントダウンSE再生エラー:", e));

    countdownTimer = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            distanceDisplay.textContent = `${countdownValue}`;
            countdownSE.currentTime = 0;
            countdownSE.play().catch(e => console.log("カウントダウンSE再生エラー:", e));
        } else if (countdownValue === 0) {
            distanceDisplay.textContent = `GO!`;
            goSE.currentTime = 0;
            goSE.play().catch(e => console.log("GO! SE再生エラー:", e));
        } else {
            clearInterval(countdownTimer);
            gameState = 'playing';
            // 走行音の再生開始
            runSE.play().catch(e => console.log("走行音SE再生エラー:", e));
        }
    }, 1000);
}


function stopTrain() {
    if (gameState === 'playing') {
        console.log("Stopping train...");
        gameState = 'decelerating';
        decelerationStartTime = performance.now();
        // 走行音の停止
        runSE.pause();
        runSE.currentTime = 0;
        // ブレーキSEの再生
        brakeSE.currentTime = 0; // 再生位置を最初に戻す
        brakeSE.play().catch(e => console.log("ブレーキSE再生エラー:", e));
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
pushStartButton.addEventListener('click', () => {
    clickSE.play().catch(e => console.log("SE再生エラー:", e));
    startGame();
});
backToTitleButton.addEventListener('click', () => {
    clickSE.play().catch(e => console.log("SE再生エラー:", e));
    showScreen('title');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        console.log("Enter key pressed. Current gameState:", gameState);
        if (gameState === 'title') {
            clickSE.play().catch(e => console.log("SE再生エラー:", e));
            startGame();
        } else if (gameState === 'playing') {
            stopTrain();
        } else if (gameState === 'result') {
            clickSE.play().catch(e => console.log("SE再生エラー:", e));
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
// ゲーム開始 (DOMContentLoadedで実行されるように変更)
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});