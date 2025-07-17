import { Component, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';

@Component({
  selector: 'app-global-chat',
  templateUrl: './global-chat.component.html',
  styleUrls: ['./global-chat.component.css']
})
export class GlobalChatComponent implements OnInit {
  messages: string[] = [];
  message = '';

  constructor(private socket: Socket) { }

  ngOnInit(): void {
    this.socket.fromEvent<string>('global-message').subscribe(message => {
      this.messages.push(message);
    });
  }

  sendMessage() {
    this.socket.emit('global-message', this.message);
    this.message = '';
  }
}
