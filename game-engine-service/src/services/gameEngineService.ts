import { Game, GameResult, GameResultRequestBody } from '../types/game.types';
import {
    LudoGameState, LudoPlayer, LudoPiece, LudoColor, LudoPieceState, LudoGamePhase,
    CreateLudoGameRequest, LudoRollDiceRequest, LudoMovePieceRequest
} from '../types/ludo.types';
import { TowerDefenseGameState, TowerDefensePlayerAction } from '../types/tower_defense.types';
import { FiveGTowerDefenseLogic } from './games/5g_tower_defense.logic'; // Import new game logic
import { generateId } from '../utils/helpers';
import pool from '../config/db.config';

// Define a type for what a DB row might look like
type GameRow = Game & { [key: string]: any };
type GameResultRow = GameResult & { [key: string]: any };

// Type for OkPacket result from INSERT/UPDATE/DELETE
interface OkPacket {
  affectedRows: number;
  insertId?: number | string;
  changedRows?: number; // For UPDATE
}

// --- Mock Data Store for Active Ludo Game States (remains in-memory for this example) ---
const activeLudoGames = new Map<string, LudoGameState>(); // Key: roomId
const LUDO_GAME_ID_CONST = 'ludo_game_official_id'; // Static ID for Ludo game type

// --- Game Logic Handlers ---
// This map would associate game_ids with their specific logic handlers.
const gameLogicHandlers: { [gameId: string]: any } = {
    // 'ludo_game_official_id': new LudoGameLogic(), // If Ludo logic was also refactored into a class
    '5g_tower_defense': new FiveGTowerDefenseLogic(),
    'chess_router_wars': new ChessRouterWarsLogic(), // Register Chess logic handler
};


export class GameEngineService {

    constructor() {
        // Conceptually ensure essential game metadata exists when service starts
        // e.g., this.ensureGameMetadataExists(LUDO_GAME_ID_CONST, { name: "Ludo Classic", ... });
        // e.g., this.ensureGameMetadataExists("5g_tower_defense", { name: "5G Tower Defense", ... });
    }

    private async ensureGameMetadataExists(gameId: string, defaults: Partial<Game>): Promise<void> {
        const [rows]: [GameRow[], any] = await pool.query('SELECT game_id FROM games WHERE game_id = ?', [gameId]) as [GameRow[], any];
        if (rows.length === 0) {
          const meta: Game = {
            game_id: gameId,
            name: defaults.name || "Unknown Game",
            description: defaults.description || "",
            genre: defaults.genre || "Strategy",
            min_players: defaults.min_players || 1,
            max_players: defaults.max_players || 1,
            is_active: defaults.is_active !== undefined ? defaults.is_active : true,
            stake_options: defaults.stake_options ? JSON.stringify(defaults.stake_options) : null,
            created_at: new Date(),
            updated_at: new Date()
          };
          const insertSql = `INSERT INTO games (game_id, name, description, genre, min_players, max_players, is_active, stake_options, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          await pool.query(insertSql, [
              meta.game_id, meta.name, meta.description, meta.genre,
              meta.min_players, meta.max_players, meta.is_active,
              meta.stake_options, meta.created_at, meta.updated_at
          ]);
          console.log(`[GameEngineService-DB] Ensured ${meta.name} metadata exists in DB.`);
        }
    }


  // === Generic Game Metadata & Results Methods (DB interaction) ===
  async listActiveGames(): Promise<Game[]> {
    console.log('[GameEngineService-DB] Listing active games (metadata).');
    const sql = 'SELECT * FROM games WHERE is_active = TRUE';
    const [rows]: [GameRow[], any] = await pool.query(sql) as [GameRow[], any];
    return rows.map(row => ({ // Convert JSON string back to object if needed
        ...row,
        stake_options: typeof row.stake_options === 'string' ? JSON.parse(row.stake_options) : row.stake_options
    })) as Game[];
  }

  async getGameById(gameId: string): Promise<Game | undefined> {
    console.log(`[GameEngineService-DB] Getting game metadata by ID: ${gameId}`);
    const sql = 'SELECT * FROM games WHERE game_id = ? LIMIT 1';
    const [rows]: [GameRow[], any] = await pool.query(sql, [gameId]) as [GameRow[], any];
    if (rows.length > 0) {
      const row = rows[0];
      return {
        ...row,
        stake_options: typeof row.stake_options === 'string' ? JSON.parse(row.stake_options) : row.stake_options
      } as Game;
    }
    return undefined;
  }

  async recordGameResult(gameId: string, data: GameResultRequestBody): Promise<GameResult> {
    console.log(`[GameEngineService-DB] Recording result for game ${gameId}, user ${data.user_id}`);

    // Validate gameId exists and is active
    const game = await this.getGameById(gameId);
    if (!game) throw new Error(`Game with ID ${gameId} not found.`);
    if (!game.is_active) throw new Error(`Game with ID ${gameId} is not active and cannot accept results.`);

    // Check for duplicate result (user_id, room_id, game_id)
    const checkDuplicateSql = 'SELECT result_id FROM game_results WHERE game_id = ? AND room_id = ? AND user_id = ? LIMIT 1';
    const [existingResults]: [GameResultRow[], any] = await pool.query(checkDuplicateSql, [gameId, data.room_id, data.user_id]) as [GameResultRow[], any];
    if (existingResults.length > 0) {
        throw new Error(`Duplicate game result for user ${data.user_id} in room ${data.room_id} for game ${gameId}.`);
    }

    const resultId = generateId('result');
    const now = new Date();
    const newResult: GameResult = {
        result_id: resultId, game_id: gameId, room_id: data.room_id, user_id: data.user_id,
        score: data.score, rank: data.rank, winnings: data.winnings,
        game_specific_data: data.game_specific_data, // Assumed to be object, will be stringified by driver for JSONB
        recorded_at: now
    };

    const insertSql = `
      INSERT INTO game_results (result_id, game_id, room_id, user_id, score, rank, winnings, game_specific_data, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        newResult.result_id, newResult.game_id, newResult.room_id, newResult.user_id,
        newResult.score, newResult.rank || null, newResult.winnings || null,
        newResult.game_specific_data ? JSON.stringify(newResult.game_specific_data) : null, // Stringify for JSON/JSONB
        newResult.recorded_at
    ];
    const [result]: [OkPacket, any] = await pool.query(insertSql, params) as [OkPacket, any];
    if (result.affectedRows !== 1) {
        throw new Error('Failed to record game result in database.');
    }
    console.log(`[GameEngineService-DB] Result ${resultId} recorded.`);
    return newResult;
  }

  async getResultsByRoom(roomId: string): Promise<GameResult[]> {
    console.log(`[GameEngineService-DB] Getting results for room: ${roomId}`);
    const sql = 'SELECT * FROM game_results WHERE room_id = ? ORDER BY rank ASC, score DESC'; // Example sort
    const [rows]: [GameResultRow[], any] = await pool.query(sql, [roomId]) as [GameResultRow[], any];
    return rows.map(row => ({ // Parse JSONB if needed
        ...row,
        game_specific_data: typeof row.game_specific_data === 'string' ? JSON.parse(row.game_specific_data) : row.game_specific_data
    })) as GameResult[];
  }


  // === Ludo Specific Game Logic Methods (Still using in-memory 'activeLudoGames' for this example) ===
  // For a production system with multiple game types being stateful in DB, Ludo would also use the
  // generic GameRoom methods below, and its logic would be in a LudoGameLogic class.

  private initializeLudoPieces(color: LudoColor, count: number = 4): LudoPiece[] {
    const pieces: LudoPiece[] = [];
    for (let i = 0; i < count; i++) {
      pieces.push({
        pieceId: `${color}_${i + 1}`, color: color, position: -1, state: 'home_yard'
      });
    }
    return pieces;
  }

  async startLudoGame(roomId: string, userIds: string[]): Promise<LudoGameState> { // Removed gameId param, uses LUDO_GAME_ID_CONST
    // Conceptually ensure Ludo metadata is in DB first if not done at service init
    // await this.ensureLudoGameMetadataExists();

    console.log(`[GameEngineService-Ludo] Starting Ludo game in room ${roomId} for users: ${userIds.join(', ')}`);
    if (activeLudoGames.has(roomId)) {
      throw new Error(`Ludo game already active in room ${roomId}.`);
    }
    const ludoMeta = await this.getGameById(LUDO_GAME_ID_CONST);
    if(!ludoMeta) throw new Error("Ludo game metadata not found. Cannot start game.");
    if (userIds.length < ludoMeta.min_players || userIds.length > ludoMeta.max_players) {
      throw new Error(`Ludo requires ${ludoMeta.min_players} to ${ludoMeta.max_players} players.`);
    }

    const colors: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
    const players: LudoPlayer[] = userIds.map((uid, index) => ({
      userId: uid, color: colors[index], pieces: this.initializeLudoPieces(colors[index]),
      hasRolledSixRecently: false, consecutiveSixes: 0, displayName: `Player ${index+1}` // Placeholder
    }));

    const initialGameState: LudoGameState = {
      roomId, gameId: LUDO_GAME_ID_CONST, players,
      currentPlayerUserId: players[0].userId, gamePhase: 'dice_to_roll',
      turnLog: [`Game started. ${players[0].displayName} (${players[0].color}) to roll.`],
      createdAt: new Date().toISOString(), startedAt: new Date().toISOString(), lastMoveAt: new Date().toISOString(),
    };
    activeLudoGames.set(roomId, initialGameState);
    return { ...initialGameState };
  }

  async rollDiceForLudo(roomId: string, userId: string): Promise<LudoGameState> {
    const gameState = activeLudoGames.get(roomId);
    // ... (rest of Ludo roll dice logic remains the same, using in-memory gameState) ...
    if (!gameState) throw new Error(`Ludo game not found in room ${roomId}.`);
    if (gameState.currentPlayerUserId !== userId) throw new Error(`Not player ${userId}'s turn.`);
    if (gameState.gamePhase !== 'dice_to_roll') throw new Error(`Not the time to roll dice. Phase: ${gameState.gamePhase}`);

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    gameState.currentDiceRoll = diceRoll;
    gameState.lastMoveAt = new Date().toISOString();
    gameState.gamePhase = 'piece_to_move';
    gameState.turnLog.push(`${gameState.players.find(p=>p.userId === userId)?.displayName} rolled a ${diceRoll}.`);

    const playerState = gameState.players.find(p => p.userId === userId);
    if (playerState) {
        if (diceRoll === 6) {
            playerState.hasRolledSixRecently = true;
            playerState.consecutiveSixes = (playerState.consecutiveSixes || 0) + 1;
            if (playerState.consecutiveSixes === 3) {
                gameState.turnLog.push(`${userId} rolled three consecutive sixes. Turn skipped.`);
                // Simplified: switch to next player directly
                const currentPlayerIndex = gameState.players.findIndex(p => p.userId === userId);
                const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
                gameState.currentPlayerUserId = gameState.players[nextPlayerIndex].userId;
                gameState.gamePhase = 'dice_to_roll';
                gameState.currentDiceRoll = undefined;
                playerState.consecutiveSixes = 0;
                playerState.hasRolledSixRecently = false;
                gameState.turnLog.push(`Turn ended due to 3 sixes. ${gameState.currentPlayerUserId} to play.`);
            }
            // If not 3 sixes, player continues (phase is already piece_to_move, or will roll again after moving)
        } else {
            playerState.hasRolledSixRecently = false;
            playerState.consecutiveSixes = 0;
        }
    }
    activeLudoGames.set(roomId, gameState); // Save updated state
    return { ...gameState };
  }

  async moveLudoPiece(roomId: string, userId: string, pieceId: string, stepsToTake?: number): Promise<LudoGameState> {
    const gameState = activeLudoGames.get(roomId);
    // ... (rest of Ludo move piece logic remains the same, using in-memory gameState) ...
    if (!gameState) throw new Error(`Ludo game not found in room ${roomId}.`);
    if (gameState.currentPlayerUserId !== userId) throw new Error(`Not player ${userId}'s turn.`);
    if (gameState.gamePhase !== 'piece_to_move') throw new Error(`Not the time to move. Phase: ${gameState.gamePhase}`);
    if (!gameState.currentDiceRoll && !stepsToTake) throw new Error('No dice roll or steps provided.');

    const player = gameState.players.find(p => p.userId === userId);
    if (!player) throw new Error('Player not found.');
    const piece = player.pieces.find(p => p.pieceId === pieceId);
    if (!piece) throw new Error(`Piece ${pieceId} not found.`);

    const steps = stepsToTake || gameState.currentDiceRoll!;
    // Simplified movement logic
    if (piece.state === 'home_yard') {
      if (gameState.currentDiceRoll === 6) { piece.state = 'on_track'; piece.position = 0; /* conceptual start */ }
      else { throw new Error('Need a 6 to move from home yard.'); }
    } else { piece.position += steps; piece.position %= 52; /* conceptual track wrap */ }
    gameState.turnLog.push(`${player.displayName} moved ${pieceId}.`);

    gameState.lastMoveAt = new Date().toISOString();
    if (gameState.currentDiceRoll === 6 && player.consecutiveSixes < 3) { // check not 3rd six
        gameState.gamePhase = 'dice_to_roll'; // Same player rolls again
        gameState.turnLog.push(`${player.displayName} gets another turn.`);
    } else {
        const currentPlayerIndex = gameState.players.findIndex(p => p.userId === userId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
        gameState.currentPlayerUserId = gameState.players[nextPlayerIndex].userId;
        gameState.gamePhase = 'dice_to_roll';
        player.consecutiveSixes = 0; // Reset for current player
        player.hasRolledSixRecently = false;
        gameState.turnLog.push(`Turn ended. ${gameState.players[nextPlayerIndex].displayName} to play.`);
    }
    gameState.currentDiceRoll = undefined;
    activeLudoGames.set(roomId, gameState);
    return { ...gameState };
  }

  async getLudoGameState(roomId: string): Promise<LudoGameState | undefined> {
    return activeLudoGames.get(roomId) ? { ...activeLudoGames.get(roomId)! } : undefined;
  }

  clearLudoGames(): void { activeLudoGames.clear(); } // For testing


  // === Generic Game Room and State Management (using DB for game_rooms) ===

  async createGameRoom(
    gameId: string,
    gameType: 'PvP' | 'PvE',
    player1Id: string,
    gameSettings?: any
  ): Promise<GameRoom> {
    console.log(`[GameEngineService-DB] Creating ${gameType} room for game ${gameId}, player ${player1Id}`);
    await this.ensureGameMetadataExists(gameId, { name: gameId }); // Ensure game metadata exists

    const gameLogic = gameLogicHandlers[gameId];
    if (!gameLogic) {
      throw new Error(`No game logic handler found for game ID: ${gameId}`);
    }

    const roomId = generateId('room');
    const playerIds = gameType === 'PvE' ? [player1Id] : [player1Id]; // For PvP, player2 joins later

    // Initialize game state using the specific game's logic module
    const initialGameState = gameLogic.initializeGameState(roomId, gameId, playerIds, gameSettings || {});

    const newRoom: GameRoom = {
      room_id: roomId,
      game_id: gameId,
      game_type: gameType,
      status: gameType === 'PvE' ? 'active' : 'pending', // PvE can start immediately, PvP waits for player2
      player1_id: player1Id,
      player2_id: gameType === 'PvE' ? 'AI' : null, // Player2 is AI for PvE, null for PvP until join
      current_game_state: initialGameState, // This will be JSON.stringified for DB
      game_settings: gameSettings || {},
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      started_at: gameType === 'PvE' ? new Date().toISOString() : null,
    };

    const sql = `
      INSERT INTO game_rooms (room_id, game_id, game_type, status, player1_id, player2_id, current_game_state, game_settings, created_at, last_activity_at, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      newRoom.room_id, newRoom.game_id, newRoom.game_type, newRoom.status,
      newRoom.player1_id, newRoom.player2_id, JSON.stringify(newRoom.current_game_state), // Serialize state to JSON string
      JSON.stringify(newRoom.game_settings), newRoom.created_at, newRoom.last_activity_at, newRoom.started_at
    ];

    const [result]: [OkPacket, any] = await pool.query(sql, params) as [OkPacket, any];
    if (result.affectedRows !== 1) {
      throw new Error('Failed to create game room in database.');
    }

    console.log(`[GameEngineService-DB] Room ${roomId} created for game ${gameId}.`);
    return newRoom; // Return with game_state as object
  }

  async joinGameRoom(roomId: string, player2Id: string): Promise<GameRoom | null> {
    console.log(`[GameEngineService-DB] Player ${player2Id} attempting to join room ${roomId}`);
    const room = await this.getGameRoomState(roomId);
    if (!room) throw new Error(`Room ${roomId} not found.`);
    if (room.game_type !== 'PvP') throw new Error(`Room ${roomId} is not a PvP room.`);
    if (room.status !== 'pending') throw new Error(`Room ${roomId} is not pending players (status: ${room.status}).`);
    if (room.player2_id) throw new Error(`Room ${roomId} already has a second player.`);
    if (room.player1_id === player2Id) throw new Error(`Player ${player2Id} cannot join their own room as player 2.`);

    const now = new Date().toISOString();
    // Potentially update game state via game logic if joining triggers state change
    // e.g. room.current_game_state = gameLogicHandlers[room.game_id].handlePlayerJoin(room.current_game_state, player2Id);

    const sql = 'UPDATE game_rooms SET player2_id = ?, status = ?, started_at = ?, last_activity_at = ? WHERE room_id = ? AND player2_id IS NULL';
    const [result]: [OkPacket, any] = await pool.query(sql, [player2Id, 'active', now, now, roomId]) as [OkPacket, any];

    if (result.affectedRows === 1 || result.changedRows === 1) {
      console.log(`[GameEngineService-DB] Player ${player2Id} joined room ${roomId}. Game active.`);
      return this.getGameRoomState(roomId); // Fetch updated room
    }
    throw new Error(`Failed to join room ${roomId}. It might have been taken or an error occurred.`);
  }

  async getGameRoomState(roomId: string): Promise<GameRoom | null> {
    console.log(`[GameEngineService-DB] Getting state for room: ${roomId}`);
    const sql = 'SELECT * FROM game_rooms WHERE room_id = ?';
    const [rows]: [any[], any] = await pool.query(sql, [roomId]) as [any[], any]; // Row type is any for parsing

    if (rows.length > 0) {
      const row = rows[0];
      return {
        ...row,
        current_game_state: typeof row.current_game_state === 'string' ? JSON.parse(row.current_game_state) : row.current_game_state,
        game_settings: typeof row.game_settings === 'string' ? JSON.parse(row.game_settings) : row.game_settings,
      } as GameRoom;
    }
    return null;
  }

  async submitPlayerAction(
    roomId: string,
    playerId: string,
    actionData: TowerDefensePlayerAction | any // Use specific action type for each game
  ): Promise<GameRoom | null> {
    console.log(`[GameEngineService-DB] Player ${playerId} submitting action in room ${roomId}`);
    const room = await this.getGameRoomState(roomId);
    if (!room) throw new Error(`Room ${roomId} not found.`);
    if (room.status !== 'active') throw new Error(`Game in room ${roomId} is not active.`);
    // Add more validation: is it player's turn (if turn-based)? is player part of this room?

    const gameLogic = gameLogicHandlers[room.game_id];
    if (!gameLogic || !gameLogic.handlePlayerAction) {
      throw new Error(`No action handler logic found for game ID: ${room.game_id}`);
    }

    let newGameState = gameLogic.handlePlayerAction(room.current_game_state, playerId, actionData);

    // For real-time games like Tower Defense, the tick update might happen separately or be triggered
    // Here, for simplicity, we might call a tick update after an action if it's a PvE game and state changes
    // For TD, tick is more about autonomous updates (enemies move, towers fire)
    // if (room.game_type === 'PvE' && gameLogic.updateGameTick) {
    //    newGameState = gameLogic.updateGameTick(newGameState);
    // }
    // The game loop for TD would be more complex, likely managed by setInterval or similar on the server,
    // periodically calling updateGameTick and broadcasting state.

    // Check for game over condition after action
    if (gameLogic.checkWinLossConditions) { // If game logic has this method
        newGameState = gameLogic.checkWinLossConditions(newGameState) || newGameState; // It might modify state directly or return new
    }
    const isGameOver = newGameState.game_over_status?.is_over;
    const newStatus = isGameOver ? 'completed' : room.status;
    const winner = isGameOver ? newGameState.game_over_status?.winner_player_id : room.winner_user_id;
    const endedAt = isGameOver && !room.ended_at ? new Date().toISOString() : room.ended_at;


    const sql = `
      UPDATE game_rooms
      SET current_game_state = ?, status = ?, winner_user_id = ?, ended_at = ?, last_activity_at = NOW()
      WHERE room_id = ?
    `;
    const params = [JSON.stringify(newGameState), newStatus, winner, endedAt, roomId];
    const [result]: [OkPacket, any] = await pool.query(sql, params) as [OkPacket, any];

    if (result.affectedRows === 1 || result.changedRows === 1) {
      console.log(`[GameEngineService-DB] Action processed for room ${roomId}. Game over: ${isGameOver}`);
      // If game is over, record results, notify leaderboard service, etc.
      // This part is crucial and would involve calls to recordGameResult and leaderboardService.updateUserStats
      if (isGameOver) {
          // TODO: Call recordGameResult for each player
          // TODO: Call leaderboardService.updateUserStats for each player
      }
      return this.getGameRoomState(roomId); // Return the latest state
    }
    throw new Error('Failed to update game state after action.');
  }

  // Conceptual: Game loop for PvE Tower Defense (would be more complex in reality)
  // private activeTDLoops = new Map<string, NodeJS.Timeout>();
  // async startGameAILoop(roomId: string) {
  //   if (this.activeTDLoops.has(roomId)) return;
  //
  //   const loop = setInterval(async () => {
  //     const room = await this.getGameRoomState(roomId);
  //     if (!room || room.status !== 'active' || room.game_id !== '5g_tower_defense' || room.game_over_status?.is_over) {
  //       clearInterval(this.activeTDLoops.get(roomId)!);
  //       this.activeTDLoops.delete(roomId);
  //       console.log(`[5GTDLoop] Loop stopped for room ${roomId}.`);
  //       return;
  //     }
  //
  //     const gameLogic = gameLogicHandlers['5g_tower_defense'] as FiveGTowerDefenseLogic;
  //     let newGameState = gameLogic.updateGameTick(room.current_game_state);
  //     // newGameState = gameLogic.checkWinLossConditions(newGameState) || newGameState; // checkWinLossConditions may modify or return
  //
  //     const isGameOver = newGameState.game_over_status?.is_over;
  //     const newStatus = isGameOver ? 'completed' : room.status;
  //     const winner = isGameOver ? newGameState.game_over_status?.winner_player_id : room.winner_user_id;
  //     const endedAt = isGameOver && !room.ended_at ? new Date().toISOString() : room.ended_at;
  //
  //     const sql = `UPDATE game_rooms SET current_game_state = ?, status = ?, winner_user_id = ?, ended_at = ?, last_activity_at = NOW() WHERE room_id = ?`;
  //     await pool.query(sql, [JSON.stringify(newGameState), newStatus, winner, endedAt, roomId]);
  //
  //     // TODO: Broadcast newGameState to clients via Socket.IO
  //     // io.to(roomId).emit('gameStateUpdate', newGameState);
  //
  //     if (isGameOver) {
  //        // TODO: Record results, update leaderboards
  //        console.log(`[5GTDLoop] Game over in room ${roomId}. Winner: ${winner}`);
  //     }
  //   }, 2000); // Example: Tick every 2 seconds
  //   this.activeTDLoops.set(roomId, loop);
  //   console.log(`[5GTDLoop] AI loop started for Tower Defense room ${roomId}.`);
  // }

}
