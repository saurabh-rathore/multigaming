import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-replays',
  templateUrl: './replays.component.html',
  styleUrls: ['./replays.component.css']
})
export class ReplaysComponent implements OnInit {
  replays: any[];
  selectedReplay: any;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // For now, we will just fetch all game history to get the replay IDs
    this.http.get('/api/game-history')
      .subscribe((replays: any[]) => this.replays = replays);
  }

  watchReplay(replayId: number) {
    this.http.get(`/api/replays/${replayId}`)
      .subscribe(replay => this.selectedReplay = replay);
  }
}
