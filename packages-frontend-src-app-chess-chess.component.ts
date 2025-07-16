import { Component, OnInit } from '@angular/core';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-chess',
  templateUrl: './chess.component.html',
  styleUrls: ['./chess.component.css']
})
export class ChessComponent implements OnInit {
  board: any[];
  player: string;

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
    // This will need to be updated to use a chess-specific service
    this.gameService.getBoard().subscribe(board => this.board = board);
    this.gameService.getPlayer().subscribe(player => this.player = player);
  }

  move(index: number) {
    // This will need to be updated to use a chess-specific service
    this.gameService.move(index);
  }
}
