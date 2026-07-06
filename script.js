(() => {
    const boardSize = 6;
    const GAME_DURATION = 120; // Рівно 2 хвилини
    let playerName = "";
    let score = 0;
    let timeLeft = GAME_DURATION;
    let gameInterval;
    let boardState = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
    let realBlocksPlaced = 0; 

    const boardElement = document.getElementById('game-board');
    const shapePool = document.getElementById('shape-pool');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const ghostShape = document.getElementById('ghost-shape');
    const leaderboardList = document.getElementById('leaderboard-list');
    
    let activeShape = null;

    // Налаштування фігур: різна форма та індивідуальні яскраві кольори
    const shapeTypes = [
        { width: 1, height: 1, color: '#00bfff', blocks: [[1]] },       // Блакитний
        { width: 2, height: 1, color: '#ff007f', blocks: [[1, 1]] },    // Рожевий
        { width: 1, height: 2, color: '#ffbf00', blocks: [[1], [1]] },  // Жовтий
        { width: 2, height: 2, color: '#9d00ff', blocks: [[1, 1], [1, 1]] } // Фіолетовий
    ];

    // --- ЛОГІКА ВХОДУ ---
    const modal = document.getElementById('auth-modal');
    const nameInput = document.getElementById('player-name-input');
    const startBtn = document.getElementById('start-game-btn');
    const nameDisplay = document.getElementById('display-name');

    const savedName = localStorage.getItem('optimumPlayerName');
    if (savedName) nameInput.value = savedName;

    updateLeaderboardUI(); 

    startBtn.addEventListener('click', () => {
        const val = nameInput.value.trim();
        if (val.length < 2) {
            alert("Ім'я має містити хоча б 2 символи!");
            return;
        }
        playerName = val;
        localStorage.setItem('optimumPlayerName', playerName);
        nameDisplay.innerText = playerName;
        modal.classList.add('hidden');
        startGame();
    });

    function startGame() {
        initBoard();
        spawnShapes();
        score = 0;
        timeLeft = GAME_DURATION;
        realBlocksPlaced = 0;
        updateScore(0);
        timerElement.innerText = timeLeft;
        clearInterval(gameInterval);
        gameInterval = setInterval(timerTick, 1000);
    }

    function initBoard() {
        boardElement.innerHTML = '';
        boardState = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('mouseenter', handleCellHover);
                cell.addEventListener('click', handleCellClick);
                boardElement.appendChild(cell);
            }
        }
        boardElement.addEventListener('mouseleave', clearHoverStates);
    }

    function spawnShapes() {
        shapePool.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const randomShape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
            const shapeEl = document.createElement('div');
            shapeEl.classList.add('clickable-shape');
            shapeEl.style.gridTemplateColumns = `repeat(${randomShape.width}, 60px)`;
            
            shapeEl.dataset.shapeInfo = JSON.stringify(randomShape);
            
            randomShape.blocks.forEach(row => {
                row.forEach(val => {
                    if (val === 1) {
                        const block = document.createElement('div');
                        block.classList.add('shape-block');
                        block.style.backgroundColor = randomShape.color; 
                        shapeEl.appendChild(block);
                    }
                });
            });

            shapeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                pickupShape(randomShape, shapeEl);
            });
            shapePool.appendChild(shapeEl);
        }
    }

    // --- МЕХАНІКА ПРИЛИПАННЯ ДО КУРСОРУ ---
    function pickupShape(shapeData, htmlElement) {
        if (activeShape) return; 
        activeShape = shapeData;
        ghostShape.innerHTML = htmlElement.innerHTML;
        ghostShape.style.gridTemplateColumns = `repeat(${shapeData.width}, 60px)`;
        ghostShape.style.display = 'grid';
        htmlElement.style.visibility = 'hidden';
        htmlElement.classList.add('picked-up');
    }

    document.addEventListener('mousemove', (e) => {
        if (activeShape) {
            ghostShape.style.left = e.clientX + 10 + 'px';
            ghostShape.style.top = e.clientY + 10 + 'px';
        }
    });

    document.addEventListener('click', (e) => {
        if (activeShape && !e.target.classList.contains('cell')) {
            const hiddenOriginal = document.querySelector('.picked-up');
            if (hiddenOriginal) {
                hiddenOriginal.style.visibility = 'visible';
                hiddenOriginal.classList.remove('picked-up');
            }
            activeShape = null;
            ghostShape.style.display = 'none';
        }
    });

    function handleCellHover(e) {
        if (!activeShape) return;
        clearHoverStates();
        
        const startX = parseInt(e.target.dataset.x);
        const startY = parseInt(e.target.dataset.y);
        
        let canPlace = true;
        let cellsToHover = [];

        for (let y = 0; y < activeShape.height; y++) {
            for (let x = 0; x < activeShape.width; x++) {
                if (startX + x >= boardSize || startY + y >= boardSize) {
                    canPlace = false;
                    continue;
                }
                const index = (startY + y) * boardSize + (startX + x);
                const cell = boardElement.children[index];
                cellsToHover.push(cell);
                if (boardState[startY + y][startX + x] === 1) canPlace = false;
            }
        }

        cellsToHover.forEach(cell => {
            cell.classList.add(canPlace ? 'hover-ok' : 'hover-error');
        });
    }

    function clearHoverStates() {
        document.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('hover-ok', 'hover-error');
        });
    }

    function handleCellClick(e) {
        e.stopPropagation();
        if (!activeShape) return;
        
        const startX = parseInt(e.target.dataset.x);
        const startY = parseInt(e.target.dataset.y);

        if (startX + activeShape.width > boardSize || startY + activeShape.height > boardSize) return;
        
        let canPlace = true;
        for (let y = 0; y < activeShape.height; y++) {
            for (let x = 0; x < activeShape.width; x++) {
                if (boardState[startY + y][startX + x] === 1) canPlace = false;
            }
        }

        if (canPlace) {
            let cellsPlacedThisTurn = 0;
            for (let y = 0; y < activeShape.height; y++) {
                for (let x = 0; x < activeShape.width; x++) {
                    boardState[startY + y][startX + x] = 1;
                    const index = (startY + y) * boardSize + (startX + x);
                    const targetCell = boardElement.children[index];
                    targetCell.style.backgroundColor = activeShape.color; 
                    cellsPlacedThisTurn++;
                }
            }
            
            realBlocksPlaced += cellsPlacedThisTurn;
            updateScore(cellsPlacedThisTurn * 10);

            const hiddenOriginal = document.querySelector('.picked-up');
            if (hiddenOriginal) hiddenOriginal.remove();
            
            activeShape = null;
            ghostShape.style.display = 'none';
            clearHoverStates();
            
            if (shapePool.children.length === 0) {
                updateScore(50); // Бонус за очищення всієї черги
                spawnShapes();
            }
        }
    }

    function updateScore(points) {
        const maxPossibleScore = (realBlocksPlaced * 10) + (realBlocksPlaced > 0 ? 500 : 0); 
        score += points;
        if (score > maxPossibleScore) score = maxPossibleScore; 
        scoreElement.innerText = score;
    }

    // --- ТАБЛИЦЯ ЛІДЕРІВ (LOCAL STORAGE) ---
    function saveToLeaderboard() {
        let leaderboard = JSON.parse(localStorage.getItem('optimumLeaderboard')) || [];
        leaderboard.push({ name: playerName, score: score });
        
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 5); // Зберігаємо лише Топ-5
        
        localStorage.setItem('optimumLeaderboard', JSON.stringify(leaderboard));
        updateLeaderboardUI();
    }

    function updateLeaderboardUI() {
        const leaderboard = JSON.parse(localStorage.getItem('optimumLeaderboard')) || [];
        leaderboardList.innerHTML = '';
        
        if (leaderboard.length === 0) {
            leaderboardList.innerHTML = '<li>Немає даних</li>';
            return;
        }

        leaderboard.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${player.name}</span> <span>${player.score}</span>`;
            leaderboardList.appendChild(li);
        });
    }

    function timerTick() {
        timeLeft--;
        timerElement.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            saveToLeaderboard();
            
            alert(`Блок сформовано!\nОператор: ${playerName}\nРахунок: ${score}`);
            modal.classList.remove('hidden'); // Повернення на головний екран для рестарту
        }
    }
})();
