const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'gaming_platform'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL Connected...');
});

const createTables = `
    CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) UNIQUE, password VARCHAR(255), points INT DEFAULT 0, level INT DEFAULT 1, xp INT DEFAULT 0, currency INT DEFAULT 0, is_premium BOOLEAN DEFAULT 0, referral_code VARCHAR(255) UNIQUE);
    CREATE TABLE IF NOT EXISTS badges (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) UNIQUE, description VARCHAR(255));
    INSERT IGNORE INTO badges (name, description) VALUES ('First Win', 'Win your first game');
    INSERT IGNORE INTO badges (name, description) VALUES ('10 Wins', 'Win 10 games');
    INSERT IGNORE INTO badges (name, description) VALUES ('High Scorer', 'Score 100 points');
    CREATE TABLE IF NOT EXISTS user_badges (user_id INT, badge_id INT, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(badge_id) REFERENCES badges(id), PRIMARY KEY (user_id, badge_id));
    CREATE TABLE IF NOT EXISTS friends (user_id_1 INT, user_id_2 INT, FOREIGN KEY(user_id_1) REFERENCES users(id), FOREIGN KEY(user_id_2) REFERENCES users(id), PRIMARY KEY (user_id_1, user_id_2));
    CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, sender_id INT, receiver_id INT, message TEXT, FOREIGN KEY(sender_id) REFERENCES users(id), FOREIGN KEY(receiver_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS game_history (id INT AUTO_INCREMENT PRIMARY KEY, game_name VARCHAR(255), winner_id INT, loser_id INT, is_draw BOOLEAN, fantasy_team_id INT, FOREIGN KEY(winner_id) REFERENCES users(id), FOREIGN KEY(loser_id) REFERENCES users(id), FOREIGN KEY(fantasy_team_id) REFERENCES fantasy_teams(id));
    CREATE TABLE IF NOT EXISTS guilds (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) UNIQUE, description VARCHAR(255));
    CREATE TABLE IF NOT EXISTS guild_members (guild_id INT, user_id INT, role VARCHAR(255), FOREIGN KEY(guild_id) REFERENCES guilds(id), FOREIGN KEY(user_id) REFERENCES users(id), PRIMARY KEY (guild_id, user_id));
    CREATE TABLE IF NOT EXISTS tournaments (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), game_name VARCHAR(255), start_time DATETIME, end_time DATETIME);
    CREATE TABLE IF NOT EXISTS tournament_participants (tournament_id INT, user_id INT, FOREIGN KEY(tournament_id) REFERENCES tournaments(id), FOREIGN KEY(user_id) REFERENCES users(id), PRIMARY KEY (tournament_id, user_id));
    CREATE TABLE IF NOT EXISTS quests (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) UNIQUE, description VARCHAR(255), reward_points INT);
    CREATE TABLE IF NOT EXISTS user_quests (user_id INT, quest_id INT, completed BOOLEAN, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(quest_id) REFERENCES quests(id), PRIMARY KEY (user_id, quest_id));
    CREATE TABLE IF NOT EXISTS replays (id INT AUTO_INCREMENT PRIMARY KEY, game_id INT, replay_data TEXT, FOREIGN KEY(game_id) REFERENCES game_history(id));
    CREATE TABLE IF NOT EXISTS items (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) UNIQUE, description VARCHAR(255), price INT);
    INSERT IGNORE INTO items (name, description, price) VALUES ('Gold Sword', 'A shiny gold sword.', 100);
    INSERT IGNORE INTO items (name, description, price) VALUES ('Silver Shield', 'A sturdy silver shield.', 75);
    INSERT IGNORE INTO items (name, description, price) VALUES ('Bronze Helmet', 'A basic bronze helmet.', 50);
    CREATE TABLE IF NOT EXISTS user_items (user_id INT, item_id INT, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(item_id) REFERENCES items(id), PRIMARY KEY (user_id, item_id));
    CREATE TABLE IF NOT EXISTS bonuses (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) UNIQUE, description VARCHAR(255), reward_currency INT);
    INSERT IGNORE INTO bonuses (name, description, reward_currency) VALUES ('Daily Login', 'Log in each day to receive a bonus.', 10);
    CREATE TABLE IF NOT EXISTS referrals (id INT AUTO_INCREMENT PRIMARY KEY, referrer_id INT, referred_id INT, FOREIGN KEY(referrer_id) REFERENCES users(id), FOREIGN KEY(referred_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS fantasy_leagues (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) UNIQUE, sport VARCHAR(255));
    CREATE TABLE IF NOT EXISTS fantasy_teams (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, league_id INT, name VARCHAR(255), score INT DEFAULT 0, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(league_id) REFERENCES fantasy_leagues(id));
    CREATE TABLE IF NOT EXISTS fantasy_players (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), sport VARCHAR(255), team VARCHAR(255));
`;

db.query(createTables, (err, result) => {
    if (err) throw err;
    console.log('Tables created or already exist.');
});

app.use(express.json());
app.use(express.static('../frontend/dist/frontend'));

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = crypto.randomBytes(8).toString('hex');
    db.query("INSERT INTO users SET ?", { username, password: hashedPassword, referral_code: referralCode }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.json({ id: result.insertId });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        const user = results[0];
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
    db.query("SELECT id, username, points, level, xp, currency, is_premium, referral_code FROM users WHERE id = ?", [userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = results[0];
        db.query("SELECT b.name, b.description FROM badges b JOIN user_badges ub ON b.id = ub.badge_id WHERE ub.user_id = ?", [userId], (err, badges) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching badges' });
            }
            db.query("SELECT * FROM game_history WHERE winner_id = ? OR loser_id = ?", [userId, userId], (err, gameHistory) => {
                if (err) {
                    return res.status(500).json({ error: 'Error fetching game history' });
                }
                res.json({ ...user, badges, gameHistory });
            });
        });
    });
});

app.get('/api/leaderboard', (req, res) => {
    db.query("SELECT username, points FROM users ORDER BY points DESC LIMIT 10", (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching leaderboard' });
        }
        res.json(results);
    });
});

app.get('/api/friends/:id', (req, res) => {
    const userId = req.params.id;
    db.query("SELECT u.id, u.username FROM users u JOIN friends f ON u.id = f.user_id_2 WHERE f.user_id_1 = ?", [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching friends' });
        }
        res.json(results);
    });
});

app.post('/api/friends', (req, res) => {
    const { userId1, userId2 } = req.body;
    db.query("INSERT INTO friends SET ?", { user_id_1: userId1, user_id_2: userId2 }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not add friend' });
        }
        res.json({ message: 'Friend added successfully' });
    });
});

app.delete('/api/friends', (req, res) => {
    const { userId1, userId2 } = req.body;
    db.query("DELETE FROM friends WHERE user_id_1 = ? AND user_id_2 = ?", [userId1, userId2], (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not remove friend' });
        }
        res.json({ message: 'Friend removed successfully' });
    });
});

app.post('/api/messages', (req, res) => {
    const { senderId, receiverId, message } = req.body;
    db.query("INSERT INTO messages SET ?", { sender_id: senderId, receiver_id: receiverId, message }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not send message' });
        }
        res.json({ message: 'Message sent successfully' });
    });
});

app.get('/api/guilds', (req, res) => {
    db.query("SELECT * FROM guilds", (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching guilds' });
        }
        res.json(results);
    });
});

app.post('/api/guilds', (req, res) => {
    const { name, description } = req.body;
    db.query("INSERT INTO guilds SET ?", { name, description }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Guild name already exists' });
        }
        res.json({ id: result.insertId });
    });
});

app.post('/api/guilds/:id/join', (req, res) => {
    const guildId = req.params.id;
    const { userId } = req.body;
    db.query("INSERT INTO guild_members SET ?", { guild_id: guildId, user_id: userId, role: 'member' }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not join guild' });
        }
        res.json({ message: 'Joined guild successfully' });
    });
});

app.get('/api/tournaments', (req, res) => {
    db.query("SELECT * FROM tournaments", (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching tournaments' });
        }
        res.json(results);
    });
});

app.post('/api/tournaments', (req, res) => {
    const { name, game_name, start_time, end_time } = req.body;
    db.query("INSERT INTO tournaments SET ?", { name, game_name, start_time, end_time }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not create tournament' });
        }
        res.json({ id: result.insertId });
    });
});

app.post('/api/tournaments/:id/join', (req, res) => {
    const tournamentId = req.params.id;
    const { userId } = req.body;
    db.query("INSERT INTO tournament_participants SET ?", { tournament_id: tournamentId, user_id: userId }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not join tournament' });
        }
        res.json({ message: 'Joined tournament successfully' });
    });
});

app.get('/api/quests/:id', (req, res) => {
    const userId = req.params.id;
    db.query("SELECT q.name, q.description, q.reward_points, uq.completed FROM quests q LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = ?", [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching quests' });
        }
        res.json(results);
    });
});

app.post('/api/quests/:id/complete', (req, res) => {
    const questId = req.params.id;
    const { userId } = req.body;
    db.query("INSERT INTO user_quests SET ?", { user_id: userId, quest_id: questId, completed: true }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not complete quest' });
        }
        db.query("SELECT reward_points FROM quests WHERE id = ?", [questId], (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ error: 'Quest not found' });
            }
            const quest = results[0];
            db.query("UPDATE users SET points = points + ? WHERE id = ?", [quest.reward_points, userId], () => {
                checkAchievements(userId);
                res.json({ message: 'Quest completed successfully' });
            });
        });
    });
});

app.get('/api/replays/:id', (req, res) => {
    const replayId = req.params.id;
    db.query("SELECT * FROM replays WHERE id = ?", [replayId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Replay not found' });
        }
        res.json(results[0]);
    });
});

app.get('/api/items', (req, res) => {
    db.query("SELECT * FROM items", (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching items' });
        }
        res.json(results);
    });
});

app.post('/api/items/:id/purchase', (req, res) => {
    const itemId = req.params.id;
    const { userId } = req.body;
    db.query("SELECT price FROM items WHERE id = ?", [itemId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        const item = results[0];
        db.query("SELECT currency FROM users WHERE id = ?", [userId], (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            const user = results[0];
            if (user.currency >= item.price) {
                db.query("UPDATE users SET currency = currency - ? WHERE id = ?", [item.price, userId]);
                db.query("INSERT INTO user_items SET ?", { user_id: userId, item_id: itemId });
                res.json({ message: 'Purchase successful' });
            } else {
                res.status(400).json({ error: 'Insufficient currency' });
            }
        });
    });
});

app.post('/api/premium/purchase', (req, res) => {
    const { userId } = req.body;
    db.query("UPDATE users SET is_premium = 1 WHERE id = ?", [userId], (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not purchase premium' });
        }
        res.json({ message: 'Premium purchased successfully' });
    });
});

app.get('/api/bonuses', (req, res) => {
    db.query("SELECT * FROM bonuses", (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching bonuses' });
        }
        res.json(results);
    });
});

app.post('/api/bonuses/:id/claim', (req, res) => {
    const bonusId = req.params.id;
    const { userId } = req.body;
    db.query("SELECT reward_currency FROM bonuses WHERE id = ?", [bonusId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Bonus not found' });
        }
        const bonus = results[0];
        db.query("UPDATE users SET currency = currency + ? WHERE id = ?", [bonus.reward_currency, userId], (err, result) => {
            if (err) {
                return res.status(400).json({ error: 'Could not claim bonus' });
            }
            res.json({ message: 'Bonus claimed successfully' });
        });
    });
});

app.post('/api/referral-code/redeem', (req, res) => {
    const { userId, referralCode } = req.body;
    db.query("SELECT id FROM users WHERE referral_code = ?", [referralCode], (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).json({ error: 'Invalid referral code' });
        }
        const referrerId = results[0].id;
        db.query("INSERT INTO referrals SET ?", { referrer_id: referrerId, referred_id: userId }, (err, result) => {
            if (err) {
                return res.status(400).json({ error: 'Could not redeem referral code' });
            }
            addCurrency(referrerId, 50);
            res.json({ message: 'Referral code redeemed successfully' });
        });
    });
});

app.get('/api/fantasy-leagues', (req, res) => {
    db.query("SELECT * FROM fantasy_leagues", (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching fantasy leagues' });
        }
        res.json(results);
    });
});

app.post('/api/fantasy-leagues', (req, res) => {
    const { name, sport } = req.body;
    db.query("INSERT INTO fantasy_leagues SET ?", { name, sport }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'League name already exists' });
        }
        res.json({ id: result.insertId });
    });
});

app.post('/api/fantasy-teams', (req, res) => {
    const { userId, leagueId, name } = req.body;
    db.query("INSERT INTO fantasy_teams SET ?", { user_id: userId, league_id: leagueId, name }, (err, result) => {
        if (err) {
            return res.status(400).json({ error: 'Could not create fantasy team' });
        }
        res.json({ id: result.insertId });
    });
});

app.get('/api/fantasy-leagues/:id', (req, res) => {
    const leagueId = req.params.id;
    db.query("SELECT * FROM fantasy_leagues WHERE id = ?", [leagueId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'League not found' });
        }
        const league = results[0];
        db.query("SELECT t.name, t.score FROM fantasy_teams t WHERE t.league_id = ? ORDER BY score DESC", [leagueId], (err, teams) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching teams' });
            }
            res.json({ ...league, teams });
        });
    });
});

let players = {};
let matchmakingQueue = {};
let lobbies = {};
let games = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join-matchmaking', (data) => {
        const { userId, level } = data;
        if (!matchmakingQueue[level]) {
            matchmakingQueue[level] = [];
        }
        matchmakingQueue[level].push({ userId, socketId: socket.id });
        if (matchmakingQueue[level].length >= 2) {
            const player1 = matchmakingQueue[level].shift();
            const player2 = matchmakingQueue[level].shift();
            const lobbyId = `lobby-${player1.userId}-${player2.userId}`;
            const gameId = `game-${player1.userId}-${player2.userId}`;
            lobbies[lobbyId] = { players: [player1, player2], gameId };
            games[gameId] = {
                players: {
                    [player1.userId]: 'X',
                    [player2.userId]: 'O'
                },
                currentPlayer: 'X',
                boardState: ['', '', '', '', '', '', '', '', ''],
                moves: []
            };
            io.to(player1.socketId).emit('match-found', { opponent: player2.userId, lobbyId, gameId });
            io.to(player2.socketId).emit('match-found', { opponent: player1.userId, lobbyId, gameId });
        }
    });

    socket.on('join-game', (gameId) => {
        socket.join(gameId);
        if (games[gameId]) {
            io.to(gameId).emit('board-state', games[gameId].boardState);
        }
    });

    socket.on('spectate-game', (gameId) => {
        socket.join(gameId);
        if (games[gameId]) {
            io.to(gameId).emit('board-state', games[gameId].boardState);
        }
    });

    socket.on('move', (data) => {
        const { gameId, index } = data;
        const game = games[gameId];
        if (game && game.players[socket.id] === game.currentPlayer) {
            game.boardState[index] = game.currentPlayer;
            game.moves.push({ player: game.currentPlayer, index });
            io.to(gameId).emit('board-state', game.boardState);

            if (checkWin(game.boardState, game.currentPlayer)) {
                const winnerId = Object.keys(game.players).find(key => game.players[key] === game.currentPlayer);
                const loserId = Object.keys(game.players).find(key => game.players[key] !== game.currentPlayer);
                addXP(winnerId, 50);
                addCurrency(winnerId, 10);
                db.query("INSERT INTO game_history SET ?", { game_name: 'Tic-Tac-Toe', winner_id: winnerId, loser_id: loserId, is_draw: false }, function(err, result) {
                    if (!err) {
                        const gameId = result.insertId;
                        db.query("INSERT INTO replays SET ?", { game_id: gameId, replay_data: JSON.stringify(game.moves) });
                        db.query("SELECT league_id FROM fantasy_teams WHERE user_id = ?", [winnerId], (err, results) => {
                            if (results && results.length > 0) {
                                const leagueId = results[0].league_id;
                                db.query("UPDATE fantasy_teams SET score = score + 1 WHERE league_id = ? AND user_id = ?", [leagueId, winnerId]);
                            }
                        });
                    }
                });
                io.to(gameId).emit('game-over', `${game.currentPlayer} wins!`);
            } else if (game.boardState.every(cell => cell !== '')) {
                const playersInGame = Object.values(game.players);
                playersInGame.forEach(playerId => {
                    addXP(playerId, 10);
                    addCurrency(playerId, 1);
                });
                db.query("INSERT INTO game_history SET ?", { game_name: 'Tic-Tac-Toe', is_draw: true }, function(err, result) {
                    if (!err) {
                        db.query("INSERT INTO replays SET ?", { game_id: result.insertId, replay_data: JSON.stringify(game.moves) });
                    }
                });
                io.to(gameId).emit('game-over', 'Draw!');
            } else {
                game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
            }
        }
    });

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

    socket.on('voice-signal', (data) => {
        io.to(data.to).emit('voice-signal', { from: socket.id, signal: data.signal });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        for (const level in matchmakingQueue) {
            matchmakingQueue[level] = matchmakingQueue[level].filter(player => player.socketId !== socket.id);
        }
    });
});

function checkWin(boardState, player) {
    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    return winningConditions.some(condition => {
        return condition.every(index => boardState[index] === player);
    });
}

function checkAchievements(userId) {
    db.query("SELECT COUNT(*) as wins FROM game_history WHERE winner_id = ?", [userId], (err, results) => {
        if (results[0].wins === 1) {
            db.query("INSERT IGNORE INTO user_badges SET ?", { user_id: userId, badge_id: 1 });
        }
        if (results[0].wins === 10) {
            db.query("INSERT IGNORE INTO user_badges SET ?", { user_id: userId, badge_id: 2 });
        }
    });
    db.query("SELECT points FROM users WHERE id = ?", [userId], (err, results) => {
        if (results.length > 0 && results[0].points >= 100) {
            db.query("INSERT IGNORE INTO user_badges SET ?", { user_id: userId, badge_id: 3 });
        }
    });
}

function addXP(userId, amount) {
    db.query("SELECT level, xp FROM users WHERE id = ?", [userId], (err, results) => {
        if (results.length > 0) {
            const user = results[0];
            let newXP = user.xp + amount;
            let newLevel = user.level;
            while (newXP >= newLevel * 100) {
                newXP -= newLevel * 100;
                newLevel++;
            }
            db.query("UPDATE users SET xp = ?, level = ? WHERE id = ?", [newXP, newLevel, userId]);
        }
    });
}

function addCurrency(userId, amount) {
    db.query("UPDATE users SET currency = currency + ? WHERE id = ?", [amount, userId]);
}


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
