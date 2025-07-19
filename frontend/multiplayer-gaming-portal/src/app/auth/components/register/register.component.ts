import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // For ngModel
import { CommonModule } from '@angular/common'; // For *ngIf
import { Router } from '@angular/router';
import { AuthService, RegistrationData } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegistrationComponent {
  registrationData: RegistrationData = { email: '', password: '', phone: '' };
  confirmPassword = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  passwordsMatch(): boolean {
    return this.registrationData.password === this.confirmPassword;
  }

  onSubmit(): void {
    if (!this.registrationData.email || !this.registrationData.password || !this.confirmPassword) {
      this.errorMessage = "All fields are required.";
      return;
    }
    if (!this.passwordsMatch()) {
      this.errorMessage = "Passwords do not match.";
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    console.log('Registration form submitted with:', this.registrationData);

    this.authService.register(this.registrationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message + (response.userId ? ` (User ID: ${response.userId})` : '');
        console.log('Registration successful (component):', response);
        // Optionally clear form or navigate after a delay
        // this.registrationData = { email: '', password: '', phone: '' };
        // this.confirmPassword = '';
        // setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Registration failed. Please try again.';
        console.error('Registration error (component):', err);
      }
    });
  }
}
