document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const questionText = document.getElementById('question-text');
    const floatingNumbersContainer = document.getElementById('floating-numbers-container');
    const correctCountSpan = document.getElementById('correct-count');
    const finalScoreText = document.getElementById('final-score');
    const resultFeedback = document.getElementById('result-feedback');
    const timeBar = document.getElementById('time-bar');

    // --- ゲーム設定 ---
    const GAME_DURATION_SECONDS = 30; // ゲームの制限時間（秒）
    const MAX_FLOATING_NUMBERS_ON_SCREEN = 10; // 画面に同時に存在する数字の最大数
    const MAX_ATTEMPTS_FOR_UNIQUE_NUMBER = 200; // ユニークな数字を生成する最大試行回数
    const MIN_SPEED = 80; // 最小速度 (ピクセル/秒)
    const MAX_SPEED = 200; // 最大速度 (ピクセル/秒)
    const TIME_BONUS_ON_CORRECT = 1; // ★追加: 正解時に加算される時間（秒）

    // 玉のサイズ設定
    const BALL_SIZES = [
        { className: 'size-small', size: 60, radius: 30 },
        { className: 'size-medium', size: 80, radius: 40 }, // デフォルトサイズ
        { className: 'size-large', size: 100, radius: 50 }
    ];

    // 回転設定
    const ROTATION_RANGES = {
        3: { min: 0, max: 1 }, // 3個の場合：0～1個回転
        6: { min: 1, max: 2 }, // 6個の場合：1～2個回転
        10: { min: 2, max: 3 } // 10個の場合：2～3個回転
    };
    const ROTATION_SPEED_CLASSES = ['rotate-slow', 'rotate-medium', 'rotate-fast'];

    // --- ゲームの状態変数 ---
    let currentQuestion = 0; // 回答した問題数
    let correctAnswers = 0;
    let currentAnswer = 0;
    let animationFrameId; // requestAnimationFrame のID
    let lastTime = 0; // アニメーションのdeltaTime計算用
    let numbersOnScreen = []; // 画面上の数字要素とプロパティを管理する配列
    let isQuestionAnswered = false; // 現在の問題が回答済みかどうかを追跡するフラグ
    let numbersGeneratedForCurrentQuestion = 0; // 現在の問題で生成された数字の数をカウント
    let numbersToGenerateQueue = []; // 現在の問題で生成する数字のキュー
    let currentQuestionNumbersToGenerate = 0; // 現在の問題で表示する数字の数
    let gameTimerId; // ゲームタイマーのID
    let gameStartTime; // ゲーム開始時のタイムスタンプ
    let gameEnded = false; // ゲームが終了したことを示すフラグ

    // --- 画面表示の切り替え ---
    function showScreen(screenId) {
        document.querySelectorAll('.game-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // --- ゲームの初期化と開始 ---
    function initGame() {
        console.log("Game initialized and started.");

        // ゲームの状態をリセット
        currentQuestion = 0; // 回答した問題数をリセット
        correctAnswers = 0;
        correctCountSpan.textContent = correctAnswers;

        // 画面上の数字とタイマーを全てクリア
        floatingNumbersContainer.innerHTML = ''; // 以前の数字を全て削除
        numbersOnScreen = []; // 配列もクリア
        lastTime = 0; // アニメーション時間リセット
        cancelAnimationFrame(animationFrameId); // 以前のアニメーションを停止
        clearInterval(gameTimerId); // ゲームタイマーをクリア

        resultFeedback.classList.remove('show', 'correct');

        gameEnded = false; // ゲーム終了フラグをリセット

        // ★タイムバーの初期化とアニメーション設定
        timeBar.style.transition = 'none'; // 一旦トランジションを無効化
        timeBar.style.width = '100%'; // 幅をリセット
        timeBar.style.backgroundColor = '#4CAF50'; // 初期色に設定
        // DOMの再描画を強制し、transition: none;とwidth: 100%;が即座に適用されるようにする
        void timeBar.offsetWidth; // これによりブラウザがレンダリングを強制

        // 次のフレームでトランジションを有効化し、0%へ向かうアニメーションを開始
        // これにより、initGameの実行時には即座に100%になり、その後アニメーションで減少し始める
        requestAnimationFrame(() => {
            if (!gameEnded) { // ゲームが既に終了していないか確認
                timeBar.style.transition = `width ${GAME_DURATION_SECONDS}s linear`;
                timeBar.style.width = '0%'; // 100%から0%へアニメーション開始
            }
        });
        
        gameStartTime = Date.now(); // ゲーム開始時間を記録

        showScreen('game-screen');
        startTimerLoop(); // このループは時間切れのチェックと色変更を担当
        generateNewQuestion(); // 最初の問題生成とゲーム開始
        animationFrameId = requestAnimationFrame(animateNumbers); // アニメーションループ開始
    }

    // --- ゲームのリセット (スタート画面に戻る) ---
    function resetGame() {
        cancelAnimationFrame(animationFrameId);
        clearInterval(gameTimerId);
        showScreen('start-screen');
    }

    // タイマーバーを更新する関数を分離
    function updateTimeBar() {
        const elapsedTime = (Date.now() - gameStartTime) / 1000; // 経過時間（秒）
        const remainingTime = GAME_DURATION_SECONDS - elapsedTime;
        
        // パーセンテージを0%未満にならないようにMath.maxで制限
        const percentage = Math.max(0, (remainingTime / GAME_DURATION_SECONDS) * 100);
        // timeBar.style.width = `${percentage}%`; // ★削除: 幅の更新はCSSアニメーションが担当

        // 残り時間に応じてタイムバーの色を変更
        if (percentage <= 25) {
            timeBar.style.backgroundColor = '#ff4d4d'; // 赤
        } else if (percentage <= 50) {
            timeBar.style.backgroundColor = '#ffcc00'; // 黄色
        } else {
            timeBar.style.backgroundColor = '#4CAF50'; // 緑
        }

        if (remainingTime <= 0) {
            clearInterval(gameTimerId);
            // timeBar.style.width = '0%'; // ★削除: CSSアニメーションが0%に到達させる
            if (!gameEnded) { // endGame が複数回呼ばれるのを防ぐ
                endGame(); // 時間切れでゲーム終了
                console.log("Timer ended, calling endGame.");
            }
        }
    }

    // タイマーを制御するメインループ
    function startTimerLoop() {
        console.log("Timer loop started.");
        clearInterval(gameTimerId); // 既存のタイマーがあればクリア
        // updateTimeBar(); // ★修正: タイマーを即座に更新して初期表示を正しくする -> この行を削除
        gameTimerId = setInterval(updateTimeBar, 100); // 100ミリ秒ごとに更新 (よりスムーズに)
    }

    // --- 問題の生成 ---
    function generateQuestion() {
        const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
        const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
        const operators = ['+', '-', '*']; // 使用する演算子
        const operator = operators.at(Math.floor(Math.random() * operators.length));

        let questionString = "";
        let answer = 0;

        switch (operator) {
            case '+':
                questionString = `${num1} + ${num2} = ?`;
                answer = num1 + num2;
                break;
            case '-':
                if (num1 < num2) {
                    questionString = `${num2} - ${num1} = ?`;
                    answer = num2 - num1;
                } else {
                    questionString = `${num1} - ${num2} = ?`;
                    answer = num1 - num2;
                }
                break;
            case '*':
                questionString = `${num1} × ${num2} = ?`;
                answer = num1 * num2;
                break;
        }
        return { questionString, answer };
    }

    // --- 次の問題へ進む、またはゲーム終了 ---
    function generateNewQuestion() {
        if (gameEnded) {
            console.log("Attempted to generate new question but game has ended.");
            return;
        }
        console.log(`Generating new question. Current question: ${currentQuestion}`);

        isQuestionAnswered = false; // 新しい問題が生成されるときにフラグをリセット

        // 問題番号に応じて表示する数字の数を設定 (以前のロジックを流用し、回答数に応じて変動)
        // 回答数に応じて難易度を上げるイメージ
        if (currentQuestion >= 0 && currentQuestion < 3) { // 最初の3問は3つの数字
            currentQuestionNumbersToGenerate = 3;
        } else if (currentQuestion >= 3 && currentQuestion < 6) { // 次の3問は6つの数字
            currentQuestionNumbersToGenerate = 6;
        } else { // それ以降は10個の数字
            currentQuestionNumbersToGenerate = 10;
        }

        const { questionString, answer } = generateQuestion();
        questionText.textContent = questionString;
        currentAnswer = answer;

        floatingNumbersContainer.innerHTML = '';
        numbersOnScreen = [];
        numbersToGenerateQueue = []; // キューをリセット

        prepareNumbersToGenerateQueue(currentAnswer, currentQuestionNumbersToGenerate);
        generateInitialFloatingNumbers(); // 初期表示用の数字を生成
    }

    // この問題で生成する数字のキューを準備する関数
    function prepareNumbersToGenerateQueue(correctAnswer, totalNumbersForQuestion) {
        numbersToGenerateQueue = [];
        const uniqueNumbers = new Set();
        uniqueNumbers.add(correctAnswer); // まず正解の数字を追加

        // 不正解の数字を生成して追加
        let attempts = 0;
        while (uniqueNumbers.size < totalNumbersForQuestion && attempts < MAX_ATTEMPTS_FOR_UNIQUE_NUMBER) {
            let num;
            // 正解の±5の範囲から生成
            num = correctAnswer + Math.floor(Math.random() * 10) - 5; // 正解の-5から+4まで
            if (num < 1) num = Math.floor(Math.random() * 9) + 1; // 1未満は避ける

            if (!uniqueNumbers.has(num)) {
                uniqueNumbers.add(num);
            }
            attempts++;
        }

        // Setから配列に変換し、シャッフル
        numbersToGenerateQueue = Array.from(uniqueNumbers);
        // 足りない場合はランダムな数字で埋める（発生しにくいが安全策）
        while (numbersToGenerateQueue.length < totalNumbersForQuestion) {
            let num = Math.floor(Math.random() * 99) + 1; // 1-99の範囲でランダム
            if (!numbersToGenerateQueue.includes(num)) {
                numbersToGenerateQueue.push(num);
            }
        }

        // キューをシャッフルしてランダムな順番にする
        for (let i = numbersToGenerateQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = numbersToGenerateQueue.at(i);
            numbersToGenerateQueue.splice(i, 1, numbersToGenerateQueue.at(j));
            numbersToGenerateQueue.splice(j, 1, temp);
        }
    }

    // --- 浮遊する数字の初期生成と配置（重なり防止を試みる） ---
    function generateInitialFloatingNumbers() {
        console.log(`generateInitialFloatingNumbers called. Will attempt to generate ${currentQuestionNumbersToGenerate} numbers.`);

        const containerWidth = floatingNumbersContainer.clientWidth;
        const containerHeight = floatingNumbersContainer.clientHeight;
        const maxAttempts = 500; // 配置の試行回数を増やす
        const minDistancePadding = 15; // 数字間の最小間隔 (中心間距離に加算)

        for (let i = 0; i < currentQuestionNumbersToGenerate; i++) {
            const numValue = numbersToGenerateQueue.shift();
            if (numValue === undefined) break;

            const numberElement = document.createElement('div');
            numberElement.classList.add('number-circle');
            numberElement.textContent = numValue;
            numberElement.dataset.value = numValue;

            // ランダムなサイズを選択
            const randomSizeIndex = Math.floor(Math.random() * BALL_SIZES.length);
            const selectedSize = BALL_SIZES.at(randomSizeIndex);
            numberElement.classList.add(selectedSize.className);

            let placed = false;
            for (let attempts = 0; attempts < maxAttempts; attempts++) {
                // コンテナの範囲内でランダムな位置を生成
                const x = Math.random() * (containerWidth - selectedSize.size);
                const y = Math.random() * (containerHeight - selectedSize.size);
                
                // 新しい要素のRect (中心座標)
                const newCenter = { x: x + selectedSize.radius, y: y + selectedSize.radius };

                let overlaps = false;
                for (const existingNum of numbersOnScreen) {
                    const existingCenter = { x: existingNum.x + existingNum.radius, y: existingNum.y + existingNum.radius };
                    
                    // 円同士の重なり判定 (パディング付き)
                    if (checkCircleOverlap(newCenter, existingCenter, selectedSize.radius, existingNum.radius, minDistancePadding)) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    numberElement.style.left = `${x}px`;
                    numberElement.style.top = `${y}px`;
                    numberElement.addEventListener('click', () => onNumberClick(numberElement));
                    floatingNumbersContainer.appendChild(numberElement);
                    const speed = Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED;
                    const angle = Math.random() * 2 * Math.PI;
                    numbersOnScreen.push({
                        element: numberElement,
                        x: x,
                        y: y,
                        vx: speed * Math.cos(angle),
                        vy: speed * Math.sin(angle),
                        size: selectedSize.size,
                        radius: selectedSize.radius
                    });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                // 配置に失敗した場合のフォールバック（重なる可能性あり）
                const x = Math.random() * (containerWidth - selectedSize.size);
                const y = Math.random() * (containerHeight - selectedSize.size);
                numberElement.style.left = `${x}px`;
                numberElement.style.top = `${y}px`;
                numberElement.addEventListener('click', () => onNumberClick(numberElement));
                floatingNumbersContainer.appendChild(numberElement);
                const speed = Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED;
                const angle = Math.random() * 2 * Math.PI;
                numbersOnScreen.push({
                    element: numberElement,
                    x: x,
                    y: y,
                    vx: speed * Math.cos(angle),
                    vy: speed * Math.sin(angle),
                    size: selectedSize.size,
                    radius: selectedSize.radius
                });
                console.warn(`Failed to place number ${numValue} without overlap, placing anyway.`);
            }
        }
        console.log(`Finished generating initial floating numbers. Numbers on screen: ${numbersOnScreen.length}`);

        numbersGeneratedForCurrentQuestion = currentQuestionNumbersToGenerate;

        // 回転する玉を選択し、クラスを適用
        if (ROTATION_RANGES[currentQuestionNumbersToGenerate]) {
            const { min, max } = ROTATION_RANGES[currentQuestionNumbersToGenerate];
            const numToRotate = Math.floor(Math.random() * (max - min + 1)) + min; // 回転させる玉の数

            // numbersOnScreen のシャッフルコピーを作成し、回転対象をランダムに選ぶ
            const shuffledNumbers = [...numbersOnScreen].sort(() => Math.random() - 0.5);

            for (let k = 0; k < numToRotate && k < shuffledNumbers.length; k++) {
                const numObj = shuffledNumbers.at(k);
                // ランダムな回転速度クラスを適用
                const randomSpeedClass = ROTATION_SPEED_CLASSES.at(Math.floor(Math.random() * ROTATION_SPEED_CLASSES.length));
                numObj.element.classList.add(randomSpeedClass);
            }
        }
    }

    // 円同士の重なり判定関数 (両方の半径と追加パディングを使用)
    function checkCircleOverlap(center1, center2, radius1, radius2, padding) {
        const dx = center1.x - center2.x;
        const dy = center1.y - center2.y;
        const distanceSquared = dx * dx + dy * dy;
        const minDistanceForNoOverlap = (radius1 + radius2) + padding; // 両方の半径の合計 + パディング
        return distanceSquared < (minDistanceForNoOverlap * minDistanceForNoOverlap); // ここも二乗
    }

    // --- 数字のアニメーション ---
    function animateNumbers(currentTime) {
        if (!lastTime) lastTime = currentTime;
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        const containerWidth = floatingNumbersContainer.clientWidth;
        const containerHeight = floatingNumbersContainer.clientHeight;

        for (let i = 0; i < numbersOnScreen.length; i++) {
            const numObj = numbersOnScreen.at(i);
            const element = numObj.element;

            // 位置を更新
            numObj.x += numObj.vx * deltaTime;
            numObj.y += numObj.vy * deltaTime;

            // 壁との衝突判定と反射
            if (numObj.x <= 0 && numObj.vx < 0) {
                numObj.vx *= -1;
                numObj.x = 0;
            } else if (numObj.x + numObj.size >= containerWidth && numObj.vx > 0) {
                numObj.vx *= -1;
                numObj.x = containerWidth - numObj.size;
            }

            if (numObj.y <= 0 && numObj.vy < 0) {
                numObj.vy *= -1;
                numObj.y = 0;
            } else if (numObj.y + numObj.size >= containerHeight && numObj.vy > 0) {
                numObj.vy *= -1;
                numObj.y = containerHeight - numObj.size;
            }

            // 玉同士の衝突判定と反発
            for (let j = i + 1; j < numbersOnScreen.length; j++) {
                const numObj2 = numbersOnScreen.at(j);

                const center1X = numObj.x + numObj.radius;
                const center1Y = numObj.y + numObj.radius;
                const center2X = numObj2.x + numObj2.radius;
                const center2Y = numObj2.y + numObj2.radius;

                const dx = center2X - center1X;
                const dy = center2Y - center1Y;
                const distanceSquared = dx * dx + dy * dy;
                const minCollisionDistance = numObj.radius + numObj2.radius;
                const minCollisionDistanceSquared = minCollisionDistance * minCollisionDistance;

                if (distanceSquared < minCollisionDistanceSquared) {
                    // 衝突検出
                    const distance = Math.sqrt(distanceSquared);
                    const overlap = minCollisionDistance - distance;

                    // 完全に重なっている場合の回避策 (division by zero防止)
                    if (distance === 0) {
                        // わずかに離し、ランダムな方向に反発
                        numObj.x -= 0.5;
                        numObj2.x += 0.5;
                        numObj.y -= 0.5;
                        numObj2.y += 0.5;
                        numObj.vx *= -1;
                        numObj.vy *= -1;
                        numObj2.vx *= -1;
                        numObj2.vy *= -1;
                        continue; // 次のペアへ
                    }

                    // 重なり解消：正規化された衝突ベクトルに沿って押し離す
                    const normalX = dx / distance;
                    const normalY = dy / distance;

                    // 重なりの半分ずつをそれぞれの玉に適用
                    numObj.x -= normalX * (overlap / 2);
                    numObj.y -= normalY * (overlap / 2);
                    numObj2.x += normalX * (overlap / 2);
                    numObj2.y += normalY * (overlap / 2);

                    // 簡易的な速度反転 (衝突による弾む動き)
                    numObj.vx *= -1;
                    numObj.vy *= -1;
                    numObj2.vx *= -1;
                    numObj2.vy *= -1;

                    // 重なり解消後にコンテナの境界内に戻す
                    numObj.x = Math.max(0, Math.min(numObj.x, containerWidth - numObj.size));
                    numObj.y = Math.max(0, Math.min(numObj.y, containerHeight - numObj.size));
                    numObj2.x = Math.max(0, Math.min(numObj2.x, containerWidth - numObj2.size));
                    numObj2.y = Math.max(0, Math.min(numObj2.y, containerHeight - numObj2.size));
                }
            }
            // DOM要素の位置を更新
            element.style.left = `${numObj.x}px`;
            element.style.top = `${numObj.y}px`;
        }
        
        animationFrameId = requestAnimationFrame(animateNumbers);
    }

    // --- 数字がクリックされた時の処理 ---
    function onNumberClick(clickedElement) {
        // ゲームが終了している場合や、すでに回答処理中の場合はクリックを無効化
        const elapsedTime = (Date.now() - gameStartTime) / 1000;
        if (gameEnded || isQuestionAnswered || elapsedTime >= GAME_DURATION_SECONDS + 0.1) { 
             return;
        }

        isQuestionAnswered = true; // 回答処理中フラグを立てる

        const clickedValue = parseInt(clickedElement.dataset.value);
        const isCorrect = (clickedValue === currentAnswer);

        // クリックされた玉を削除
        clickedElement.remove();
        numbersOnScreen = numbersOnScreen.filter(num => num.element !== clickedElement);

        handleAnswer(isCorrect);
    }

    // --- 回答結果の処理 ---
    function handleAnswer(isCorrect) {
        showFeedback(isCorrect); // フィードバック表示

        if (isCorrect) {
            correctAnswers++;
            correctCountSpan.textContent = correctAnswers;
            currentQuestion++; // 正解したら回答数を増やす

            // ★追加: 正解時に残り時間を増やす
            const elapsedTime = (Date.now() - gameStartTime) / 1000;
            const remainingTime = GAME_DURATION_SECONDS - elapsedTime;
            const newRemainingTime = Math.min(GAME_DURATION_SECONDS, remainingTime + TIME_BONUS_ON_CORRECT); // 最大値はゲーム制限時間
            gameStartTime = Date.now() - (GAME_DURATION_SECONDS - newRemainingTime) * 1000;

            // タイムバーの更新を即座に反映させるため、CSSトランジションを一時的に無効化し、幅を再設定
            timeBar.style.transition = 'none';
            const percentage = (newRemainingTime / GAME_DURATION_SECONDS) * 100;
            timeBar.style.width = `${percentage}%`;
            // DOMの再描画を強制
            void timeBar.offsetWidth;
            // 次のフレームでトランジションを再有効化
            requestAnimationFrame(() => {
                timeBar.style.transition = `width ${newRemainingTime}s linear`; // 残り時間に応じてトランジション時間を調整
                timeBar.style.width = '0%'; // 0%へ向かうアニメーションを再開
            });
            updateTimeBar(); // 色の更新も即座に行う
        }

        setTimeout(() => {
            resultFeedback.classList.remove('show', 'correct'); // フィードバックを隠す
            
            isQuestionAnswered = false; // フラグをリセット

            // ゲームが終了していない場合のみ次の問題を生成またはゲーム終了判断
            if (!gameEnded) {
                const elapsedTime = (Date.now() - gameStartTime) / 1000;
                if (elapsedTime < GAME_DURATION_SECONDS) {
                    generateNewQuestion();
                } else {
                    // setTimeout中に時間が過ぎた場合も endGame を確実に呼び出す
                    if (!gameEnded) { // 多重呼び出し防止
                        endGame();
                    }
                }
            } else {
                console.log("handleAnswer setTimeout completed, but game already ended. Doing nothing.");
            }
        }, 800); // 0.8秒後に次の問題へ
    }

    // --- 正解/不正解フィードバックの表示 ---
    function showFeedback(isCorrect) {
        resultFeedback.textContent = isCorrect ? '〇' : '×';
        resultFeedback.classList.add('show');
        if (isCorrect) {
            resultFeedback.classList.add('correct');
        } else {
            resultFeedback.classList.remove('correct');
        }
    }

    // --- ゲーム終了処理 ---
    function endGame() {
        if (gameEnded) { // 既に終了している場合は何もしない
            console.log("endGame called, but game already ended. Skipping.");
            return;
        }
        gameEnded = true; // ゲーム終了フラグを設定
        console.log("endGame called. Setting gameEnded = true.");
        
        cancelAnimationFrame(animationFrameId); // アニメーションを停止
        clearInterval(gameTimerId); // ゲームタイマーをクリア

        // タイムバーのアニメーションを停止し、確実に0%にする
        timeBar.style.transition = 'none';
        timeBar.style.width = '0%';

        // 画面上の数字を全てクリア
        floatingNumbersContainer.innerHTML = '';
        numbersOnScreen = [];

        finalScoreText.textContent = `${correctAnswers}問正解！`; // 最終スコア表示
        
        // タイムバーのトランジションが完了するのを待ってから結果画面を表示
        setTimeout(() => {
            showScreen('result-screen');
        }, 1000); // タイムバーのCSSトランジションが1秒なので、1秒後に表示
    }

    // --- イベントリスナーの登録 ---
    startButton.addEventListener('click', initGame);
    restartButton.addEventListener('click', initGame);

});