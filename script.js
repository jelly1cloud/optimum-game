document.addEventListener('DOMContentLoaded', () => {
    const boardSize = 6;
    const boardElement = document.getElementById('game-board');
    const shapePool = document.getElementById('shape-pool');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    
    let score = 0;
    let timeLeft = 60;
    let boardState = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
    let draggedShape = null;

    // Створення сітки ігрового поля
    function initBoard() {
        boardElement.innerHTML = '';
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // Обробники подій для Drag and Drop
                cell.addEventListener('dragover', dragOver);
                cell.addEventListener('dragenter', dragEnter);
                cell.addEventListener('dragleave', dragLeave);
                cell.addEventListener('drop', drop);
                
                boardElement.appendChild(cell);
            }
        }
    }

    // Базові форми (транзакції)
    const shapeTypes = [
        { width: 1, height: 1, blocks: [[1]] },       // Одинарний
        { width: 2, height: 1, blocks: [[1, 1]] },    // Горизонтальний 1x2
        { width: 1, height: 2, blocks: [[1], [1]] },  // Вертикальний 2x1
        { width: 2, height: 2, blocks: [[1, 1], [1, 1]] } // Квадрат 2x2
    ];

    // Генерація нових фігур у пул
    function spawnShapes() {
        shapePool.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const randomShape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
            const shapeEl = document.createElement('div');
            shapeEl.classList.add('draggable-shape');
            shapeEl.draggable = true;
            shapeEl.style.gridTemplateColumns = `repeat(${randomShape.width}, 60px)`;
            
            // Зберігаємо дані про форму в елементі
            shapeEl.dataset.width = randomShape.width;
            shapeEl.dataset.height = randomShape.height;
            
            // Малюємо візуальні квадратики для форми
            randomShape.blocks.forEach(row => {
                row.forEach(val => {
                    if (val === 1) {
                        const block = document.createElement('div');
                        block.classList.add('shape-block');
                        shapeEl.appendChild(block);
                    }
                });
            });

            shapeEl.addEventListener('dragstart', dragStart);
            shapeEl.addEventListener('dragend', dragEnd);
            shapePool.appendChild(shapeEl);
        }
    }

    // --- Логіка перетягування (Drag & Drop) ---
    function dragStart(e) {
        draggedShape = e.target;
        setTimeout(() => e.target.style.opacity = '0.5', 0);
    }

    function dragEnd(e) {
        e.target.style.opacity = '1';
        draggedShape = null;
    }

    function dragOver(e) {
        e.preventDefault(); // Дозволяє кидання
    }

    function dragEnter(e) {
        e.preventDefault();
        if(e.target.classList.contains('cell')) e.target.classList.add('hover');
    }

    function dragLeave(e) {
        if(e.target.classList.contains('cell')) e.target.classList.remove('hover');
    }

    function drop(e) {
        e.preventDefault();
        if (!draggedShape) return;
        
        const cell = e.target;
        cell.classList.remove('hover');
        
        const startX = parseInt(cell.dataset.x);
        const startY = parseInt(cell.dataset.y);
        const shapeW = parseInt(draggedShape.dataset.width);
        const shapeH = parseInt(draggedShape.dataset.height);

        // Перевірка: чи влазить фігура в межі поля і чи вільні клітинки
        if (startX + shapeW > boardSize || startY + shapeH > boardSize) return;
        
        let canPlace = true;
        for (let y = 0; y < shapeH; y++) {
            for (let x = 0; x < shapeW; x++) {
                if (boardState[startY + y][startX + x] === 1) canPlace = false;
            }
        }

        // Якщо місце вільне - ставимо фігуру
        if (canPlace) {
            for (let y = 0; y < shapeH; y++) {
                for (let x = 0; x < shapeW; x++) {
                    boardState[startY + y][startX + x] = 1;
                    const index = (startY + y) * boardSize + (startX + x);
                    boardElement.children[index].classList.add('filled');
                }
            }
            
            // Оновлюємо рахунок (бали = площа фігури * 10)
            score += (shapeW * shapeH) * 10;
            scoreElement.innerText = score;

            // Видаляємо використану фігуру
            draggedShape.remove();
            
            // Якщо пул порожній - генеруємо нові
            if (shapePool.children.length === 0) spawnShapes();
        }
    }

    // Таймер
    const gameInterval = setInterval(() => {
        timeLeft--;
        timerElement.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            alert(`Час вийшов! Твій фінальний рахунок (Ефективність мережі): ${score}`);
            // Рестарт гри
            boardState = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
            score = 0;
            timeLeft = 60;
            scoreElement.innerText = score;
            initBoard();
            spawnShapes();
        }
    }, 1000);

    // Запуск
    initBoard();
    spawnShapes();
});
