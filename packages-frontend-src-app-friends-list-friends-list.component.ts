import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-friends-list',
  templateUrl: './friends-list.component.html',
  styleUrls: ['./friends-list.component.css']
})
export class FriendsListComponent implements OnInit {
  friends: any[];
  newFriend = '';
  selectedFriend: any;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.get(`/api/friends/${userId}`)
        .subscribe((friends: any[]) => this.friends = friends);
    }
  }

  addFriend() {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.post('/api/friends', { userId1: userId, userId2: this.newFriend })
        .subscribe(() => {
          this.ngOnInit();
          this.newFriend = '';
        });
    }
  }

  removeFriend(friendId: number) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.delete('/api/friends', { body: { userId1: userId, userId2: friendId } })
        .subscribe(() => this.ngOnInit());
    }
  }

  openPrivateChat(friend: any) {
    this.selectedFriend = friend;
  }
}
