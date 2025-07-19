import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel
import { Leaderboard, LeaderboardService, Timeframe, LeaderboardEntry } from '../../services/leaderboard.service'; // Adjusted
import { Game, GameService } from '../../../games/services/game.service'; // Import GameService
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss']
})
export class LeaderboardComponent implements OnInit {
  availableGames$: Observable<Game[]> | undefined;
  leaderboard: Leaderboard | null = null;

  selectedGameId: string = '';
  selectedTimeframe: Timeframe = 'allTime';
  timeframes: Timeframe[] = ['daily', 'weekly', 'monthly', 'allTime'];

  isLoadingGames = true;
  isLoadingLeaderboard = false;
  error: string | null = null;

  private leaderboardService = inject(LeaderboardService);
  private gameService = inject(GameService); // Inject GameService

  ngOnInit(): void {
    this.isLoadingGames = true;
    this.availableGames$ = this.gameService.getGames(); // Fetch active games for the dropdown
    this.availableGames$.subscribe({
        next: (games) => {
            this.isLoadingGames = false;
            if (games && games.length > 0) {
                this.selectedGameId = games[0].gameId; // Default to first game
                this.fetchLeaderboard(); // Fetch initially for the default game
            } else {
                this.error = "No games available to display leaderboards for.";
            }
        },
        error: (err) => {
            this.isLoadingGames = false;
            this.error = "Failed to load available games.";
            console.error(err);
        }
    });
  }

  fetchLeaderboard(): void {
    if (!this.selectedGameId) {
      this.error = "Please select a game.";
      this.leaderboard = null;
      return;
    }
    this.isLoadingLeaderboard = true;
    this.error = null;
    this.leaderboardService.getLeaderboard(this.selectedGameId, this.selectedTimeframe)
      .pipe(
        catchError(err => {
          this.error = err.message || 'Failed to load leaderboard data.';
          this.leaderboard = null; // Clear previous leaderboard on error
          return of(null); // Return null to complete the observable chain
        })
      )
      .subscribe(data => {
        this.isLoadingLeaderboard = false;
        if (data) { // Check if data is not null (due to catchError)
          this.leaderboard = data;
          if (data.entries.length === 0) {
            // this.error = "No leaderboard entries found for the selected criteria.";
            // No error, just display empty message in template
          }
        }
        // If data is null from catchError, error message is already set
      });
  }

  onGameChange(): void {
    this.fetchLeaderboard();
  }

  onTimeframeChange(): void {
    this.fetchLeaderboard();
  }
}
