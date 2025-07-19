import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Tournament, TournamentService, TournamentParticipant } from '../../services/tournament.service'; // Adjusted path
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './tournament-detail.component.html',
  styleUrls: ['./tournament-detail.component.scss']
})
export class TournamentDetailComponent implements OnInit {
  @Input() id?: string; // Tournament ID from route

  tournament$: Observable<Tournament | undefined> | undefined;
  participants$: Observable<TournamentParticipant[]> | undefined;

  isLoading = true;
  error: string | null = null;
  registrationStatus: { success?: boolean, message?: string, isLoading?: boolean } = {};

  // Conceptual: get current user ID from an AuthService
  private currentUserId = 'sim_user_for_reg'; // Placeholder for logged-in user

  private tournamentService = inject(TournamentService);
  private router = inject(Router);

  ngOnInit(): void {
    if (this.id) {
      this.isLoading = true;
      this.tournament$ = this.tournamentService.getTournamentDetails(this.id);
      this.participants$ = this.tournamentService.getTournamentParticipants(this.id);

      // Wait for tournament details before deciding if participants are relevant to load, or load in parallel
      this.tournament$.subscribe({
        next: (tournament) => {
          if (!tournament) {
            this.error = 'Tournament not found.';
            this.isLoading = false;
          } else {
            // Participants can continue loading or be loaded here
            this.isLoading = false; // Base loading done
          }
        },
        error: (err) => {
          this.error = 'Failed to load tournament details.';
          this.isLoading = false;
          console.error(err);
        }
      });
    } else {
      this.error = 'No tournament ID provided.';
      this.isLoading = false;
    }
  }

  register(): void {
    if (!this.id) return;
    this.registrationStatus = { isLoading: true };
    this.tournamentService.registerForTournament(this.id, this.currentUserId).subscribe({
      next: (response) => {
        this.registrationStatus = { success: true, message: response.message, isLoading: false };
        // Optionally refresh participants or update tournament data
        if (this.id) this.participants$ = this.tournamentService.getTournamentParticipants(this.id);
      },
      error: (err) => {
        this.registrationStatus = { success: false, message: err.message || 'Registration failed.', isLoading: false };
        console.error(err);
      }
    });
  }

  isUserRegistered(participants: TournamentParticipant[] | null): boolean {
    if (!participants) return false;
    return participants.some(p => p.userId === this.currentUserId);
  }
}
