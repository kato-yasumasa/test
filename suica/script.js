// キャンバスとコンテキストを取得
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

// ゲーム設定
const gravity = 0.5;
const gameWidth = 400;
const gameHeight = 600;
const topBoundary = 100; // フルーツを落とす位置のライン

const baseRestitution = 0.2; 
const basePushFactor = 0.8; 
const collisionIterations = 4;

const maxVelocity = 10;
const minVelocity = 0.5; 

// フルーツの種類と色（サイズを大きくする）
const fruits = [
    { radius: 20, color: 'red' },
    { radius: 30, color: 'pink' },
    { radius: 40, color: 'purple' },
    { radius: 50, color: 'orange' },
    { radius: 60, color: 'darkorange' },
    { radius: 70, color: 'green' },
    { radius: 80, color: 'lightgreen' },
    { radius: 90, color: 'violet' },
    { radius: 100, color: 'gold' },
    { radius: 110, color: 'yellow' },
    { radius: 120, color: 'darkgreen' }
];

let currentFruitIndex = 0;
let activeFruit = null;
let fallingFruits = [];
let score = 0;
let isGameOver = false;

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

        if (this.vx > maxVelocity) this.vx = maxVelocity;
        if (this.vx < -maxVelocity) this.vx = -maxVelocity;
        if (this.vy > maxVelocity) this.vy = maxVelocity;
        if (this.vy < -maxVelocity) this.vy = -maxVelocity;

        if (this.x + this.radius > gameWidth) {
            this.x = gameWidth - this.radius;
            this.vx *= -baseRestitution;
        } else if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -baseRestitution;
        }

        if (this.y + this.radius > gameHeight) {
            this.y = gameHeight - this.radius;
            this.vy *= -baseRestitution;
        }
        
        if (Math.abs(this.vx) < minVelocity) {
            this.vx = 0;
        }
        if (Math.abs(this.vy) < minVelocity) {
            this.vy = 0;
        }
    }
}

function updateScore(points) {
    score += points;
    scoreDisplay.textContent = `Score: ${score}`;
}

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
                if (fruit1.level === fruit2.level && fruit1.level < fruits.length - 1) {
                    const newLevel = fruit1.level + 1;
                    const newFruitData = fruits[newLevel];
                    const newX = (fruit1.x + fruit2.x) / 2;
                    const newY = (fruit1.y + fruit2.y) / 2;
                    
                    fallingFruits.splice(j, 1);
                    fallingFruits.splice(i, 1);
                    
                    fallingFruits.push(new Fruit(newX, newY, newFruitData.radius, newFruitData.color, newLevel));
                    
                    updateScore(scoreTable[newLevel]);
                    return;
                }
                
                const angle = Math.atan2(dy, dx);
                const overlap = minDistance - distance;

                fruit1.x += Math.cos(angle) * overlap / 2;
                fruit1.y += Math.sin(angle) * overlap / 2;
                fruit2.x -= Math.cos(angle) * overlap / 2;
                fruit2.y -= Math.sin(angle) * overlap / 2;

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
                
                const dynamicRestitution = baseRestitution / Math.min(fruit1.radius, fruit2.radius) * 20;

                fruit1.vx = newV1x * dynamicRestitution;
                fruit1.vy = newV1y * dynamicRestitution;
                fruit2.vx = newV2x * dynamicRestitution;
                fruit2.vy = newV2y * dynamicRestitution;

                const dynamicPushFactor = basePushFactor / Math.min(fruit1.radius, fruit2.radius) * 20;
                const pushDirectionX = (newV1y - newV2y) * (dy / distance) - (newV1x - newV2x) * (dx / distance);
                
                fruit1.vx += pushDirectionX * dynamicPushFactor;
                fruit2.vx -= pushDirectionX * dynamicPushFactor;
            }
        }
    }
}

function createFruit() {
    currentFruitIndex = Math.floor(Math.random() * 5);
    const fruitData = fruits[currentFruitIndex];
    activeFruit = new Fruit(gameWidth / 2, topBoundary, fruitData.radius, fruitData.color, currentFruitIndex);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', gameWidth / 2, gameHeight / 2 - 20);
    ctx.font = '15px Arial';
    ctx.fillText('タップしてリスタート', gameWidth / 2, gameHeight / 2 + 20);
}

function resetGame() {
    isGameOver = false;
    score = 0;
    scoreDisplay.textContent = `Score: 0`;
    fallingFruits = [];
    createFruit();
    gameLoop();
}

// フルーツを落とすイベント (マウスとタッチの両方に対応)
canvas.addEventListener('mousedown', dropFruit);
canvas.addEventListener('touchstart', dropFruit);

function dropFruit(e) {
    if (isGameOver) {
        resetGame();
    } else {
        const isOver = fallingFruits.some(fruit => fruit.y - fruit.radius <= topBoundary);
        if (isOver) {
            isGameOver = true;
            return;
        }

        if (activeFruit) {
            fallingFruits.push(activeFruit);
            activeFruit = null;
            setTimeout(createFruit, 1000);
        }
    }
}

// フルーツを動かすイベント (マウスとタッチの両方に対応)
canvas.addEventListener('mousemove', moveFruit);
canvas.addEventListener('touchmove', moveFruit);

function moveFruit(e) {
    if (activeFruit && !isGameOver) {
        e.preventDefault(); // スクロール防止

        let clientX;
        // マウスとタッチで座標の取得方法を分ける
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        activeFruit.x = Math.max(activeFruit.radius, Math.min(mouseX, gameWidth - activeFruit.radius));
    }
}

// ゲームループ
function gameLoop() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    
    if (isGameOver) {
        drawGameOver();
        return;
    }

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, topBoundary);
    ctx.lineTo(gameWidth, topBoundary);
    ctx.stroke();

    fallingFruits.forEach(fruit => {
        fruit.update();
        fruit.draw();
    });

    for (let i = 0; i < collisionIterations; i++) {
        handleCollisions();
    }

    if (activeFruit) {
        activeFruit.draw();
    }

    requestAnimationFrame(gameLoop);
}

// ゲーム開始
createFruit();
gameLoop();