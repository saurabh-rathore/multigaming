import { Component, OnInit } from '@angular/core';
import { GameService } from './game.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
  board: any[];
  player: string;

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
    this.gameService.getBoard().subscribe(board => this.board = board);
    this.gameService.getPlayer().subscribe(player => this.player = player);
  }

  move(index: number) {
    this.gameService.move(index);
  }
}
