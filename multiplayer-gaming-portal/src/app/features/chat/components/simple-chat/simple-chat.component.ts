import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatDisplayComponent } from '../chat-display/chat-display.component';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { ChatMessage, ChatService } from '../../services/chat.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-simple-chat',
  standalone: true,
  imports: [CommonModule, ChatDisplayComponent, ChatInputComponent],
  templateUrl: './simple-chat.component.html',
  styleUrls: ['./simple-chat.component.scss']
})
export class SimpleChatComponent implements OnInit {
  @Input() roomId: string = 'default_room'; // Example room ID, should be passed in

  messages: ChatMessage[] = []; // Hold messages locally for this simple component
  isLoading = false;
  error: string | null = null;

  // Conceptual current user - would come from an AuthService
  currentUserId = 'currentUser';
  currentUserDisplayName = 'Me';

  private chatService = inject(ChatService);

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.isLoading = true;
    this.error = null;
    this.chatService.getMockMessages(this.roomId).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = "Failed to load messages.";
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  handleSendMessage(messageText: string): void {
    // This is conceptual as ChatInputComponent is disabled.
    // If it were enabled, this method would be called.
    console.log(`[SimpleChatComponent] Event to send message: "${messageText}" to room ${this.roomId}`);
    this.chatService.sendMessage(this.roomId, messageText, this.currentUserId, this.currentUserDisplayName)
      .subscribe({
        next: (response) => {
          if (response.success && response.message) {
            // Conceptually add to local messages for immediate feedback
            // This is a simplified approach; real-time would update via WebSocket push.
            this.messages = [...this.messages, response.message];
            console.log('[SimpleChatComponent] Mock message sent and added to local display.');
          } else {
            console.error('[SimpleChatComponent] Mock send message failed or no message returned.');
          }
        },
        error: (err) => {
          console.error('[SimpleChatComponent] Error sending message (mocked):', err);
        }
      });
  }
}
