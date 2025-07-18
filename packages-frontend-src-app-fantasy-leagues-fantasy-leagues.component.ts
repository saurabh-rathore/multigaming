import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-fantasy-leagues',
  templateUrl: './fantasy-leagues.component.html',
  styleUrls: ['./fantasy-leagues.component.css']
})
export class FantasyLeaguesComponent implements OnInit {
  leagues: any[];
  newLeagueName = '';
  newLeagueSport = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get('/api/fantasy-leagues')
      .subscribe((leagues: any[]) => this.leagues = leagues);
  }

  createLeague() {
    this.http.post('/api/fantasy-leagues', { name: this.newLeagueName, sport: this.newLeagueSport })
      .subscribe(() => {
        this.ngOnInit();
        this.newLeagueName = '';
        this.newLeagueSport = '';
      });
  }
}
