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
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, points INTEGER DEFAULT 0, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, currency INTEGER DEFAULT 0)");
    db.run("CREATE TABLE IF NOT EXISTS badges (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, description TEXT)");
    db.run("INSERT OR IGNORE INTO badges (name, description) VALUES ('First Win', 'Win your first game')");
    db.run("INSERT OR IGNORE INTO badges (name, description) VALUES ('10 Wins', 'Win 10 games')");
    db.run("INSERT OR IGNORE INTO badges (name, description) VALUES ('High Scorer', 'Score 100 points')");
    db.run("CREATE TABLE IF NOT EXISTS user_badges (user_id INTEGER, badge_id INTEGER, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(badge_id) REFERENCES badges(id))");
    db.run("CREATE TABLE IF NOT EXISTS friends (user_id_1 INTEGER, user_id_2 INTEGER, FOREIGN KEY(user_id_1) REFERENCES users(id), FOREIGN KEY(user_id_2) REFERENCES users(id), PRIMARY KEY (user_id_1, user_id_2))");
    db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER, receiver_id INTEGER, message TEXT, FOREIGN KEY(sender_id) REFERENCES users(id), FOREIGN KEY(receiver_id) REFERENCES users(id))");
    db.run("CREATE TABLE IF NOT EXISTS game_history (id INTEGER PRIMARY KEY AUTOINCREMENT, game_name TEXT, winner_id INTEGER, loser_id INTEGER, is_draw BOOLEAN, FOREIGN KEY(winner_id) REFERENCES users(id), FOREIGN KEY(loser_id) REFERENCES users(id))");
    db.run("CREATE TABLE IF NOT EXISTS guilds (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, description TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS guild_members (guild_id INTEGER, user_id INTEGER, role TEXT, FOREIGN KEY(guild_id) REFERENCES guilds(id), FOREIGN KEY(user_id) REFERENCES users(id), PRIMARY KEY (guild_id, user_id))");
    db.run("CREATE TABLE IF NOT EXISTS tournaments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, game_name TEXT, start_time DATETIME, end_time DATETIME)");
    db.run("CREATE TABLE IF NOT EXISTS tournament_participants (tournament_id INTEGER, user_id INTEGER, FOREIGN KEY(tournament_id) REFERENCES tournaments(id), FOREIGN KEY(user_id) REFERENCES users(id), PRIMARY KEY (tournament_id, user_id))");
    db.run("CREATE TABLE IF NOT EXISTS quests (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, description TEXT, reward_points INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS user_quests (user_id INTEGER, quest_id INTEGER, completed BOOLEAN, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(quest_id) REFERENCES quests(id), PRIMARY KEY (user_id, quest_id))");
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
    db.get("SELECT id, username, points, level, xp, currency FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        db.all("SELECT b.name, b.description FROM badges b JOIN user_badges ub ON b.id = ub.badge_id WHERE ub.user_id = ?", [userId], (err, badges) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching badges' });
            }
            db.all("SELECT * FROM game_history WHERE winner_id = ? OR loser_id = ?", [userId, userId], (err, gameHistory) => {
                if (err) {
                    return res.status(500).json({ error: 'Error fetching game history' });
                }
                res.json({ ...user, badges, gameHistory });
            });
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

app.get('/api/friends/:id', (req, res) => {
    const userId = req.params.id;
    db.all("SELECT u.id, u.username FROM users u JOIN friends f ON u.id = f.user_id_2 WHERE f.user_id_1 = ?", [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching friends' });
        }
        res.json(rows);
    });
});

app.post('/api/friends', (req, res) => {
    const { userId1, userId2 } = req.body;
    db.run("INSERT INTO friends (user_id_1, user_id_2) VALUES (?, ?)", [userId1, userId2], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Could not add friend' });
        }
        res.json({ message: 'Friend added successfully' });
    });
});

app.delete('/api/friends', (req, res) => {
    const { userId1, userId2 } = req.body;
    db.run("DELETE FROM friends WHERE user_id_1 = ? AND user_id_2 = ?", [userId1, userId2], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Could not remove friend' });
        }
        res.json({ message: 'Friend removed successfully' });
    });
});

app.post('/api/messages', (req, res) => {
    const { senderId, receiverId, message } = req.body;
    db.run("INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)", [senderId, receiverId, message], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Could not send message' });
        }
        res.json({ message: 'Message sent successfully' });
    });
});

app.get('/api/guilds', (req, res) => {
    db.all("SELECT * FROM guilds", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching guilds' });
        }
        res.json(rows);
    });
});

app.post('/api/guilds', (req, res) => {
    const { name, description } = req.body;
    db.run("INSERT INTO guilds (name, description) VALUES (?, ?)", [name, description], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Guild name already exists' });
        }
        res.json({ id: this.lastID });
    });
});

app.post('/api/guilds/:id/join', (req, res) => {
    const guildId = req.params.id;
    const { userId } = req.body;
    db.run("INSERT INTO guild_members (guild_id, user_id, role) VALUES (?, ?, ?)", [guildId, userId, 'member'], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Could not join guild' });
        }
        res.json({ message: 'Joined guild successfully' });
    });
});

app.get('/api/tournaments', (req, res) => {
    db.all("SELECT * FROM tournaments", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching tournaments' });
        }
        res.json(rows);
    });
});

app.post('/api/tournaments', (req, res) => {
    const { name, game_name, start_time, end_time } = req.body;
    db.run("INSERT INTO tournaments (name, game_name, start_time, end_time) VALUES (?, ?, ?, ?)", [name, game_name, start_time, end_time], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Could not create tournament' });
        }
        res.json({ id: this.lastID });
    });
});

app.post('/api/tournaments/:id/join', (req, res) => {
    const tournamentId = req.params.id;
    const { userId } = req.body;
    db.run("INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)", [tournamentId, userId], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Could not join tournament' });
        }
        res.json({ message: 'Joined tournament successfully' });
    });
});

app.get('/api/quests/:id', (req, res) => {
    const userId = req.params.id;
    db.all("SELECT q.name, q.description, q.reward_points, uq.completed FROM quests q LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = ?", [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching quests' });
        }
        res.json(rows);
    });
});

app.post('/api/quests/:id/complete', (req, res) => {
    const questId = req.params.id;
    const { userId } = req.body;
    db.run("INSERT INTO user_quests (user_id, quest_id, completed) VALUES (?, ?, ?)", [userId, questId, true], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Could not complete quest' });
        }
        db.get("SELECT reward_points FROM quests WHERE id = ?", [questId], (err, quest) => {
            if (err || !quest) {
                return res.status(404).json({ error: 'Quest not found' });
            }
            db.run("UPDATE users SET points = points + ? WHERE id = ?", [quest.reward_points, userId], () => {
                checkAchievements(userId);
                res.json({ message: 'Quest completed successfully' });
            });
        });
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

    socket.on('private-message', (data) => {
        const { receiverId, message } = data;
        const receiverSocketId = Object.keys(players).find(key => players[key] === receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('private-message', message);
        }
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
                const loserId = Object.keys(players).find(key => players[key] !== socket.id);
                addXP(winnerId, 50);
                addCurrency(winnerId, 10);
                db.run("INSERT INTO game_history (game_name, winner_id, loser_id, is_draw) VALUES (?, ?, ?, ?)", ['Tic-Tac-Toe', winnerId, loserId, false]);
                io.emit('game-over', `${currentPlayer} wins!`);
                resetGame();
            } else if (boardState.every(cell => cell !== '')) {
                const playersInGame = Object.values(players);
                playersInGame.forEach(playerId => {
                    addXP(playerId, 10);
                    addCurrency(playerId, 1);
                });
                db.run("INSERT INTO game_history (game_name, is_draw) VALUES (?, ?)", ['Tic-Tac-Toe', true]);
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

function checkAchievements(userId) {
    db.get("SELECT COUNT(*) as wins FROM game_history WHERE winner_id = ?", [userId], (err, row) => {
        if (row.wins === 1) {
            db.run("INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, (SELECT id FROM badges WHERE name = 'First Win'))", [userId]);
        }
        if (row.wins === 10) {
            db.run("INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, (SELECT id FROM badges WHERE name = '10 Wins'))", [userId]);
        }
    });
    db.get("SELECT points FROM users WHERE id = ?", [userId], (err, user) => {
        if (user.points >= 100) {
            db.run("INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, (SELECT id FROM badges WHERE name = 'High Scorer'))", [userId]);
        }
    });
}

function addXP(userId, amount) {
    db.get("SELECT level, xp FROM users WHERE id = ?", [userId], (err, user) => {
        if (user) {
            let newXP = user.xp + amount;
            let newLevel = user.level;
            while (newXP >= newLevel * 100) {
                newXP -= newLevel * 100;
                newLevel++;
            }
            db.run("UPDATE users SET xp = ?, level = ? WHERE id = ?", [newXP, newLevel, userId]);
        }
    });
}

function addCurrency(userId, amount) {
    db.run("UPDATE users SET currency = currency + ? WHERE id = ?", [amount, userId]);
}


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
