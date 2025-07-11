import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AuthStatus } from '../../models/auth.models';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.scss']
})
export class OtpVerificationComponent implements OnInit, OnDestroy {
  otpForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private phoneForOtp: string | null = null;
  private purpose: 'verification' | 'login_2fa' = 'verification'; // Default purpose

  private subscriptions: Subscription = new Subscription();

  constructor(private authService: AuthService, private router: Router) {
    this.otpForm = new FormGroup({
      otp: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')])
    });
  }

  ngOnInit(): void {
    this.phoneForOtp = this.authService.getTemporaryPhoneForOtp();
    const currentStatus = this.authService.currentAuthStatus;

    if (!this.phoneForOtp) {
      console.warn('OTP Verification: Phone number not found. Redirecting to login.');
      this.router.navigate(['/login']); // Or appropriate fallback
      return;
    }

    if (currentStatus === AuthStatus.OtpRequired) {
      this.purpose = 'login_2fa';
      this.successMessage = `An OTP has been sent to ${this.phoneForOtp} for 2FA.`;
    } else if (currentStatus === AuthStatus.PhoneVerificationRequired) {
      this.purpose = 'verification';
      this.successMessage = `An OTP has been sent to ${this.phoneForOtp} for phone verification.`;
    } else {
        // If status is not right, maybe redirect or show error
        console.warn('OTP Verification: Invalid state. Redirecting.');
        this.router.navigate(['/login']);
        return;
    }

    this.subscriptions.add(this.authService.loading$.subscribe(loading => this.isLoading = loading));
    this.subscriptions.add(this.authService.error$.subscribe(error => {
        this.errorMessage = error;
        if (error) this.successMessage = null;
    }));

    // Clear any previous auth service errors when component loads
    this.authService.clearError();
  }

  get otpControl() {
    return this.otpForm.get('otp');
  }

  onRequestNewOtp(): void {
    if (!this.phoneForOtp) return;
    this.errorMessage = null;
    this.successMessage = null;
    this.authService.requestOtp({ phone: this.phoneForOtp, purpose: this.purpose })
      .subscribe({
        next: (response) => {
          this.successMessage = response.message;
        },
        // Error is handled by the global subscription to authService.error$
      });
  }

  onSubmit(): void {
    if (this.otpForm.invalid || !this.phoneForOtp) {
      this.errorMessage = 'Please enter a valid 6-digit OTP.';
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;
    const otpValue = this.otpForm.value.otp;

    this.authService.verifyOtp({ phone: this.phoneForOtp, otp: otpValue, purpose: this.purpose })
      .subscribe({
        next: (response) => {
          // AuthService will update its state. Based on that, we navigate.
          const newStatus = this.authService.currentAuthStatus;
          if (newStatus === AuthStatus.Authenticated) {
            this.router.navigate(['/']); // Navigate to home/dashboard
          } else if (newStatus === AuthStatus.Unauthenticated && this.purpose === 'verification') {
             // Phone verified after registration, user should now login
            this.router.navigate(['/login'], { queryParams: { message: response.message || 'Phone verified. Please login.' } });
          } else {
            // Handle other cases or stay on page with message
            this.successMessage = response.message;
          }
        },
        // Error is handled by the global subscription to authService.error$
        // error: (err) => { /* this.errorMessage is set by subscription */ }
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
