const gameBoard = document.getElementById('game-board');
const squares = [];
const pieces = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};
let playerColor;
let selectedSquare = null;
const socket = io();

socket.on('player-assignment', (color) => {
    playerColor = color;
    document.querySelector('h1').textContent = `You are player ${playerColor === 'w' ? 'White' : 'Black'}`;
});

socket.on('board-state', (fen) => {
    updateBoard(fen);
});

socket.on('game-over', (message) => {
    alert(message);
});

for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
        const square = document.createElement('div');
        square.classList.add('square');
        if ((i + j) % 2 === 0) {
            square.classList.add('white');
        } else {
            square.classList.add('black');
        }
        square.dataset.row = i;
        square.dataset.col = j;
        square.addEventListener('click', handleSquareClick);
        gameBoard.appendChild(square);
        squares.push(square);
    }
}

function handleSquareClick(event) {
    const clickedSquare = event.currentTarget;
    if (selectedSquare) {
        const move = {
            from: getSquareNotation(selectedSquare),
            to: getSquareNotation(clickedSquare),
            promotion: 'q' // aLways promote to a queen for simplicity
        };
        socket.emit('move', move);
        selectedSquare.classList.remove('selected');
        selectedSquare = null;
    } else if (clickedSquare.textContent !== '') {
        selectedSquare = clickedSquare;
        selectedSquare.classList.add('selected');
    }
}

function getSquareNotation(square) {
    const col = square.dataset.col;
    const row = square.dataset.row;
    return String.fromCharCode('a'.charCodeAt(0) + parseInt(col)) + (8 - parseInt(row));
}

function updateBoard(fen) {
    const [board] = fen.split(' ');
    const rows = board.split('/');
    for (let i = 0; i < 8; i++) {
        let col = 0;
        for (const char of rows[i]) {
            if (isNaN(char)) {
                squares[i * 8 + col].textContent = pieces[char];
                col++;
            } else {
                for (let k = 0; k < parseInt(char); k++) {
                    squares[i * 8 + col].textContent = '';
                    col++;
                }
            }
        }
    }
}
