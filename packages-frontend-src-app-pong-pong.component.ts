import { Component, OnInit } from '@angular/core';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-pong',
  templateUrl: './pong.component.html',
  styleUrls: ['./pong.component.css']
})
export class PongComponent implements OnInit {

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
  }

}
