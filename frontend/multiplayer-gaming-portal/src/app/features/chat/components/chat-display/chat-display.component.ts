import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ChatMessage } from '../../services/chat.service';

@Component({
  selector: 'app-chat-display',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './chat-display.component.html',
  styleUrls: ['./chat-display.component.scss']
})
export class ChatDisplayComponent {
  @Input() messages: ChatMessage[] = [];
  @Input() currentUserId: string = 'currentUser'; // To style user's own messages
}
