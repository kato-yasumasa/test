// ===============================================
// ゲーム設定
// ===============================================
const GAME_SETTINGS = {
    INITIAL_LIVES: 3,               // 初期残機数
    INITIAL_TIME: 60,               // 初期制限時間 (秒)
    SPEED_UP_DURATION: 5,           // スピードアップアイテム持続時間 (秒)
    INVINCIBLE_DURATION: 5,         // 無敵アイテム持続時間 (秒)
    TIME_PLUS_AMOUNT: 5,            // 時計アイテムで増える時間 (秒)
    PLAYER_SPEED: 5,                // プレイヤーの左右移動速度 (現在はクリックで瞬時移動のため未使用)
    LANE_WIDTH: 133,                // レーンの幅 (Canvas幅 400 / 3レーン ≒ 133)
    OBSTACLE_INITIAL_SPEED: 8,      // 障害物の初期スクロール速度 (以前のスピードアップ時の速度に設定, 10m/s相当)
    OBSTACLE_SPAWN_INTERVAL: 80,    // 障害物が出現する間隔 (フレーム数)
    ITEM_SPAWN_PROBABILITY: 0.002,  // アイテムが出現する確率 (1フレームあたり)
    GAME_SPEED_INCREMENT: 0.0005,   // ゲーム全体の速度が時間とともに増える量
    OBJECT_SPAWN_OFFSET_Y: 100,     // 障害物・アイテムが重ならないようにするためのY座標オフセット

    PIXELS_PER_METER: 50,           // 1メートルあたりのピクセル数 (48ピクセルが1メートル)  ★変更
    METERS_PER_PIXEL: 50 / 48       // 1ピクセルあたりのメートル数 (計算用)                 ★変更
};

// ===============================================
// Canvasとコンテキストの取得
// ===============================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===============================================
// オーディオ要素
// ===============================================
const audio = {
    titleBGM: new Audio('audio/title_bgm.mp3'),
    gameBGM: new Audio('audio/game_bgm.mp3'),
    countdownSE: new Audio('audio/countdown_se.wav'),
    goSE: new Audio('audio/go_se.wav'),
    runBuffer: null, // AudioBufferを保持 (Web Audio API用)
    hitObstacleSE: new Audio('audio/hit_obstacle_se.wav'),
    getItemSE: new Audio('audio/get_item_se.wav'),
    speedUpLoopSE: new Audio('audio/speedup_loop_se.wav'),
    breakObstacleSE: new Audio('audio/break_obstacle_se.wav'),
    gameOverSE: new Audio('audio/gameover_se.wav'),
    clickSE: new Audio('audio/click_se.wav')
};

// Web Audio APIのコンテキストとオーディオバッファローダー
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext;

// AudioBufferをロードする関数
async function loadAudioBuffer(url) {
    // AudioContextがまだ作成されていなければ作成
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    } catch (error) {
        console.error('Error loading audio buffer:', url, error);
        return null;
    }
}

// 走るSEのAudioBufferを事前にロード
loadAudioBuffer('audio/run_se.wav').then(buffer => {
    audio.runBuffer = buffer;
});


// BGMはループ再生に設定
audio.titleBGM.loop = true;
audio.gameBGM.loop = true;
audio.speedUpLoopSE.loop = true; // スピードアップ持続SEもループに

// ボリューム調整（必要に応じて）
audio.titleBGM.volume = 0.5;
audio.gameBGM.volume = 0.5;
audio.hitObstacleSE.volume = 0.8;
audio.getItemSE.volume = 0.8;
audio.speedUpLoopSE.volume = 0.4;
audio.breakObstacleSE.volume = 0.8;
audio.gameOverSE.volume = 0.8;
audio.clickSE.volume = 0.7;
audio.countdownSE.volume = 0.7;
audio.goSE.volume = 0.7;


// ===============================================
// ゲームの状態変数
// ===============================================
let gameState = 'title'; // 'title', 'countdown', 'playing', 'gameover'

let lives;              // 残機
let timeLeft;           // 残り時間
let distance;           // 進んだ距離 (メートル)
let playerLane;         // プレイヤーがいるレーン (0:左, 1:中央, 2:右)
let obstacles = [];     // 障害物の配列
let items = [];         // アイテムの配列
let gameSpeed;          // 現在のゲームのスクロール速度 (OBSTACLE_INITIAL_SPEEDから始まり、徐々に増加)

let isSpeedUp;          // スピードアップ中か
let speedUpTimer;       // スピードアップ残り時間
let isInvincible;       // 無敵中か
let invincibleTimer;    // 無敵残り時間

let countdownValue;     // カウントダウンの値 (3, 2, 1, GO)
let lastFrameTime = 0;  // 最後のフレームのタイムスタンプ (deltaTime計算用)
let frameCount = 0;     // フレーム数 (障害物生成などに使用)

let backgroundY = 0; // 背景画像のY座標 (追加)

let lastRunSESpawnTime = 0; // 走るSEの最終再生時間
const RUN_SE_INTERVAL = 0.2; // 走るSEの再生間隔 (秒)

// 各レーンの最後に生成されたオブジェクトのY座標を記憶する配列
// この値よりも上に新しいオブジェクトを生成することで重なりを防ぐ
const lastSpawnYByLane = [canvas.height, canvas.height, canvas.height]; // 初期値は画面下端など、十分に小さい値

// フリック操作のための変数 ★追加
let touchStartX = 0;
let touchStartY = 0;
const FLICK_THRESHOLD = 50; // フリックと判定する最低限の移動ピクセル数


// ===============================================
// プレイヤーの定義
// ===============================================
const player = {
    width: 48,  // プレイヤーの表示幅 (PNG画像の幅に合わせる)
    height: 48, // プレイヤーの表示高さ (PNG画像の高さに合わせる)
    x: 0, // レーンの中心に配置するため、動的に設定される
    y: canvas.height - 80, // 画面下部に配置
    images: [], // 通常状態のアニメーションフレーム画像配列
    invincibleImages: [], // 無敵状態のアニメーションフレーム画像配列
    currentFrame: 0, // 現在のアニメーションフレームのインデックス
    frameDuration: 0.1, // 各フレームを表示する時間 (秒)
    frameTimer: 0, // フレーム切り替えのためのタイマー
    color: 'blue', // フォールバック用カラー (画像がロードされない場合の表示用)

    // 画像を読み込むメソッド
    // paths: 画像ファイルパスの配列
    // targetArray: ロードした画像を格納する配列 (player.images または player.invincibleImages)
    loadImages: function(paths, targetArray) {
        let loadedCount = 0;
        if (targetArray) {
            targetArray.length = 0; // 配列を空にする
        }
        for (let i = 0; i < paths.length; i++) {
            const img = new Image();
            img.src = paths[i];
            img.onload = () => {
                loadedCount++;
                if (loadedCount === paths.length) {
                    console.log(`Player images loaded successfully for: ${targetArray === this.images ? 'normal' : 'invincible'}`);
                }
            };
            img.onerror = () => {
                console.error("Failed to load player image:", paths[i]);
            };
            targetArray.push(img);
        }
    },

    // プレイヤーの描画とアニメーション更新
    draw: function(deltaTime) {
        // 現在のレーンに基づいてX座標を計算
        this.x = (playerLane * GAME_SETTINGS.LANE_WIDTH) + (GAME_SETTINGS.LANE_WIDTH / 2) - (this.width / 2);

        // 描画する画像配列を選択
        const currentImages = isInvincible ? this.invincibleImages : this.images;

        // アニメーションフレームの更新
        this.frameTimer += deltaTime;
        if (this.frameTimer >= this.frameDuration) {
            this.currentFrame = (this.currentFrame + 1) % currentImages.length;
            this.frameTimer -= this.frameDuration; // タイマーをリセット（余りを考慮）
        }

        // 現在のフレーム画像を描画
        const currentImage = currentImages[this.currentFrame];
        if (currentImage && currentImage.complete && currentImage.naturalWidth !== 0) {
            ctx.drawImage(currentImage, this.x, this.y, this.width, this.height);
        } else {
            // 画像がまだロードされていないか、エラーの場合はフォールバックを描画
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
};

// プレイヤーの通常アニメーション画像をロード
player.loadImages([
    'img/player_run_01.png',
    'img/player_run_02.png',
    'img/player_run_03.png',
    'img/player_run_04.png'
], player.images);

// プレイヤーの無敵状態アニメーション画像をロード
player.loadImages([
    'img/player_invincible_01.png',
    'img/player_invincible_02.png',
    'img/player_invincible_03.png',
    'img/player_invincible_04.png'
], player.invincibleImages);


// ===============================================
// アイテム画像の定義と読み込み
// ===============================================
const itemImages = {
    speedUp: new Image(),
    invincible: new Image(),
    time: new Image()
};

// アイテム画像のパスを設定
itemImages.speedUp.src = 'img/item_01.png';
itemImages.invincible.src = 'img/item_02.png';
itemImages.time.src = 'img/item_03.png';

// 画像ロードエラーハンドリング (必要であれば)
for (const key in itemImages) {
    itemImages[key].onerror = () => {
        console.error(`Failed to load item image: ${itemImages[key].src}`);
    };
}

// ===============================================
// 障害物画像の定義と読み込み
// ===============================================
const obstacleImage = new Image();
obstacleImage.src = 'img/obstacle.png';
obstacleImage.onerror = () => {
    console.error("Failed to load obstacle image: img/obstacle.png");
};


// ===============================================
// 背景画像の定義と読み込み
// ===============================================
const backgroundImage = new Image();
backgroundImage.src = 'img/background.png';
backgroundImage.onload = () => {
    console.log("Background image loaded successfully.");
};
backgroundImage.onerror = () => {
    console.error("Failed to load background image: img/background.png");
};


// ===============================================
// ゲーム初期化処理
// ゲームが開始される前、またはリスタート時に呼ばれる
// ===============================================
function initGame() {
    lives = GAME_SETTINGS.INITIAL_LIVES;
    timeLeft = GAME_SETTINGS.INITIAL_TIME;
    distance = 0;
    playerLane = 1; // 中央レーンからスタート
    obstacles = []; // 障害物リストをクリア
    items = [];     // アイテムリストをクリア
    gameSpeed = GAME_SETTINGS.OBSTACLE_INITIAL_SPEED; // ゲームの初期スクロール速度を設定

    isSpeedUp = false;      // スピードアップ状態をリセット
    speedUpTimer = 0;
    isInvincible = false;   // 無敵状態をリセット
    invincibleTimer = 0;

    countdownValue = 3; // カウントダウンの初期値を設定
    frameCount = 0;     // フレームカウントをリセット

    backgroundY = 0; // 背景画像のY座標をリセット (追加)


    // 全てのBGMを停止し、再生位置をリセット
    audio.titleBGM.pause();
    audio.titleBGM.currentTime = 0;
    audio.gameBGM.pause();
    audio.gameBGM.currentTime = 0;
    audio.speedUpLoopSE.pause();
    audio.speedUpLoopSE.currentTime = 0;

    // lastSpawnYByLane のリセット
    lastSpawnYByLane[0] = canvas.height;
    lastSpawnYByLane[1] = canvas.height;
    lastSpawnYByLane[2] = canvas.height;

    // イベントリスナーは一度だけ設定（多重登録を防ぐために一度削除してから再登録）
    canvas.removeEventListener('click', handleGameInput); // 既存のクリックイベントを削除
    canvas.removeEventListener('touchstart', handleTouchStart); // 新しいタッチイベントを削除
    canvas.removeEventListener('touchend', handleTouchEnd);   // 新しいタッチイベントを削除

    // 新しい統合された入力ハンドラを設定
    canvas.addEventListener('mousedown', handleGameInput); // PC用クリック（マウスダウン）
    canvas.addEventListener('touchstart', handleTouchStart); // タッチ開始
    canvas.addEventListener('touchend', handleTouchEnd);     // タッチ終了
}

// ===============================================
// 描画関数
// ゲームのすべての要素を描画する
// ===============================================
function draw(deltaTime) {
    // 背景画像の描画
    if (backgroundImage.complete && backgroundImage.naturalWidth !== 0) {
        // 1枚目の背景画像
        ctx.drawImage(backgroundImage, 0, backgroundY, canvas.width, canvas.height);
        // 2枚目の背景画像 (1枚目のすぐ上に配置し、ループさせる)
        ctx.drawImage(backgroundImage, 0, backgroundY - canvas.height, canvas.width, canvas.height);
    } else {
        // 画像がロードされていない場合は、フォールバックとして黒い背景を描画
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // プレイヤーの描画
    player.draw(deltaTime);

    // 障害物の描画
    obstacles.forEach(obstacle => {
        if (obstacleImage.complete && obstacleImage.naturalWidth !== 0) {
            ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else {
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });

    // アイテムの描画
    items.forEach(item => {
        const itemImg = itemImages[item.type];
        if (itemImg && itemImg.complete && itemImg.naturalWidth !== 0) {
            ctx.drawImage(itemImg, item.x, item.y, item.width, item.height);
        } else {
            ctx.fillStyle = item.color;
            ctx.fillRect(item.x, item.y, item.width, item.height);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.type === 'speedUp' ? 'S' : item.type === 'invincible' ? 'I' : 'T', item.x + item.width / 2, item.y + item.height / 2 + 5);
        }
    });

    // UIの描画 (残機、時間、距離)
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';

    ctx.textAlign = 'left';
    ctx.fillText(`残機: ${lives}`, 10, 30);

    ctx.textAlign = 'center';
    ctx.fillText(`時間: ${Math.max(0, Math.floor(timeLeft))}s`, canvas.width / 2, 30);

    ctx.textAlign = 'right';
    ctx.fillText(`${distance.toFixed(2)}m`, canvas.width - 10, 30);

    // スピードアップ/無敵中の表示
    if (isSpeedUp) {
        ctx.fillStyle = 'yellow';
        ctx.textAlign = 'center';
        ctx.fillText(`SPEED UP! (${Math.ceil(speedUpTimer)}s)`, canvas.width / 2, 60);
    }
    if (isInvincible) {
        ctx.fillStyle = 'purple';
        ctx.textAlign = 'center';
        ctx.fillText(`INVINCIBLE! (${Math.ceil(invincibleTimer)}s)`, canvas.width / 2, 90);
    }

    // 各ゲーム状態での追加描画
    if (gameState === 'title') {
        drawTitleScreen();
    } else if (gameState === 'countdown') {
        drawCountdownScreen();
    } else if (gameState === 'gameover') {
        drawGameOverScreen();
    }
}

// ===============================================
// タイトル画面の描画
// ===============================================
function drawTitleScreen() {
    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RUN GAME', canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '30px Arial';
    const text = 'Start Click / Tap'; // ★テキスト変更
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 20);
    }
}

// ===============================================
// カウントダウン画面の描画
// ===============================================
function drawCountdownScreen() {
    ctx.fillStyle = 'white';
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';

    if (countdownValue === 0) {
        ctx.fillText('GO!', canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillText(countdownValue.toString(), canvas.width / 2, canvas.height / 2);
    }
}

// ===============================================
// ゲームオーバー画面の描画
// ===============================================
function drawGameOverScreen() {
    ctx.fillStyle = 'red';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);

    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`距離: ${distance.toFixed(2)}m`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('もう一度チャレンジ', canvas.width / 2, canvas.height / 2 + 70);
    ctx.fillText('タイトルへ', canvas.width / 2, canvas.height / 2 + 110);
}

// ===============================================
// 更新関数 (ゲームロジック)
// 各フレームでゲームの状態を更新する
// ===============================================
function update(deltaTime) {
    if (gameState !== 'playing') return;

    gameSpeed += GAME_SETTINGS.GAME_SPEED_INCREMENT * deltaTime;

    let currentScrollSpeed = gameSpeed;
    if (isSpeedUp) {
        currentScrollSpeed *= 2;
    }

    timeLeft -= deltaTime;
    if (timeLeft <= 0) {
        timeLeft = 0;
        gameState = 'gameover';
        audio.gameBGM.pause();
        audio.gameBGM.currentTime = 0;
        audio.speedUpLoopSE.pause();
        audio.speedUpLoopSE.currentTime = 0;
        audio.gameOverSE.currentTime = 0;
        audio.gameOverSE.play();
    }

    distance += currentScrollSpeed * deltaTime * GAME_SETTINGS.METERS_PER_PIXEL;

    if (isSpeedUp) {
        if (audio.speedUpLoopSE.paused) {
            audio.speedUpLoopSE.play();
        }
        speedUpTimer -= deltaTime;
        if (speedUpTimer <= 0) {
            isSpeedUp = false;
            speedUpTimer = 0;
            audio.speedUpLoopSE.pause();
            audio.speedUpLoopSE.currentTime = 0;
        }
    } else {
        if (!audio.speedUpLoopSE.paused) {
            audio.speedUpLoopSE.pause();
            audio.speedUpLoopSE.currentTime = 0;
        }
    }

    if (isInvincible) {
        invincibleTimer -= deltaTime;
        if (invincibleTimer <= 0) {
            isInvincible = false;
            invincibleTimer = 0;
        }
    }

    backgroundY += currentScrollSpeed;
    if (backgroundY >= canvas.height) {
        backgroundY -= canvas.height;
    }

    obstacles.forEach(obstacle => {
        obstacle.y += currentScrollSpeed;
    });
    obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height);

    items.forEach(item => {
        item.y += currentScrollSpeed;
    });
    items = items.filter(item => item.y < canvas.height);

    if (audioContext && audio.runBuffer && audioContext.currentTime - lastRunSESpawnTime > RUN_SE_INTERVAL) {
        const source = audioContext.createBufferSource();
        source.buffer = audio.runBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        lastRunSESpawnTime = audioContext.currentTime;
    }

    frameCount++;
    if (frameCount % GAME_SETTINGS.OBSTACLE_SPAWN_INTERVAL === 0) {
        spawnObstacle();
    }

    if (Math.random() < GAME_SETTINGS.ITEM_SPAWN_PROBABILITY) {
        spawnItem();
    }

    obstacles.forEach((obstacle, index) => {
        if (player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y)
        {
            if (isInvincible) {
                audio.breakObstacleSE.currentTime = 0;
                audio.breakObstacleSE.play();
                obstacles.splice(index, 1);
            } else {
                audio.hitObstacleSE.currentTime = 0;
                audio.hitObstacleSE.play();
                lives--;
                obstacles.splice(index, 1);
                if (lives <= 0) {
                    gameState = 'gameover';
                    audio.gameBGM.pause();
                    audio.gameBGM.currentTime = 0;
                    audio.speedUpLoopSE.pause();
                    audio.speedUpLoopSE.currentTime = 0;
                    audio.gameOverSE.currentTime = 0;
                    audio.gameOverSE.play();
                }
            }
        }
    });

    items.forEach((item, index) => {
        if (player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < item.y + item.height &&
            player.y + item.height > item.y)
        {
            audio.getItemSE.currentTime = 0;
            audio.getItemSE.play();
            if (item.type === 'speedUp') {
                isSpeedUp = true;
                speedUpTimer = GAME_SETTINGS.SPEED_UP_DURATION;
            } else if (item.type === 'invincible') {
                isInvincible = true;
                invincibleTimer = GAME_SETTINGS.INVINCIBLE_DURATION;
                player.currentFrame = 0;
            } else if (item.type === 'time') {
                timeLeft += GAME_SETTINGS.TIME_PLUS_AMOUNT;
            }
            items.splice(index, 1);
        }
    });
}

// ===============================================
// 障害物生成関数
// ===============================================
function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const width = 50;
    const height = 50;
    const x = (lane * GAME_SETTINGS.LANE_WIDTH) + (GAME_SETTINGS.LANE_WIDTH / 2) - (width / 2);

    let y = -height - (GAME_SETTINGS.OBSTACLE_INITIAL_SPEED * GAME_SETTINGS.OBSTACLE_SPAWN_INTERVAL / 60) * (Math.random() * 0.5 + 1);
    
    if (lastSpawnYByLane[lane] < canvas.height - GAME_SETTINGS.OBJECT_SPAWN_OFFSET_Y) {
        y = Math.min(y, lastSpawnYByLane[lane] - height - GAME_SETTINGS.OBJECT_SPAWN_OFFSET_Y);
    }

    const newObstacle = { x, y, width, height, color: 'red' };
    obstacles.push(newObstacle);

    lastSpawnYByLane[lane] = newObstacle.y;
}

// ===============================================
// アイテム生成関数
// ===============================================
function spawnItem() {
    const lane = Math.floor(Math.random() * 3);
    const width = 48;
    const height = 48;
    const x = (lane * GAME_SETTINGS.LANE_WIDTH) + (GAME_SETTINGS.LANE_WIDTH / 2) - (width / 2);

    const itemTypes = ['speedUp', 'invincible', 'time'];
    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    let color;
    if (type === 'speedUp') color = 'yellow';
    else if (type === 'invincible') color = 'purple';
    else if (type === 'time') color = 'green';

    let y = -height - (GAME_SETTINGS.OBSTACLE_INITIAL_SPEED * GAME_SETTINGS.OBSTACLE_SPAWN_INTERVAL / 60) * (Math.random() * 0.5 + 1);
    
    if (lastSpawnYByLane[lane] < canvas.height - GAME_SETTINGS.OBJECT_SPAWN_OFFSET_Y) {
        y = Math.min(y, lastSpawnYByLane[lane] - height - GAME_SETTINGS.OBJECT_SPAWN_OFFSET_Y);
    }

    const newItem = { x, y, width, height, color, type };
    items.push(newItem);

    lastSpawnYByLane[lane] = newItem.y;
}

// ===============================================
// 入力ハンドラ (マウス/タッチ統合) ★修正箇所
// ===============================================
function handleGameInput(event) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    // マウスイベントかタッチイベントかを判定
    if (event.type === 'mousedown') {
        clientX = event.clientX;
        clientY = event.clientY;
    } else if (event.type === 'touchend') { // touchend はフリック後のタップとして処理
        // タッチイベントの終了点を使用（handleTouchEnd で処理されるためここでは不要になる可能性あり）
        // ただし、フリックではなく単なるタップでレーン移動したい場合は、ここでクリックと同じ処理を行う
        // 現状はフリックを優先するため、touchendでのレーン移動はhandleTouchEndに任せる
        return; 
    }

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    // ゲーム状態に応じたクリックSE再生
    if (gameState !== 'playing') {
        audio.clickSE.currentTime = 0;
        audio.clickSE.play();
    }

    if (gameState === 'title') {
        audio.titleBGM.currentTime = 0;
        audio.titleBGM.play().catch(e => console.log("Title BGM playback blocked:", e.message));
        
        audio.titleBGM.pause();
        audio.titleBGM.currentTime = 0;
        
        gameState = 'countdown';
        startCountdown();
    } else if (gameState === 'gameover') {
        if (mouseX > canvas.width / 2 - 100 && mouseX < canvas.width / 2 + 100 &&
            mouseY > canvas.height / 2 + 50 && mouseY < canvas.height / 2 + 90) {
            initGame();
            gameState = 'countdown';
            startCountdown();
        } else if (mouseX > canvas.width / 2 - 100 && mouseX < canvas.width / 2 + 100 &&
                   mouseY > canvas.height / 2 + 90 && mouseY < canvas.height / 2 + 130) {
            gameState = 'title';
            initGame();
            audio.titleBGM.play().catch(e => console.log("Title BGM playback blocked:", e.message));
        }
    }
    // 'playing' 状態でのレーン移動はフリックイベント (handleTouchEnd) または
    // マウスダウンによるレーンクリック (handleGameInput内で直接処理) に委ねる
    // マウスでのクリックでレーン移動させたい場合は、ここでclickedLaneの処理を記述
    else if (gameState === 'playing' && event.type === 'mousedown') {
         const clickedLane = Math.floor(mouseX / GAME_SETTINGS.LANE_WIDTH);
         if (clickedLane !== playerLane) {
             if (Math.abs(clickedLane - playerLane) === 1) {
                 playerLane = clickedLane;
             }
         }
    }
}

// タッチ開始イベントハンドラ ★追加
function handleTouchStart(event) {
    // デフォルトのスクロール動作を抑制
    event.preventDefault(); 
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left;
    touchStartY = touch.clientY - rect.top;

    // ゲーム状態に応じたクリックSE再生 (タイトル画面やゲームオーバー画面でのタッチ開始時)
    if (gameState !== 'playing') {
        audio.clickSE.currentTime = 0;
        audio.clickSE.play();
    }
}

// タッチ終了イベントハンドラ (フリック判定) ★追加
function handleTouchEnd(event) {
    if (gameState !== 'playing' && gameState !== 'title' && gameState !== 'gameover') {
        // ゲームプレイ中、タイトル、ゲームオーバー中でない場合は何もしない
        return; 
    }

    const rect = canvas.getBoundingClientRect();
    const touch = event.changedTouches[0]; // 指が離れた位置
    const touchEndX = touch.clientX - rect.left;
    const touchEndY = touch.clientY - rect.top;

    const dx = touchEndX - touchStartX; // X方向の移動量
    const dy = touchEndY - touchStartY; // Y方向の移動量

    // フリックの距離が閾値を超えているか、かつX方向の移動がY方向より大きいか
    // （左右フリックを優先するため）
    if (Math.abs(dx) > FLICK_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (gameState === 'playing') {
            // ゲームプレイ中のみレーン移動
            if (dx > 0) { // 右フリック
                if (playerLane < 2) {
                    playerLane++;
                }
            } else { // 左フリック
                if (playerLane > 0) {
                    playerLane--;
                }
            }
        }
    } else {
        // フリックではない、またはフリックが短すぎる場合は、通常のタップとして処理
        // ただし、タイトル画面やゲームオーバー画面でのタップ処理は handleGameInput に集約されている
        // そのため、ここではプレイ中のレーン変更以外の、純粋なタップは処理しない
        // もしタップでレーン移動させたい場合は、ここでclickedLaneの処理を行う
        if (gameState === 'title' || gameState === 'gameover') {
            // タイトルやゲームオーバー画面では、タップもhandleGameInputで処理させる
            // touchEndX, touchEndYを渡してhandleGameInputを呼び出す
            handleGameInput({
                type: 'mousedown', // 内部的にmousedownイベントとして処理
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        } else if (gameState === 'playing') {
            // プレイ中にフリック以外（タップ）でレーン移動させたい場合の処理
            // 例えば、タップしたレーンに直接移動させる場合など
            const clickedLane = Math.floor(touchEndX / GAME_SETTINGS.LANE_WIDTH);
            if (clickedLane !== playerLane) {
                if (Math.abs(clickedLane - playerLane) === 1) {
                    playerLane = clickedLane;
                }
            }
        }
    }
}


// ===============================================
// カウントダウン開始
// 3, 2, 1, GO のカウントダウンを開始する
// ===============================================
function startCountdown() {
    countdownValue = 3;

    audio.gameBGM.pause();
    audio.gameBGM.currentTime = 0;

    audio.countdownSE.currentTime = 0;
    audio.countdownSE.play();

    const countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue >= 1) {
            audio.countdownSE.currentTime = 0;
            audio.countdownSE.play();
        } else if (countdownValue === 0) {
            audio.goSE.currentTime = 0;
            audio.goSE.play();
        } else if (countdownValue < 0) {
            clearInterval(countdownInterval);
            gameState = 'playing';
            audio.gameBGM.play();
        }
    }, 1000);
}

// ===============================================
// ゲームループ
// ===============================================
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    update(deltaTime);
    draw(deltaTime);

    requestAnimationFrame(gameLoop);
}

// ===============================================
// ゲーム開始
// ===============================================
initGame();
requestAnimationFrame(gameLoop);