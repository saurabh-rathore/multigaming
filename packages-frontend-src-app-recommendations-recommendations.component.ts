import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-recommendations',
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.css']
})
export class RecommendationsComponent implements OnInit {
  recommendations: any;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // This will not work until the backend is fixed
    // this.http.get('/api/recommendations')
    //   .subscribe(recommendations => this.recommendations = recommendations);
  }
}
