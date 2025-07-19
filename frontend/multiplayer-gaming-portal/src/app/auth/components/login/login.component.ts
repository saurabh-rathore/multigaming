import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // For ngModel (template-driven forms)
import { CommonModule } from '@angular/common'; // For *ngIf, *ngFor, etc.
import { Router } from '@angular/router';
import { AuthService, UserCredentials } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule], // CommonModule for directives, FormsModule for ngModel
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials: UserCredentials = { email: '', password: '' };
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = "Email and password are required.";
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    console.log('Login form submitted with:', this.credentials);

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Login successful (component):', response);
        // In a real app: store token, update auth state, navigate to dashboard/home
        // For now, just navigate to a conceptual home
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Login failed. Please try again.';
        console.error('Login error (component):', err);
      }
    });
  }
}
