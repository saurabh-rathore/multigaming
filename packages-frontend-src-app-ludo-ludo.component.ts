import { Component, OnInit } from '@angular/core';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-ludo',
  templateUrl: './ludo.component.html',
  styleUrls: ['./ludo.component.css']
})
export class LudoComponent implements OnInit {

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
  }

}
