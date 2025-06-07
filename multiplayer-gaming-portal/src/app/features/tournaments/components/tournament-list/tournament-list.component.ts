import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Tournament, TournamentService, TournamentStatus } from '../../services/tournament.service'; // Adjusted path
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './tournament-list.component.html',
  styleUrls: ['./tournament-list.component.scss']
})
export class TournamentListComponent implements OnInit {
  tournaments$: Observable<Tournament[]> | undefined;
  isLoading = true;
  error: string | null = null;

  selectedStatus: TournamentStatus | 'all' = 'registration_open'; // Default filter

  private tournamentService = inject(TournamentService);

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.isLoading = true;
    this.error = null;
    const filters: { status?: TournamentStatus } = {};
    if (this.selectedStatus !== 'all') {
      filters.status = this.selectedStatus;
    }
    this.tournaments$ = this.tournamentService.getTournaments(filters);
    this.tournaments$.subscribe({
        next: () => this.isLoading = false,
        error: (err) => {
            this.error = 'Failed to load tournaments.';
            this.isLoading = false;
            console.error(err);
        }
    });
  }

  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedStatus = selectElement.value as TournamentStatus | 'all';
    this.loadTournaments();
  }
}
