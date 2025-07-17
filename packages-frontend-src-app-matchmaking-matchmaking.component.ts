import { Component, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-matchmaking',
  templateUrl: './matchmaking.component.html',
  styleUrls: ['./matchmaking.component.css']
})
export class MatchmakingComponent implements OnInit {
  inQueue = false;
  matchFound = false;
  opponent: any;
  gameToSpectate = '';
  userLevel: number;

  constructor(private socket: Socket, private http: HttpClient) { }

  ngOnInit(): void {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.get(`/api/profile/${userId}`).subscribe((user: any) => {
        this.userLevel = user.level;
      });
    }

    this.socket.fromEvent('match-found').subscribe((data: any) => {
      this.inQueue = false;
      this.matchFound = true;
      this.opponent = data.opponent;
      this.socket.emit('join-game', data.gameId);
    });
  }

  joinQueue() {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.socket.emit('join-matchmaking', { userId, level: this.userLevel });
      this.inQueue = true;
    }
  }

  spectateGame() {
    this.socket.emit('spectate-game', this.gameToSpectate);
  }
}
