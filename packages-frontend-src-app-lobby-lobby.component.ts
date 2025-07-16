import { Component, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css']
})
export class LobbyComponent implements OnInit {
  lobbyId: string;
  opponent: any;
  inLobby = false;

  constructor(private socket: Socket) { }

  ngOnInit(): void {
    this.socket.fromEvent('match-found').subscribe((data: any) => {
      this.lobbyId = data.lobbyId;
      this.opponent = data.opponent;
      this.inLobby = true;
    });
  }
}
