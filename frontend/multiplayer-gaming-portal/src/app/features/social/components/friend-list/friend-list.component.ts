import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel if used for game selection
import { Friend, FriendService } from '../../services/friend.service';
import { Game, GameService } from '../../../games/services/game.service'; // For game selection
import { Observable } from 'rxjs';

@Component({
  selector: 'app-friend-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friend-list.component.html',
  styleUrls: ['./friend-list.component.scss']
})
export class FriendListComponent implements OnInit {
  friends$: Observable<Friend[]> | undefined;
  availableGames$: Observable<Game[]> | undefined;

  selectedGameIdToInvite: string = ''; // To hold the game selected for inviting
  inviteStatus: { [friendId: string]: { message: string, success?: boolean, isLoading?: boolean } } = {};

  isLoadingFriends = true;
  isLoadingGames = true;
  error: string | null = null;

  private friendService = inject(FriendService);
  private gameService = inject(GameService);

  ngOnInit(): void {
    this.loadFriends();
    this.loadGames();
  }

  loadFriends(): void {
    this.isLoadingFriends = true;
    this.friends$ = this.friendService.getFriends();
    this.friends$.subscribe({
      next: () => this.isLoadingFriends = false,
      error: (err) => {
        this.error = 'Failed to load friends list.';
        this.isLoadingFriends = false;
        console.error(err);
      }
    });
  }

  loadGames(): void {
    this.isLoadingGames = true;
    this.availableGames$ = this.gameService.getGames(); // Fetches active games
    this.availableGames$.subscribe({
      next: (games) => {
        this.isLoadingGames = false;
        if (games && games.length > 0) {
          this.selectedGameIdToInvite = games[0].gameId; // Default to first game
        }
      },
      error: (err) => {
        this.isLoadingGames = false;
        // Non-critical error for this component, just log it
        console.error('Failed to load games for invite selection:', err);
      }
    });
  }

  inviteFriend(friend: Friend): void {
    if (!this.selectedGameIdToInvite) {
      alert('Please select a game to invite your friend to.');
      return;
    }
    this.inviteStatus[friend.userId] = { message: '', isLoading: true };

    // Find game name for a nicer message
    this.availableGames$?.subscribe(games => {
        const selectedGame = games.find(g => g.gameId === this.selectedGameIdToInvite);
        const gameName = selectedGame ? selectedGame.name : this.selectedGameIdToInvite;

        this.friendService.sendGameInvite(friend.userId, this.selectedGameIdToInvite, gameName).subscribe({
            next: (response) => {
            this.inviteStatus[friend.userId] = { message: response.message, success: response.success, isLoading: false };
            },
            error: (err) => {
            this.inviteStatus[friend.userId] = { message: err.message || 'Failed to send invite.', success: false, isLoading: false };
            }
        });
    });
  }
}
