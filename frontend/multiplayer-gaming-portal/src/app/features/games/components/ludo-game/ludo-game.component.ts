import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LudoGameState, LudoGameService, LudoPiece } from '../../services/ludo-game.service'; // Adjusted path
import { Observable, Subscription, of, timer } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-ludo-game',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ludo-game.component.html',
  styleUrls: ['./ludo-game.component.scss']
})
export class LudoGameComponent implements OnInit, OnDestroy {
  @Input() roomId?: string; // From route param :roomId

  gameState: LudoGameState | null = null;
  isLoading = true;
  error: string | null = null;
  actionInProgress = false;

  // Conceptual current user ID - would come from AuthService
  currentMockUserId = 'player1_id';

  private gameStateSubscription: Subscription | undefined;
  private ludoGameService = inject(LudoGameService);
  private route = inject(ActivatedRoute); // If not using @Input for roomId

  ngOnInit(): void {
    if (!this.roomId) { // If roomId not passed via @Input, try to get from route
        this.roomId = this.route.snapshot.paramMap.get('roomId') || undefined;
    }

    if (this.roomId) {
      this.fetchGameState(this.roomId);
      // Conceptual: Set up polling or WebSocket for real-time updates
      // For now, we just fetch once or after actions.
    } else {
      this.error = "No Room ID specified for the Ludo game.";
      this.isLoading = false;
    }
  }

  fetchGameState(roomId: string): void {
    this.isLoading = true;
    this.ludoGameService.getLudoGameState(roomId)
    .pipe(
        tap(state => console.log("Fetched Ludo Game State:", state)),
        catchError(err => {
          this.error = err.message || 'Failed to load Ludo game state.';
          this.gameState = null;
          return of(null);
        })
    )
    .subscribe(state => {
      this.isLoading = false;
      if (state) this.gameState = state;
      // If no state and no error, it means service might have initialized one
      else if (!this.error) this.error = "Ludo game state could not be established.";
    });
  }

  isMyTurn(): boolean {
    return this.gameState?.currentPlayerUserId === this.currentMockUserId;
  }

  canRollDice(): boolean {
      return this.isMyTurn() && this.gameState?.gamePhase === 'dice_to_roll' && !this.actionInProgress;
  }

  canMovePiece(piece: LudoPiece): boolean {
      // Highly conceptual - just checks if it's player's turn and in piece_to_move phase
      // Real logic would check if THIS piece can move based on dice roll.
      return this.isMyTurn() && this.gameState?.gamePhase === 'piece_to_move' && !this.actionInProgress;
  }

  rollDice(): void {
    if (!this.roomId || !this.canRollDice()) return;
    this.actionInProgress = true;
    this.error = null;
    this.ludoGameService.rollDice(this.roomId, this.currentMockUserId).subscribe({
      next: (newState) => { this.gameState = newState; this.actionInProgress = false; },
      error: (err) => { this.error = err.message; this.actionInProgress = false; }
    });
  }

  movePiece(pieceId: string): void {
    if (!this.roomId || !this.canMovePiece({pieceId} as LudoPiece) ) return; // Pass dummy piece for canMovePiece check
    this.actionInProgress = true;
    this.error = null;
    this.ludoGameService.movePiece(this.roomId, this.currentMockUserId, pieceId).subscribe({
      next: (newState) => { this.gameState = newState; this.actionInProgress = false; },
      error: (err) => { this.error = err.message; this.actionInProgress = false; }
    });
  }

  // Helper for simple board rendering
  getPieceAt(boardPosition: number, playerIndex: number, pieceIndex: number): LudoPiece | undefined {
      // This is a very naive way to place pieces for a simple grid.
      // Not a real Ludo board rendering.
      return this.gameState?.players[playerIndex]?.pieces[pieceIndex];
  }


  ngOnDestroy(): void {
    if (this.gameStateSubscription) {
      this.gameStateSubscription.unsubscribe();
    }
  }
}
