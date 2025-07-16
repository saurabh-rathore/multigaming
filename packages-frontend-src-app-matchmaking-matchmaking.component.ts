import { Component, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';

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

  constructor(private socket: Socket) { }

  ngOnInit(): void {
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
      this.socket.emit('join-matchmaking', userId);
      this.inQueue = true;
    }
  }

  spectateGame() {
    this.socket.emit('spectate-game', this.gameToSpectate);
  }
}
