import { Component, OnInit } from '@angular/core';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-snake',
  templateUrl: './snake.component.html',
  styleUrls: ['./snake.component.css']
})
export class SnakeComponent implements OnInit {

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
  }

}
