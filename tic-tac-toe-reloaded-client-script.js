const gameBoard = document.getElementById('game-board');
const cells = [];
let player;
let gameActive = true;

const socket = io();

socket.on('player-assignment', (assignedPlayer) => {
    player = assignedPlayer;
    document.querySelector('h1').textContent = `You are player ${player}`;
});

socket.on('board-state', (boardState) => {
    boardState.forEach((cell, index) => {
        cells[index].textContent = cell;
    });
});

socket.on('game-over', (message) => {
    alert(message);
});

for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    cell.addEventListener('click', handleCellClick);
    gameBoard.appendChild(cell);
    cells.push(cell);
}

function handleCellClick(event) {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.dataset.index);

    if (cells[clickedCellIndex].textContent !== '' || !gameActive) {
        return;
    }

    socket.emit('move', { index: clickedCellIndex });
}
