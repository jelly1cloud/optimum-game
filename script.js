(() => {
    const boardSize = 6;
    const GAME_DURATION = 120; // 2 хвилини
    let playerName = "";
    let score = 0;
    let timeLeft = GAME_DURATION;
    let gameInterval;
    
    let boardState = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
    let realBlocksPlaced = 0; 
    let currentShapesInPool = [];

    const boardsContainer = document.getElementById('boards-container');
    const shapePool = document.getElementById('shape-pool');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const ghostShape = document.getElementById('ghost-shape');
    const leaderboardList = document.getElementById('leaderboard-list');
    const characterMessage = document.getElementById('character-message');
    
    let activeShape = null;

    const shapeTypes = [
        { width: 1, height: 1, color: '#00bfff', blocks: [[1]] },       
        { width: 2, height: 1, color: '#ff007f', blocks: [[1, 1]] },    
        { width: 1, height: 2, color: '#ffbf00', blocks: [[1], [1]] },  
        { width: 2, height: 2, color: '#9d00ff', blocks: [[1, 1], [1, 1]] } 
    ];

    // --- ВХІД У ГРУ ---
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
        boardsContainer.innerHTML = ''; 
        createNewBlock();
        spawnShapes();
        score = 0;
        timeLeft = GAME_DURATION;
        realBlocksPlaced = 0;
        updateScore(0);
        timerElement.innerText = timeLeft;
        clearInterval(gameInterval);
        gameInterval = setInterval(timerTick, 1000);
        if(characterMessage) characterMessage.innerText = "Пакуй транзакції в блок!";
    }

    function createNewBlock() {
        const oldBoard = document.querySelector('.game-board.active');
        if (oldBoard) {
            oldBoard.classList.remove('active');
            oldBoard.classList.add('archived');
        }

        boardState = Array(boardSize).fill().map(() => Array(boardSize).fill(0));

        const newBoardEl = document.createElement('div');
        newBoardEl.classList.add('game-board', 'active');

        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('mouseenter', handleCellHover);
                cell.addEventListener('click', handleCellClick);
                newBoardEl.appendChild(cell);
            }
        }

        boardsContainer.appendChild(newBoardEl);
        boardsContainer.scrollTop = boardsContainer.scrollHeight; 
    }

    function spawnShapes() {
        shapePool.innerHTML = '';
        currentShapesInPool = [];
        for (let i = 0; i < 3; i++) {
            const randomShape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
            currentShapesInPool.push(randomShape);

            const shapeEl = document.createElement('div');
            shapeEl.classList.add('clickable-shape');
            shapeEl.style.gridTemplateColumns = `repeat(${randomShape.width}, 60px)`;
            
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

    // --- МЕХАНІКА КУРСОРУ ---
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
            clearHoverStates();
        }
    });

    function handleCellHover(e) {
        if (!activeShape) return;
        clearHoverStates();
        
        const startX = parseInt(e.target.dataset.x);
        const startY = parseInt(e.target.dataset.y);
        const activeBoard = document.querySelector('.game-board.active');
        if (!activeBoard) return;
        
        let canPlace = true;
        let cellsToHover = [];

        for (let y = 0; y < activeShape.height; y++) {
            for (let x = 0; x < activeShape.width; x++) {
                if (startX + x >= boardSize || startY + y >= boardSize) {
                    canPlace = false;
                    continue;
                }
                const index = (startY + y) * boardSize + (startX + x);
                const cell = activeBoard.children[index];
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
        const activeBoard = document.querySelector('.game-board.active');

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
                    const targetCell = activeBoard.children[index];
                    targetCell.style.backgroundColor = activeShape.color; 
                    targetCell.dataset.filled = "true"; 
                    cellsPlacedThisTurn++;
                }
            }
            
            realBlocksPlaced += cellsPlacedThisTurn;
            updateScore(cellsPlacedThisTurn * 10);

            const shapeIndex = currentShapesInPool.indexOf(activeShape);
            if (shapeIndex > -1) currentShapesInPool.splice(shapeIndex, 1);

            const hiddenOriginal = document.querySelector('.picked-up');
            if (hiddenOriginal) hiddenOriginal.remove();
            
            activeShape = null;
            ghostShape.style.display = 'none';
            clearHoverStates();
            
            if (shapePool.children.length === 0) {
                updateScore(50); 
                spawnShapes();
            } else {
                if (checkDeadlock()) {
                    if(characterMessage) characterMessage.innerText = "Немає місця! Створюю новий блок...";
                    setTimeout(() => {
                        if(characterMessage) characterMessage.innerText = "Пакуй транзакції в блок!";
                        createNewBlock();
                    }, 800);
                }
            }
        }
    }

    function checkDeadlock() {
        if (currentShapesInPool.length === 0) return false;

        for (let shape of currentShapesInPool) {
            for (let y = 0; y <= boardSize - shape.height; y++) {
                for (let x = 0; x <= boardSize - shape.width; x++) {
                    let fits = true;
                    for (let sy = 0; sy < shape.height; sy++) {
                        for (let sx = 0; sx < shape.width; sx++) {
                            if (boardState[y + sy][x + sx] === 1) {
                                fits = false;
                                break;
                            }
                        }
                        if (!fits) break;
                    }
                    if (fits) return false; 
                }
            }
        }
        return true; 
    }

    function updateScore(points) {
        const maxPossibleScore = (realBlocksPlaced * 10) + 1000; 
        score += points;
        if (score > maxPossibleScore) score = maxPossibleScore; 
        scoreElement.innerText = score;
    }

    // --- ОНОВЛЕНА ТАБЛИЦЯ ЛІДЕРІВ (БЕЗ ДУБЛІКАЦІЇ ІМЕН) ---
    function saveToLeaderboard() {
        let leaderboard = JSON.parse(localStorage.getItem('optimumLeaderboard')) || [];
        
        // Шукаємо, чи вже існує оператор з таким самим ім'ям
        const existingPlayerIndex = leaderboard.findIndex(p => p.name.toLowerCase() === playerName.toLowerCase());
        
        if (existingPlayerIndex !== -1) {
            // Якщо оператор знайшовся, оновлюємо рекорд тільки якщо поточний рахунок вищий
            if (score > leaderboard[existingPlayerIndex].score) {
                leaderboard[existingPlayerIndex].score = score;
                leaderboard[existingPlayerIndex].name = playerName; // Оновлюємо регістр імені на свіжий
            }
        } else {
            // Якщо це новий унікальний оператор, просто записуємо його в масив
            leaderboard.push({ name: playerName, score: score });
        }
        
        // Сортуємо глобально від найбільших балів до найменших
        leaderboard.sort((a, b) => b.score - a.score);
        
        // Залишаємо виключно Топ-5 найкращих унікальних результатів
        leaderboard = leaderboard.slice(0, 5);
        
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
            
            boardsContainer.style.pointerEvents = 'none';
            shapePool.style.pointerEvents = 'none';
            if (ghostShape) ghostShape.style.display = 'none';
            if (characterMessage) characterMessage.innerText = "Перевірка ефективності блоків...";

            const allCells = document.querySelectorAll('.cell');
            allCells.forEach(cell => {
                if (cell.dataset.filled === "true") {
                    cell.className = 'cell end-filled'; 
                } else {
                    cell.className = 'cell end-empty';  
                }
            });

            setTimeout(() => {
                saveToLeaderboard();
                alert(`Гру завершено!\nОператор: ${playerName}\nФінальний рахунок: ${score}`);
                
                boardsContainer.style.pointerEvents = 'auto';
                shapePool.style.pointerEvents = 'auto';
                modal.classList.remove('hidden'); 
            }, 4000);
        }
    }
})();
