const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const db = new sqlite3.Database('platform.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, points INTEGER DEFAULT 0)");
    db.run("CREATE TABLE IF NOT EXISTS badges (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, description TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS user_badges (user_id INTEGER, badge_id INTEGER, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(badge_id) REFERENCES badges(id))");
});

app.use(express.json());
app.use(express.static('../frontend/dist/frontend'));

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.json({ id: this.lastID });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({ message: 'Login successful', userId: user.id });
        } else {
            res.status(400).json({ error: 'Invalid username or password' });
        }
    });
});

app.get('/api/profile/:id', (req, res) => {
    const userId = req.params.id;
    db.get("SELECT id, username, points FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        db.all("SELECT b.name FROM badges b JOIN user_badges ub ON b.id = ub.badge_id WHERE ub.user_id = ?", [userId], (err, badges) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching badges' });
            }
            res.json({ ...user, badges });
        });
    });
});

app.get('/api/leaderboard', (req, res) => {
    db.all("SELECT username, points FROM users ORDER BY points DESC LIMIT 10", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching leaderboard' });
        }
        res.json(rows);
    });
});


let players = {};
let currentPlayer = 'X';
let boardState = ['', '', '', '', '', '', '', '', ''];

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('message', (message) => {
        io.emit('message', message);
    });

    // Assign player
    if (!players.X) {
        players.X = socket.id;
        socket.emit('player-assignment', 'X');
    } else if (!players.O) {
        players.O = socket.id;
        socket.emit('player-assignment', 'O');
    } else {
        socket.emit('spectator');
    }

    socket.emit('board-state', boardState);

    socket.on('move', (data) => {
        if (socket.id === players[currentPlayer]) {
            boardState[data.index] = currentPlayer;
            io.emit('board-state', boardState);

            if (checkWin(currentPlayer)) {
                const winnerId = Object.keys(players).find(key => players[key] === socket.id);
                db.run("UPDATE users SET points = points + 10 WHERE id = ?", [winnerId]);
                io.emit('game-over', `${currentPlayer} wins!`);
                resetGame();
            } else if (boardState.every(cell => cell !== '')) {
                io.emit('game-over', 'Draw!');
                resetGame();
            } else {
                currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        const player = Object.keys(players).find(key => players[key] === socket.id);
        if (player) {
            delete players[player];
            resetGame();
        }
    });
});

function checkWin(player) {
    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    return winningConditions.some(condition => {
        return condition.every(index => boardState[index] === player);
    });
}

function resetGame() {
    boardState = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    io.emit('board-state', boardState);
}


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
