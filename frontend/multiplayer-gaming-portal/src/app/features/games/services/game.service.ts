import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http'; // Conceptual
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// Mirroring AdminGameView or a simplified Game type for frontend
export interface Game {
  gameId: string;
  name: string;
  description?: string;
  genre?: string;
  minPlayers?: number;
  maxPlayers?: number;
  stakeOptions?: any;
  rulesUrl?: string;
  assetsUrl?: string; // e.g., for a thumbnail image
  isActive: boolean;
}

// Mock data similar to what GameEngineService would provide
const MOCK_GAMES: Game[] = [
  { gameId: 'ludo_masters_game_id', name: 'Ludo Masters', description: 'The classic game of Ludo. Race your tokens to the finish line!', genre: 'Board', minPlayers: 2, maxPlayers: 4, isActive: true, assetsUrl: 'assets/images/games/ludo_thumbnail.png', stakeOptions: [{amount:10},{amount:50}] },
  { gameId: 'rummy_royale_game_id', name: 'Rummy Royale', description: 'A popular card game of sets and runs.', genre: 'Card', minPlayers: 2, maxPlayers: 5, isActive: true, assetsUrl: 'assets/images/games/rummy_thumbnail.png', stakeOptions: [{amount:25},{amount:100}] },
  { gameId: 'space_shooter_x_id', name: 'Space Shooter X', description: 'Defend the galaxy from alien invaders!', genre: 'Arcade', minPlayers: 1, maxPlayers: 1, isActive: true, assetsUrl: 'assets/images/games/spaceshooter_thumbnail.png', stakeOptions: [{amount:5}] },
  { gameId: 'inactive_puzzle_game_id', name: 'Puzzle Blocks', description: 'This game is currently under maintenance.', genre: 'Puzzle', minPlayers: 1, maxPlayers: 1, isActive: false, assetsUrl: 'assets/images/games/puzzle_thumbnail.png' },
];

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // private apiUrl = '/api/v1/games'; // Conceptual backend API

  // constructor(private http: HttpClient) {} // Conceptual
  constructor() {}

  getGames(): Observable<Game[]> {
    console.log('[GameService] Fetching all active games (mocked)...');
    // Simulate fetching only active games, as GameEngineService's listActiveGames does
    const activeGames = MOCK_GAMES.filter(game => game.isActive);
    return of(activeGames).pipe(delay(300)); // Simulate network delay
  }

  getGameById(gameId: string): Observable<Game | undefined> {
    console.log(`[GameService] Fetching game by ID: ${gameId} (mocked)...`);
    const game = MOCK_GAMES.find(g => g.gameId === gameId);
    return of(game).pipe(delay(200));
  }
}
