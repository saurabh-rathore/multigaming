import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tournaments',
  templateUrl: './tournaments.component.html',
  styleUrls: ['./tournaments.component.css']
})
export class TournamentsComponent implements OnInit {
  tournaments: any[];
  newTournamentName = '';
  newTournamentGame = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get('/api/tournaments')
      .subscribe((tournaments: any[]) => this.tournaments = tournaments);
  }

  createTournament() {
    this.http.post('/api/tournaments', { name: this.newTournamentName, game_name: this.newTournamentGame, start_time: new Date(), end_time: new Date() })
      .subscribe(() => {
        this.ngOnInit();
        this.newTournamentName = '';
        this.newTournamentGame = '';
      });
  }

  joinTournament(tournamentId: number) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.post(`/api/tournaments/${tournamentId}/join`, { userId })
        .subscribe(() => {
          // You might want to update the UI to show that the user has joined the tournament
        });
    }
  }
}
