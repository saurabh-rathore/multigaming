import { Component, OnInit, OnDestroy } from '@angular/core';
import { GameService } from './game.service';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  board: any[];
  player: string;
  isSpectator = false;
  timer: Subscription;
  timeLeft = 10;

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
    this.gameService.getBoard().subscribe(board => this.board = board);
    this.gameService.getPlayer().subscribe(player => {
      this.player = player;
      if (!player) {
        this.isSpectator = true;
      }
      this.startTimer();
    });
  }

  ngOnDestroy(): void {
    if (this.timer) {
      this.timer.unsubscribe();
    }
  }

  startTimer() {
    this.timeLeft = 10;
    if (this.timer) {
      this.timer.unsubscribe();
    }
    this.timer = timer(1000, 1000).subscribe(() => {
      this.timeLeft--;
      if (this.timeLeft === 0) {
        // Handle timeout
      }
    });
  }

  move(index: number) {
    if (!this.isSpectator) {
      this.gameService.move(index);
      this.startTimer();
    }
  }
}
