import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-guilds',
  templateUrl: './guilds.component.html',
  styleUrls: ['./guilds.component.css']
})
export class GuildsComponent implements OnInit {
  guilds: any[];
  newGuildName = '';
  newGuildDescription = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get('/api/guilds')
      .subscribe((guilds: any[]) => this.guilds = guilds);
  }

  createGuild() {
    this.http.post('/api/guilds', { name: this.newGuildName, description: this.newGuildDescription })
      .subscribe(() => {
        this.ngOnInit();
        this.newGuildName = '';
        this.newGuildDescription = '';
      });
  }

  joinGuild(guildId: number) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.post(`/api/guilds/${guildId}/join`, { userId })
        .subscribe(() => {
          // You might want to update the UI to show that the user has joined the guild
        });
    }
  }
}
