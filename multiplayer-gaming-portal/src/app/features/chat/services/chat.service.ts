import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface ChatMessage {
  messageId: string;
  roomId: string; // To which room/context this message belongs
  userId: string;
  displayName: string;
  text: string;
  timestamp: Date | string;
  isOwnMessage?: boolean; // For UI styling if it's current user's message
}

// Mock messages for a couple of conceptual rooms
const MOCK_MESSAGES: ChatMessage[] = [
  { messageId: 'msg1', roomId: 'room_ludo_123', userId: 'userA', displayName: 'AliceGamer', text: 'Hey everyone! Good luck!', timestamp: new Date(Date.now() - 5 * 60000), isOwnMessage: false },
  { messageId: 'msg2', roomId: 'room_ludo_123', userId: 'userB', displayName: 'BobTheBrave', text: 'You too Alice!', timestamp: new Date(Date.now() - 4 * 60000), isOwnMessage: false },
  { messageId: 'msg3', roomId: 'room_ludo_123', userId: 'currentUser', displayName: 'Me', text: 'Thanks! Ready to play.', timestamp: new Date(Date.now() - 3 * 60000), isOwnMessage: true },
  { messageId: 'msg4', roomId: 'room_rummy_456', userId: 'userC', displayName: 'CharliePlays', text: 'Anyone up for another round of Rummy?', timestamp: new Date(Date.now() - 10 * 60000), isOwnMessage: false },
];

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor() {}

  // Fetches initial/historical messages for a room
  getMockMessages(roomId: string): Observable<ChatMessage[]> {
    console.log(`[ChatService] Fetching mock messages for room: ${roomId}`);
    const roomMessages = MOCK_MESSAGES.filter(m => m.roomId === roomId);
    return of(roomMessages).pipe(delay(100));
  }

  // Simulates sending a message
  sendMessage(roomId: string, messageText: string, currentUserId: string, currentUserDisplayName: string): Observable<{ success: boolean, message?: ChatMessage }> {
    console.log(`[ChatService] User ${currentUserId} attempting to send message "${messageText}" to room ${roomId} (mocked).`);
    // In a real app, this would send to a WebSocket server.
    // Here, we just log it and could conceptually add it to a local array for immediate display (not done here for simplicity).
    const newMessage: ChatMessage = {
        messageId: `msg_${Date.now()}`,
        roomId,
        userId: currentUserId,
        displayName: currentUserDisplayName,
        text: messageText,
        timestamp: new Date(),
        isOwnMessage: true
    };
    // Conceptually, one might push this to an BehaviorSubject if messages were live in this service.
    // MOCK_MESSAGES.push(newMessage); // For demo only, would make getMockMessages behavior change over time

    return of({ success: true, message: newMessage }).pipe(delay(50));
  }
}
