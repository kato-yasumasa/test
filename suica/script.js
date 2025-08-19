// キャンバスとコンテキストを取得
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

// ゲーム設定
const gravity = 0.5;
const gameWidth = 200; // キャンバスの幅を半分に
const gameHeight = 300; // キャンバスの高さを半分に
const topBoundary = 50; // フルーツを落とす位置はそのまま
const restitution = 0.6;
const collisionIterations = 4;
const pushFactor = 0.1;
const maxVelocity = 10;

// フルーツの種類と色（サイズは元のまま）
const fruits = [
    { radius: 10, color: 'red' },
    { radius: 15, color: 'pink' },
    { radius: 20, color: 'purple' },
    { radius: 25, color: 'orange' },
    { radius: 30, color: 'darkorange' },
    { radius: 35, color: 'green' },
    { radius: 40, color: 'lightgreen' },
    { radius: 45, color: 'violet' },
    { radius: 50, color: 'gold' },
    { radius: 55, color: 'yellow' },
    { radius: 60, color: 'darkgreen' }
];

let currentFruitIndex = 0;
let activeFruit = null;
let fallingFruits = [];
let score = 0;

// スコア計算の基準
const scoreTable = [
    0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 100
];

// フルーツクラス
class Fruit {
    constructor(x, y, radius, color, level) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.level = level;
        this.vx = 0;
        this.vy = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() {
        this.vy += gravity;
        this.x += this.vx;
        this.y += this.vy;

        // 速度の上限設定
        if (this.vx > maxVelocity) this.vx = maxVelocity;
        if (this.vx < -maxVelocity) this.vx = -maxVelocity;
        if (this.vy > maxVelocity) this.vy = maxVelocity;
        if (this.vy < -maxVelocity) this.vy = -maxVelocity;

        // 壁との衝突
        if (this.x + this.radius > gameWidth) {
            this.x = gameWidth - this.radius;
            this.vx *= -restitution;
        } else if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -restitution;
        }

        // 床との衝突
        if (this.y + this.radius > gameHeight) {
            this.y = gameHeight - this.radius;
            this.vy *= -restitution;
        }
    }
}

// スコアを更新し、表示を更新する関数
function updateScore(points) {
    score += points;
    scoreDisplay.textContent = `Score: ${score}`;
}

// 衝突処理
function handleCollisions() {
    for (let i = 0; i < fallingFruits.length; i++) {
        for (let j = i + 1; j < fallingFruits.length; j++) {
            const fruit1 = fallingFruits[i];
            const fruit2 = fallingFruits[j];

            const dx = fruit1.x - fruit2.x;
            const dy = fruit1.y - fruit2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = fruit1.radius + fruit2.radius;

            if (distance < minDistance) {
                // フルーツが同じ種類なら進化
                if (fruit1.level === fruit2.level && fruit1.level < fruits.length - 1) {
                    const newLevel = fruit1.level + 1;
                    const newFruitData = fruits[newLevel];
                    const newX = (fruit1.x + fruit2.x) / 2;
                    const newY = (fruit1.y + fruit2.y) / 2;
                    
                    // 衝突した2つのフルーツを削除
                    fallingFruits.splice(j, 1);
                    fallingFruits.splice(i, 1);
                    
                    // 新しいフルーツを生成
                    fallingFruits.push(new Fruit(newX, newY, newFruitData.radius, newFruitData.color, newLevel));
                    
                    // スコアを加算
                    updateScore(scoreTable[newLevel]);
                    return;
                }
                
                // フルーツが重ならないように位置と速度を調整
                const angle = Math.atan2(dy, dx);
                const overlap = minDistance - distance;

                // 位置の調整
                fruit1.x += Math.cos(angle) * overlap / 2;
                fruit1.y += Math.sin(angle) * overlap / 2;
                fruit2.x -= Math.cos(angle) * overlap / 2;
                fruit2.y -= Math.sin(angle) * overlap / 2;

                // 速度の調整
                const v1x = fruit1.vx;
                const v1y = fruit1.vy;
                const v2x = fruit2.vx;
                const v2y = fruit2.vy;
                const mass1 = fruit1.radius;
                const mass2 = fruit2.radius;

                const newV1x = (v1x * (mass1 - mass2) + 2 * mass2 * v2x) / (mass1 + mass2);
                const newV1y = (v1y * (mass1 - mass2) + 2 * mass2 * v2y) / (mass1 + mass2);
                const newV2x = (v2x * (mass2 - mass1) + 2 * mass1 * v1x) / (mass1 + mass2);
                const newV2y = (v2y * (mass2 - mass1) + 2 * mass1 * v1y) / (mass1 + mass2);
                
                fruit1.vx = newV1x * restitution;
                fruit1.vy = newV1y * restitution;
                fruit2.vx = newV2x * restitution;
                fruit2.vy = newV2y * restitution;

                // 左右に滑る力を加える
                const pushDirectionX = (newV1y - newV2y) * (dy / distance) - (newV1x - newV2x) * (dx / distance);
                
                fruit1.vx += pushDirectionX * pushFactor;
                fruit2.vx -= pushDirectionX * pushFactor;
            }
        }
    }
}

// フルーツを生成
function createFruit() {
    currentFruitIndex = Math.floor(Math.random() * 5);
    const fruitData = fruits[currentFruitIndex];
    activeFruit = new Fruit(gameWidth / 2, topBoundary, fruitData.radius, fruitData.color, currentFruitIndex);
}

// マウスやタップでフルーツを落とす
canvas.addEventListener('mousedown', () => {
    if (activeFruit) {
        fallingFruits.push(activeFruit);
        activeFruit = null;
        setTimeout(createFruit, 1000);
    }
});

// マウスを動かすとフルーツが追従
canvas.addEventListener('mousemove', (e) => {
    if (activeFruit) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        activeFruit.x = Math.max(activeFruit.radius, Math.min(mouseX, gameWidth - activeFruit.radius));
    }
});

// ゲームループ
function gameLoop() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // 落下中のフルーツを描画・更新
    fallingFruits.forEach(fruit => {
        fruit.update();
        fruit.draw();
    });

    for (let i = 0; i < collisionIterations; i++) {
        handleCollisions();
    }

    // 次に落ちるフルーツを描画
    if (activeFruit) {
        activeFruit.draw();
    }

    requestAnimationFrame(gameLoop);
}

// ゲーム開始
createFruit();
gameLoop();