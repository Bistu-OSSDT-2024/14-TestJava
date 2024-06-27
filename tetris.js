const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const timerDisplay = document.getElementById('timer');

const color_mapping = {
    1: 'red',     // T
    2: 'yellow',  // O
    3: 'magenta', // L
    4: 'blue',    // J
    5: 'cyan',    // I
    6: 'green',   // S
    7: 'orange'   // Z
};

context.scale(20, 20);

const arena = createMatrix(15, 30); // 20 列，40 行

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
};

let highScore = localStorage.getItem('highScore') || 0;
highScoreDisplay.textContent = highScore;

playerReset();

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;
let timerId = null;
let paused = false;
let startTime = 0;

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

function drawMatrix(matrix, offset) {
    // Draw background grid
    context.strokeStyle = '#595959'; // Grid color
    context.lineWidth = 0.05;        // Grid line width
    for (let y = 0; y < arena.length; y++) {
        for (let x = 0; x < arena[y].length; x++) {
            context.strokeRect(x, y, 1, 1);
        }
    }

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = color_mapping[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);

                // 绘制边框
                context.strokeStyle = '#c6c6c6'; // 边框颜色
                context.lineWidth = 0.05;    // 边框宽度
                context.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        gameOver = true;
        clearInterval(timerId);
        alert("游戏结束\n得分: " + player.score);
        if (player.score > highScore) {
            highScore = player.score;
            localStorage.setItem('highScore', highScore);
            highScoreDisplay.textContent = highScore;
        }
    }
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
}

function rotatePlayer(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function update(time = 0) {
    if (!paused) {
        const deltaTime = time - lastTime;
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
        lastTime = time;
        draw();
        updateTimer();
    }
    if (!gameOver) {
        requestAnimationFrame(update);
    }
}

function updateScore() {
    scoreDisplay.textContent = player.score;
}

function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = elapsedTime;
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

document.addEventListener('keydown', event => {
    if (!paused) {
        if (event.keyCode === 37) {
            playerMove(-1);
        } else if (event.keyCode === 39) {
            playerMove(1);
        } else if (event.keyCode === 40) {
            playerDrop();
        } else if (event.keyCode === 38) {
            rotatePlayer(1);
        }
    }
});

startButton.addEventListener('click', () => {
    if (!timerId) {
        paused = false;
        startTime = Date.now();
        update();
    }
});

pauseButton.addEventListener('click', () => {
    paused = !paused;
    if (!paused) {
        update();
    }
});

resetButton.addEventListener('click', () => {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    playerReset();
    gameOver = false;
    dropCounter = 0;
    lastTime = 0;
    startTime = Date.now();
    updateScore();
    if (!timerId) {
        update();
    }
});
