import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.scss']
})
export class ChatInputComponent {
  messageText: string = '';
  @Output() messageSent = new EventEmitter<string>();

  // isDisabled is true because this is a placeholder UI
  isDisabled: boolean = true;

  constructor() {}

  sendMessage(): void {
    if (this.isDisabled) {
        console.log('[ChatInputComponent] Input is disabled (placeholder UI).');
        return;
    }
    if (this.messageText.trim()) {
      this.messageSent.emit(this.messageText.trim());
      this.messageText = ''; // Clear input after sending
    }
  }
}
