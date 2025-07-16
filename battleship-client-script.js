const playerGrid = document.getElementById('player-grid');
const opponentGrid = document.getElementById('opponent-grid');
const socket = io();
const playerCells = [];
const opponentCells = [];
const ships = [5, 4, 3, 3, 2];
let shipIndex = 0;

for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
        const playerCell = document.createElement('div');
        playerCell.classList.add('cell');
        playerCell.dataset.row = i;
        playerCell.dataset.col = j;
        playerCell.addEventListener('click', placeShip);
        playerGrid.appendChild(playerCell);
        playerCells.push(playerCell);

        const opponentCell = document.createElement('div');
        opponentCell.classList.add('cell');
        opponentCell.dataset.row = i;
        opponentCell.dataset.col = j;
        opponentCell.addEventListener('click', fireShot);
        opponentGrid.appendChild(opponentCell);
        opponentCells.push(opponentCell);
    }
}

function placeShip(event) {
    if (shipIndex < ships.length) {
        const cell = event.currentTarget;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const shipLength = ships[shipIndex];
        for (let i = 0; i < shipLength; i++) {
            playerCells[(row + i) * 10 + col].classList.add('ship');
        }
        shipIndex++;
    }
}

function fireShot(event) {
    const cell = event.currentTarget;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    socket.emit('fire', { row, col });
}

socket.on('shot-result', (data) => {
    const cell = opponentCells[data.row * 10 + data.col];
    if (data.hit) {
        cell.classList.add('hit');
    } else {
        cell.classList.add('miss');
    }
});
