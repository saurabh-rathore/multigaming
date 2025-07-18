import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-bonuses',
  templateUrl: './bonuses.component.html',
  styleUrls: ['./bonuses.component.css']
})
export class BonusesComponent implements OnInit {
  bonuses: any[];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get('/api/bonuses')
      .subscribe((bonuses: any[]) => this.bonuses = bonuses);
  }

  claimBonus(bonusId: number) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.post(`/api/bonuses/${bonusId}/claim`, { userId })
        .subscribe(() => {
          // You might want to update the user's currency balance in the UI
        });
    }
  }
}
