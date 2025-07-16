import { Component, OnInit } from '@angular/core';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-battleship',
  templateUrl: './battleship.component.html',
  styleUrls: ['./battleship.component.css']
})
export class BattleshipComponent implements OnInit {

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
  }

}
