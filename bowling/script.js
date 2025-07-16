document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('current-score');

    // ゲーム変数
    let score = 0;
    const ballRadius = 15;
    let ballX = canvas.width / 2;
    let ballY = canvas.height - ballRadius - 20; // ボールの初期位置（下部中央）
    let ballVx = 0; // ボールのX速度
    let ballVy = 0; // ボールのY速度
    const friction = 0.98; // 摩擦係数

    const pinWidth = 15;
    const pinHeight = 30;
    let pins = []; // ピンの配列

    // フリック操作用変数
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    let touchEndTime = 0;
    let isDragging = false;

    // ゲーム初期化
    function initGame() {
        score = 0;
        scoreDisplay.textContent = score;
        resetBall();
        createPins();
    }

    // ボールのリセット
    function resetBall() {
        ballX = canvas.width / 2;
        ballY = canvas.height - ballRadius - 20;
        ballVx = 0;
        ballVy = 0;
    }

    // ピンの配置（ボウリングの10ピン配置）
    function createPins() {
        pins = [];
        const startX = canvas.width / 2;
        const startY = 50; // ピンの最前列のY座標

        // 4列目 (1ピン)
        pins.push({ x: startX, y: startY, hit: false });

        // 3列目 (2ピン)
        pins.push({ x: startX - (pinWidth / 2 + 5), y: startY + pinHeight + 10, hit: false });
        pins.push({ x: startX + (pinWidth / 2 + 5), y: startY + pinHeight + 10, hit: false });

        // 2列目 (3ピン)
        pins.push({ x: startX - (pinWidth + 10), y: startY + (pinHeight + 10) * 2, hit: false });
        pins.push({ x: startX, y: startY + (pinHeight + 10) * 2, hit: false });
        pins.push({ x: startX + (pinWidth + 10), y: startY + (pinHeight + 10) * 2, hit: false });

        // 1列目 (4ピン)
        pins.push({ x: startX - (pinWidth * 1.5 + 15), y: startY + (pinHeight + 10) * 3, hit: false });
        pins.push({ x: startX - (pinWidth / 2 + 5), y: startY + (pinHeight + 10) * 3, hit: false });
        pins.push({ x: startX + (pinWidth / 2 + 5), y: startY + (pinHeight + 10) * 3, hit: false });
        pins.push({ x: startX + (pinWidth * 1.5 + 15), y: startY + (pinHeight + 10) * 3, hit: false });
    }

    // 描画関数
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリア

        // レーン描画（背景で設定済みですが、念のため）
        // ctx.fillStyle = '#8B4513';
        // ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ボール描画
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.closePath();

        // ピン描画
        pins.forEach(pin => {
            if (!pin.hit) { // 倒れていないピンのみ描画
                ctx.fillStyle = 'white';
                ctx.fillRect(pin.x - pinWidth / 2, pin.y - pinHeight / 2, pinWidth, pinHeight);
                ctx.strokeStyle = 'red'; // ピンの先端
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pin.x, pin.y - pinHeight / 2 + 5, pinWidth / 2 - 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.closePath();
            }
        });
    }

    // 更新関数 (アニメーションループ)
    function update() {
        // ボールの移動
        ballX += ballVx;
        ballY += ballVy;

        // 摩擦による減速
        ballVx *= friction;
        ballVy *= friction;

        // ボールが画面外に出たらリセット（下から投げた場合のみを想定）
        if (ballY < -ballRadius) {
            resetBall();
            createPins(); // 全てのピンをリセット
        }

        // ボールとピンの衝突判定
        pins.forEach(pin => {
            if (!pin.hit) {
                // 簡易的な円と四角の衝突判定（中心点間の距離がボールの半径＋ピンの半分より近ければ衝突とみなす）
                const distanceX = Math.abs(ballX - pin.x);
                const distanceY = Math.abs(ballY - pin.y);

                if (distanceX < (ballRadius + pinWidth / 2) && distanceY < (ballRadius + pinHeight / 2)) {
                    // 衝突したピンをヒット状態にする
                    pin.hit = true;
                    score++;
                    scoreDisplay.textContent = score;

                    // 衝突したピンの周辺のピンも倒れたとみなす（非常に簡易的）
                    // 実際にはボールの速度、角度、ピンの物理的な連鎖反応が必要
                    pins.forEach(otherPin => {
                        if (!otherPin.hit) {
                            const dist = Math.sqrt(
                                (pin.x - otherPin.x) * (pin.x - otherPin.x) +
                                (pin.y - otherPin.y) * (pin.y - otherPin.y)
                            );
                            // ある程度近いピンも倒す
                            if (dist < pinWidth * 2) {
                                otherPin.hit = true;
                                score++;
                                scoreDisplay.textContent = score;
                            }
                        }
                    });
                }
            }
        });

        // 停止判定
        if (Math.abs(ballVx) < 0.1 && Math.abs(ballVy) < 0.1 && ballY < canvas.height - ballRadius - 100) {
            // ある程度ボールが静止したらピンをリセット
            // ここで次のフレームへの移行やスコア確定などの処理を入れる
            // 簡易的に一定時間経ったらリセット
            setTimeout(() => {
                if (Math.abs(ballVx) < 0.1 && Math.abs(ballVy) < 0.1) {
                    // 念のため再度速度を確認
                    resetBall();
                    createPins();
                }
            }, 1000); // 1秒後にリセット
        }

        draw(); // 再描画
        requestAnimationFrame(update); // 次のフレームを要求
    }

    // イベントリスナー
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // デフォルトのスクロール動作を防止
        isDragging = true;
        touchStartX = e.touches()[0].clientX;
        touchStartY = e.touches()[0].clientY;
        touchStartTime = Date.now();
    });

    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        // ボールが動いていない時にのみフリック操作を受け付ける
        if (Math.abs(ballVx) > 0.5 || Math.abs(ballVy) > 0.5) return;

        // ドラッグ中のボール位置をプレビューするならここで更新
        // ballX = e.touches()[0].clientX - canvas.getBoundingClientRect().left;
        // ballY = e.touches()[0].clientY - canvas.getBoundingClientRect().top;
        // draw(); // プレビュー描画のため
    });

    canvas.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        touchEndX = e.changedTouches()[0].clientX;
        touchEndY = e.changedTouches()[0].clientY;
        touchEndTime = Date.now();

        // ボールが動いている場合は再投球させない
        if (Math.abs(ballVx) > 0.5 || Math.abs(ballVy) > 0.5) {
            return;
        }

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY; // 上方向へのフリックはY座標が減少

        const deltaTime = (touchEndTime - touchStartTime) / 1000; // 秒に変換

        // フリックの距離と速度を計算
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const velocity = distance / deltaTime; // ピクセル/秒

        // フリック方向の正規化ベクトル
        const dirX = -deltaX / distance; // X軸は左右逆なので-を付ける
        const dirY = deltaY / distance; // Y軸はそのまま（上フリックでdeltaYは負）

        // ある程度のフリック距離がないと投げない
        if (distance > 20 && deltaTime < 0.5) { // 20px以上移動し、0.5秒以内
            // ボールの速度を設定（速度に比例して大きくする）
            const maxSpeed = 10; // 最大速度
            const speedMultiplier = 0.05; // 速度の調整係数
            ballVx = dirX * Math.min(velocity * speedMultiplier, maxSpeed);
            ballVy = dirY * Math.min(velocity * speedMultiplier, maxSpeed);
        }
    });

    // 初期化とゲームループ開始
    initGame();
    update();
});