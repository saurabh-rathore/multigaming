import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  username = '';
  password = '';

  constructor(private http: HttpClient) { }

  register() {
    this.http.post('/api/register', { username: this.username, password: this.password })
      .subscribe(response => {
        console.log(response);
      });
  }

  login() {
    this.http.post('/api/login', { username: this.username, password: this.password })
      .subscribe((response: any) => {
        if (response.userId) {
          localStorage.setItem('userId', response.userId);
        }
        console.log(response);
      });
  }
}
