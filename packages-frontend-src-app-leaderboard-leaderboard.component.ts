import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {
  leaderboard: any[];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get('/api/leaderboard')
      .subscribe((leaderboard: any[]) => this.leaderboard = leaderboard);
  }
}
