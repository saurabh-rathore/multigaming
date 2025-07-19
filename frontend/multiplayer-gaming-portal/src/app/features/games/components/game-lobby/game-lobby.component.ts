import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Game, GameService } from '../../services/game.service'; // Adjusted path
import { Observable } from 'rxjs';

@Component({
  selector: 'app-game-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './game-lobby.component.html',
  styleUrls: ['./game-lobby.component.scss']
})
export class GameLobbyComponent implements OnInit {
  games$: Observable<Game[]> | undefined;
  isLoading = true;
  error: string | null = null;

  private gameService = inject(GameService);

  ngOnInit(): void {
    this.isLoading = true;
    this.games$ = this.gameService.getGames();
    this.games$.subscribe({
        next: () => this.isLoading = false,
        error: (err) => {
            this.error = 'Failed to load games.';
            this.isLoading = false;
            console.error(err);
        }
    });
  }

  // Placeholder for a play action
  playGame(gameId: string): void {
    console.log(`[GameLobbyComponent] Play button clicked for game: ${gameId} (placeholder)`);
    // Navigate to a game room or specific game play route
    // this.router.navigate(['/play', gameId]);
  }
}
