import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface Friend {
  userId: string;
  displayName: string;
  isOnline: boolean;
  avatarUrl?: string; // Placeholder for avatar image path
  lastSeen?: string; // e.g., "Online", "Away", "Offline", "Last seen 2 hours ago"
}

// Mock data for friends
const MOCK_FRIENDS: Friend[] = [
  { userId: 'friend_001', displayName: 'AliceGamer', isOnline: true, avatarUrl: 'assets/images/avatars/avatar1.png', lastSeen: 'Online' },
  { userId: 'friend_002', displayName: 'BobTheBrave', isOnline: false, avatarUrl: 'assets/images/avatars/avatar2.png', lastSeen: 'Last seen 3 hours ago' },
  { userId: 'friend_003', displayName: 'CharliePlays', isOnline: true, avatarUrl: 'assets/images/avatars/avatar3.png', lastSeen: 'Online' },
  { userId: 'friend_004', displayName: 'DianaDuelist', isOnline: false, avatarUrl: 'assets/images/avatars/avatar4.png', lastSeen: 'Offline' },
  { userId: 'friend_005', displayName: 'EvanExpert', isOnline: true, avatarUrl: 'assets/images/avatars/avatar5.png', lastSeen: 'Away' },
];

@Injectable({
  providedIn: 'root'
})
export class FriendService {

  constructor() {}

  getFriends(): Observable<Friend[]> {
    console.log('[FriendService] Fetching friends list (mocked)...');
    return of(MOCK_FRIENDS).pipe(delay(300)); // Simulate network delay
  }

  sendGameInvite(friendId: string, gameId: string, gameName?: string): Observable<{success: boolean, message: string}> {
    const friend = MOCK_FRIENDS.find(f => f.userId === friendId);
    if (!friend) {
      return of({ success: false, message: `Friend with ID ${friendId} not found.` }).pipe(delay(100));
    }
    if (!friend.isOnline) {
      // Could still allow sending to offline users (they get it later)
      // For this simulation, let's say invite only if online for simplicity of immediate feedback
      // return of({ success: false, message: `${friend.displayName} is offline. Invite cannot be sent.` }).pipe(delay(100));
       console.log(`[FriendService] Conceptual invite sent to offline friend ${friend.displayName} for game ${gameName || gameId} (mocked).`);
       return of({ success: true, message: `Game invite conceptually sent to ${friend.displayName} for ${gameName || gameId}! (They'll see it next time they are online)` }).pipe(delay(200));
    }

    console.log(`[FriendService] Sending game invite to ${friend.displayName} (ID: ${friendId}) for game ${gameName || gameId} (mocked).`);
    // In a real app, this would make an API call to a backend service,
    // which might then use WebSockets to notify the invited user.
    return of({ success: true, message: `Game invite sent to ${friend.displayName} for ${gameName || gameId}!` }).pipe(delay(200));
  }
}
