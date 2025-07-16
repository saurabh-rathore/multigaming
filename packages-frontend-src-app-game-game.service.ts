import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  constructor(private socket: Socket) { }

  getBoard(): Observable<any[]> {
    return this.socket.fromEvent<any[]>('board-state');
  }

  getPlayer(): Observable<string> {
    return this.socket.fromEvent<string>('player-assignment');
  }

  move(index: number) {
    this.socket.emit('move', { index });
  }
}
