import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // Conceptual
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

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = 'http://localhost:3004/v1/games'; // Conceptual backend API

  constructor(private http: HttpClient) {} // Conceptual

  getGames(): Observable<Game[]> {
    console.log('[GameService] Fetching all active games from backend...');
    return this.http.get<Game[]>(this.apiUrl);
  }

  getGameById(gameId: string): Observable<Game | undefined> {
    console.log(`[GameService] Fetching game by ID: ${gameId} from backend...`);
    return this.http.get<Game>(`${this.apiUrl}/${gameId}`);
  }
}
