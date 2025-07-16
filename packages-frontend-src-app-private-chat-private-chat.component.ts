import { Component, OnInit, Input } from '@angular/core';
import { Socket } from 'ngx-socket-io';

@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.css']
})
export class PrivateChatComponent implements OnInit {
  @Input() friend: any;
  messages: string[] = [];
  message = '';

  constructor(private socket: Socket) { }

  ngOnInit(): void {
    this.socket.fromEvent<string>('private-message').subscribe(message => {
      this.messages.push(message);
    });
  }

  sendMessage() {
    const receiverId = this.friend.id;
    this.socket.emit('private-message', { receiverId, message: this.message });
    this.message = '';
  }
}
