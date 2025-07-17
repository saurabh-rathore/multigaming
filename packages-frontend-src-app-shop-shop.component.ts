import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css']
})
export class ShopComponent implements OnInit {
  items: any[];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get('/api/items')
      .subscribe((items: any[]) => this.items = items);
  }

  purchaseItem(itemId: number) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.post(`/api/items/${itemId}/purchase`, { userId })
        .subscribe(() => {
          // You might want to update the user's currency balance in the UI
        });
    }
  }
}
