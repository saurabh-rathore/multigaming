const gameBoard = document.getElementById('game-board');
const socket = io();
const cells = [];
let playerColor;

for (let i = 0; i < 7; i++) {
    const column = document.createElement('div');
    column.classList.add('column');
    column.dataset.column = i;
    column.addEventListener('click', handleColumnClick);
    for (let j = 0; j < 6; j++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        column.appendChild(cell);
        cells.push(cell);
    }
    gameBoard.appendChild(column);
}

function handleColumnClick(event) {
    const column = event.currentTarget.dataset.column;
    socket.emit('drop-disc', column);
}

socket.on('player-assignment', (color) => {
    playerColor = color;
    document.querySelector('h1').textContent = `You are player ${playerColor}`;
});

socket.on('board-state', (board) => {
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
            const cell = cells[i * 7 + j];
            cell.classList.remove('red', 'yellow');
            if (board[i][j]) {
                cell.classList.add(board[i][j]);
            }
        }
    }
});

socket.on('game-over', (message) => {
    alert(message);
});
