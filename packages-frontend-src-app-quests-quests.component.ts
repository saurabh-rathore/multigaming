import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-quests',
  templateUrl: './quests.component.html',
  styleUrls: ['./quests.component.css']
})
export class QuestsComponent implements OnInit {
  quests: any[];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.get(`/api/quests/${userId}`)
        .subscribe((quests: any[]) => this.quests = quests);
    }
  }

  completeQuest(questId: number) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.post(`/api/quests/${questId}/complete`, { userId })
        .subscribe(() => this.ngOnInit());
    }
  }
}
