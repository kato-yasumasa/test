document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.querySelector('.game-container');
    const turnElement = document.getElementById('current-turn');
    const playerScoreElement = document.getElementById('player-score');
    const cpuScoreElement = document.getElementById('cpu-score');
    const resultModal = document.getElementById('result-modal');
    const resultText = document.getElementById('result-text');
    const finalScores = document.getElementById('final-scores');
    const restartButton = document.getElementById('restart-button');

    const cardValues = ['🍎', '🍊', '🍇', '🍉', '🍓', '🍑', '🍍', '🍌'];
    let cards = [...cardValues, ...cardValues];
    let flippedCards = [];
    let lockBoard = false;
    let playerScore = 0;
    let cpuScore = 0;
    let turn = 'player';
    let pairsFound = 0;
    let availableCards = [];

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function initializeGame() {
        shuffle(cards);
        gameContainer.innerHTML = '';
        flippedCards = [];
        lockBoard = false;
        playerScore = 0;
        cpuScore = 0;
        pairsFound = 0;
        turn = 'player';
        playerScoreElement.textContent = playerScore;
        cpuScoreElement.textContent = cpuScore;
        turnElement.textContent = 'プレイヤー';
        resultModal.style.display = 'none';
        availableCards = [...Array(cards.length).keys()];

        cards.forEach((value, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.value = value;
            card.dataset.index = index;

            const cardFront = document.createElement('div');
            cardFront.classList.add('card-front');
            cardFront.textContent = value;

            const cardBack = document.createElement('div');
            cardBack.classList.add('card-back');
            cardBack.textContent = '?';

            card.appendChild(cardFront);
            card.appendChild(cardBack);
            gameContainer.appendChild(card);

            card.addEventListener('click', handleCardClick);
        });
    }

    function handleCardClick() {
        if (turn !== 'player' || lockBoard) return;

        const card = this;
        if (flippedCards.includes(card) || card.classList.contains('is-matched')) return;

        flipCard(card);
    }

    function flipCard(card) {
        card.classList.add('is-open');
        flippedCards.push(card);

        if (flippedCards.length === 2) {
            lockBoard = true;
            setTimeout(checkForMatch, 1000);
        }
    }

    function checkForMatch() {
        const [card1, card2] = flippedCards;
        if (!card1 || !card2) {
            // エラーハンドリング
            resetBoard();
            return;
        }

        const isMatch = card1.dataset.value === card2.dataset.value;

        if (isMatch) {
            handleMatch();
        } else {
            unflipCards();
        }
    }

    function handleMatch() {
        const [card1, card2] = flippedCards;
        
        if (turn === 'player') {
            playerScore++;
            playerScoreElement.textContent = playerScore;
        } else {
            cpuScore++;
            cpuScoreElement.textContent = cpuScore;
        }
        
        card1.classList.add('is-matched');
        card2.classList.add('is-matched');
        
        pairsFound++;
        
        availableCards = availableCards.filter(index =>
            index != parseInt(card1.dataset.index) && index != parseInt(card2.dataset.index)
        );
        
        flippedCards = [];
        lockBoard = false;
        
        checkGameEnd();
        
        if (turn === 'cpu') {
            setTimeout(cpuTurn, 1000);
        }
    }

    function unflipCards() {
        setTimeout(() => {
            flippedCards.forEach(card => {
                card.classList.remove('is-open');
            });
            flippedCards = [];
            lockBoard = false;
            switchTurn();
        }, 1500);
    }

    function switchTurn() {
        if (pairsFound === cards.length / 2) return;

        turn = (turn === 'player') ? 'cpu' : 'player';
        turnElement.textContent = (turn === 'player') ? 'プレイヤー' : 'CPU';

        if (turn === 'cpu') {
            setTimeout(cpuTurn, 1000);
        }
    }

    function cpuTurn() {
        if (pairsFound === cards.length / 2) return;
        lockBoard = true;
        
        const [firstCardIndex, secondCardIndex] = selectCpuCards();

        const firstCard = gameContainer.children[firstCardIndex];
        const secondCard = gameContainer.children[secondCardIndex];
        
        flipCard(firstCard);
        
        setTimeout(() => {
            flipCard(secondCard);
        }, 1500);
    }

    function selectCpuCards() {
        const availableCardIndices = availableCards;

        const firstCardIndex = availableCardIndices[Math.floor(Math.random() * availableCardIndices.length)];
        let secondCardIndex;
        do {
            secondCardIndex = availableCardIndices[Math.floor(Math.random() * availableCardIndices.length)];
        } while (firstCardIndex === secondCardIndex);
        
        return [firstCardIndex, secondCardIndex];
    }

    function checkGameEnd() {
        if (pairsFound === cards.length / 2) {
            displayResult();
        }
    }

    function displayResult() {
        let result = '';
        if (playerScore > cpuScore) {
            result = 'あなたの勝ちです！🎉';
        } else if (playerScore < cpuScore) {
            result = 'CPUの勝ちです！🤖';
        } else {
            result = '引き分けです！🤝';
        }

        resultText.textContent = result;
        finalScores.textContent = `最終スコア: あなた ${playerScore} - ${cpuScore} CPU`;
        resultModal.style.display = 'flex';
    }

    restartButton.addEventListener('click', initializeGame);

    initializeGame();
});