import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.get(`/api/profile/${userId}`)
        .subscribe(user => this.user = user);
    }
  }

  purchasePremium() {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.post('/api/premium/purchase', { userId })
        .subscribe(() => this.ngOnInit());
    }
  }
}
