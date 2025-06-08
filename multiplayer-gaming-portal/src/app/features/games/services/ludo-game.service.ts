import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http'; // Conceptual
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

// Import LudoGameState and other relevant types from a shared location or define here
// For simplicity, let's assume they might be defined in a way accessible to frontend
// or we redefine simplified versions here for the conceptual UI.
// These should ideally mirror the backend's ludo.types.ts structures.

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';
export type LudoPieceState = 'home_yard' | 'on_track' | 'safe_home_run' | 'finished';
export interface LudoPiece {
  pieceId: string; color: LudoColor; position: number; state: LudoPieceState;
}
export interface LudoPlayer {
  userId: string; displayName?: string; color: LudoColor; pieces: LudoPiece[];
  hasRolledSixRecently: boolean; consecutiveSixes: number;
}
export type LudoGamePhase = 'waiting_for_players' | 'dice_to_roll' | 'piece_to_move' | 'turn_ended' | 'finished';
export interface LudoGameState {
  roomId: string; gameId: string; players: LudoPlayer[]; currentPlayerUserId: string | null;
  currentDiceRoll?: number; gamePhase: LudoGamePhase; winnerUserId?: string; turnLog: string[];
  createdAt: Date | string; startedAt?: Date | string; lastMoveAt?: Date | string; finishedAt?: Date | string;
}


// Mock initial game state for a room - this would be fetched from backend
let MOCK_LUDO_GAME_STATES = new Map<string, LudoGameState>();

const initializeMockLudoState = (roomId: string, userIds: string[] = ['player1_id', 'player2_id']): LudoGameState => {
    const colors: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
    const players: LudoPlayer[] = userIds.map((uid, index) => ({
      userId: uid,
      displayName: `Player ${index + 1}`,
      color: colors[index],
      pieces: Array.from({ length: 4 }, (_, i) => ({
        pieceId: `${colors[index]}_${i + 1}`, color: colors[index], position: -1, state: 'home_yard'
      })),
      hasRolledSixRecently: false, consecutiveSixes: 0,
    }));

    const initialGameState: LudoGameState = {
      roomId, gameId: 'ludo_game_official_id', players,
      currentPlayerUserId: players[0].userId,
      gamePhase: 'dice_to_roll',
      turnLog: [`Game ready. ${players[0].displayName} (Color: ${players[0].color}) to roll.`],
      createdAt: new Date().toISOString(), startedAt: new Date().toISOString(), lastMoveAt: new Date().toISOString(),
    };
    MOCK_LUDO_GAME_STATES.set(roomId, initialGameState);
    return initialGameState;
};


@Injectable({
  providedIn: 'root'
})
export class LudoGameService { // Angular LudoGameService
  // private backendApiUrl = '/api/v1/games/ludo'; // Conceptual

  constructor(/*private http: HttpClient*/) {
    // Initialize a default game state for testing if needed
    if (MOCK_LUDO_GAME_STATES.size === 0) {
        initializeMockLudoState('defaultLudoRoom123');
    }
  }

  // Method to create/start a game (could be called by matchmaking UI/service)
  createOrJoinLudoGame(roomId: string, userIds: string[]): Observable<LudoGameState> {
    console.log(`[LudoGameService Angular] Requesting to create/join Ludo game ${roomId} (mocked)`);
    // Conceptual POST call: this.http.post<LudoGameState>(`${this.backendApiUrl}/${roomId}/start`, { userIds });
    const state = initializeMockLudoState(roomId, userIds);
    return of(state).pipe(delay(300));
  }

  getLudoGameState(roomId: string): Observable<LudoGameState | undefined> {
    console.log(`[LudoGameService Angular] Fetching Ludo game state for room ${roomId} (mocked)`);
    // Conceptual GET call: this.http.get<LudoGameState>(`${this.backendApiUrl}/rooms/${roomId}`);
    const state = MOCK_LUDO_GAME_STATES.get(roomId);
    if (state) {
      return of({ ...state, players: state.players.map(p => ({...p, pieces: p.pieces.map(pc => ({...pc}))})) }).pipe(delay(150)); // Deep copy
    }
    // If no state, perhaps initialize one for demo purposes or return error
    // For now, let's initialize if not found for easier UI testing without explicit create call
    const newGame = initializeMockLudoState(roomId);
    return of(newGame).pipe(delay(150));
    // return throwError(() => new Error(`Game state for room ${roomId} not found.`)).pipe(delay(100));
  }

  rollDice(roomId: string, userId: string): Observable<LudoGameState> {
    console.log(`[LudoGameService Angular] User ${userId} rolling dice in room ${roomId} (mocked)`);
    // Conceptual POST call: this.http.post<LudoGameState>(`${this.backendApiUrl}/rooms/${roomId}/roll-dice`, { userId });
    const state = MOCK_LUDO_GAME_STATES.get(roomId);
    if (!state) return throwError(() => new Error('Game not found'));
    if (state.currentPlayerUserId !== userId) return throwError(() => new Error('Not your turn'));
    if (state.gamePhase !== 'dice_to_roll') return throwError(() => new Error('Not time to roll dice'));

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    state.currentDiceRoll = diceRoll;
    state.gamePhase = 'piece_to_move';
    state.turnLog.push(`${state.players.find(p=>p.userId === userId)?.displayName} rolled ${diceRoll}.`);
    state.lastMoveAt = new Date().toISOString();
    // Simplified frontend update, backend would handle complex logic (e.g. 3 sixes, another turn)
    return of({ ...state }).pipe(delay(200));
  }

  movePiece(roomId: string, userId: string, pieceId: string): Observable<LudoGameState> {
    console.log(`[LudoGameService Angular] User ${userId} moving piece ${pieceId} in room ${roomId} (mocked)`);
    // Conceptual POST call: this.http.post<LudoGameState>(`${this.backendApiUrl}/rooms/${roomId}/move-piece`, { userId, pieceId });
    const state = MOCK_LUDO_GAME_STATES.get(roomId);
    if (!state) return throwError(() => new Error('Game not found'));
    if (state.currentPlayerUserId !== userId) return throwError(() => new Error('Not your turn'));
    if (state.gamePhase !== 'piece_to_move') return throwError(() => new Error('Not time to move piece'));
    if (!state.currentDiceRoll) return throwError(() => new Error('Dice not rolled yet or roll not valid for move.'));

    const player = state.players.find(p => p.userId === userId);
    const piece = player?.pieces.find(p => p.pieceId === pieceId);
    if (!player || !piece) return throwError(() => new Error('Player or piece not found'));

    // --- Extremely simplified move logic for placeholder UI ---
    if (piece.state === 'home_yard') {
        if (state.currentDiceRoll === 6) { piece.state = 'on_track'; piece.position = 0; /* conceptual start pos */ }
        else { return throwError(() => new Error('Need a 6 to move piece from home.')); }
    } else {
        piece.position = (piece.position + state.currentDiceRoll!) % 52; // Simple track movement, no actual Ludo path logic
    }
    state.turnLog.push(`${player.displayName} moved ${pieceId}.`);
    // --- End simplified logic ---

    // Switch turn (simplified: if not 6, switch. Backend handles real logic)
    if (state.currentDiceRoll !== 6) {
        const currentPlayerIndex = state.players.findIndex(p => p.userId === userId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length;
        state.currentPlayerUserId = state.players[nextPlayerIndex].userId;
        state.turnLog.push(`Turn for ${state.players[nextPlayerIndex].displayName}.`);
    } else {
        state.turnLog.push(`${player.displayName} rolled a 6, gets another turn (conceptually).`);
    }
    state.gamePhase = 'dice_to_roll';
    state.currentDiceRoll = undefined; // Clear roll for next action
    state.lastMoveAt = new Date().toISOString();

    return of({ ...state }).pipe(delay(200));
  }
}
