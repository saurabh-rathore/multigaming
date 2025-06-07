import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router'; // Import RouterLink for navigation

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive], // Import RouterLink
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  // Placeholder for user authentication status - would be driven by a service
  isLoggedIn = false;
  username = 'Player123'; // Placeholder

  constructor() { }

  // Placeholder for logout function
  logout(): void {
    this.isLoggedIn = false;
    // In a real app, call an auth service and navigate to login
    console.log('User logged out (placeholder)');
  }
}
