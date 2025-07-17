import { Component, OnInit, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-clicker',
  templateUrl: './clicker.component.html',
  styleUrls: ['./clicker.component.css']
})
export class ClickerComponent implements OnInit, OnDestroy {
  score = 0;
  timer: Subscription;
  timeLeft = 30;

  constructor(private socket: Socket) { }

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      this.timer.unsubscribe();
    }
  }

  startTimer() {
    this.timeLeft = 30;
    if (this.timer) {
      this.timer.unsubscribe();
    }
    this.timer = timer(1000, 1000).subscribe(() => {
      this.timeLeft--;
      if (this.timeLeft === 0) {
        this.socket.emit('game-over', { score: this.score });
      }
    });
  }

  click() {
    if (this.timeLeft > 0) {
      this.score++;
    }
  }
}
