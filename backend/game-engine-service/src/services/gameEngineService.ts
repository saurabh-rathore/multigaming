import { Game, GameResult, GameResultRequestBody } from '../types/game.types';
import {
    LudoGameState, LudoPlayer, LudoPiece, LudoColor, LudoPieceState, LudoGamePhase,
    CreateLudoGameRequest, LudoRollDiceRequest, LudoMovePieceRequest
} from '../types/ludo.types';
import { generateId } from '../utils/helpers';
import pool from '../config/db.config'; // Import the conceptual MySQL pool for GameEngine

// Define a type for what a DB row might look like
type GameRow = Game & { [key: string]: any };
type GameResultRow = GameResult & { [key: string]: any };

// Type for OkPacket result from INSERT/UPDATE/DELETE
interface OkPacket {
  affectedRows: number;
  insertId?: number | string;
}

// --- Mock Data Store for Active Ludo Game States (remains in-memory) ---
const activeLudoGames = new Map<string, LudoGameState>(); // Key: roomId
const LUDO_GAME_ID_CONST = 'ludo_game_official_id'; // Static ID for Ludo game type (ensure this exists in DB)


export class GameEngineService {

  // Helper to ensure Ludo metadata exists in DB (conceptual, run at startup or on-demand)
  async ensureLudoGameMetadataExists(): Promise<void> {
    const [rows]: [GameRow[], any] = await pool.query('SELECT game_id FROM games WHERE game_id = ?', [LUDO_GAME_ID_CONST]) as [GameRow[], any];
    if (rows.length === 0) {
      const ludoMeta: Game = {
        game_id: LUDO_GAME_ID_CONST, name: "Ludo Classic",
        description: "The classic game of Ludo.", genre: "Board",
        min_players: 2, max_players: 4, is_active: true,
        stake_options: JSON.stringify([{amount: 10, currency: "INR"}, {amount: 50, currency: "INR"}]), // Store as JSON string
        created_at: new Date(),
        updated_at: new Date()
      };
      const insertSql = `INSERT INTO games (game_id, name, description, genre, min_players, max_players, is_active, stake_options, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      await pool.query(insertSql, [
          ludoMeta.game_id, ludoMeta.name, ludoMeta.description, ludoMeta.genre,
          ludoMeta.min_players, ludoMeta.max_players, ludoMeta.is_active,
          ludoMeta.stake_options, ludoMeta.created_at, ludoMeta.updated_at
      ]);
      console.log('[GameEngineService-DB] Ensured Ludo Classic metadata exists in DB.');
    }
  }
  constructor() {
      // Conceptually ensure essential game metadata like Ludo exists when service starts
      this.ensureLudoGameMetadataExists(); // This would be called in a real init phase
  }


  // === Generic Game Metadata & Results Methods (Now using DB) ===
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


  // === Ludo Specific Game Logic Methods (Still using in-memory 'activeLudoGames') ===

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
}
