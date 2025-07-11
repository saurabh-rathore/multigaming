import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserRegistrationRequest, AuthStatus } from '../../models/auth.models';

// Custom validator for password match
export function passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { 'passwordMismatch': true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegistrationComponent implements OnInit, OnDestroy {
  registrationForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  private subscriptions = new Subscription();

  constructor(private authService: AuthService, private router: Router) {
    this.registrationForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      phone: new FormControl('', [Validators.pattern('^\\+?[1-9]\\d{1,14}$')]), // E.164 basic pattern, optional
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: new FormControl('', [Validators.required])
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    this.authService.clearError(); // Clear previous errors

    this.subscriptions.add(this.authService.loading$.subscribe(loading => this.isLoading = loading));
    this.subscriptions.add(this.authService.error$.subscribe(error => {
      this.errorMessage = error;
      if(error) this.successMessage = null;
    }));
    this.subscriptions.add(this.authService.authStatus$.subscribe(status => {
      // If registration leads to PhoneVerificationRequired, navigate to OTP screen
      if (status === AuthStatus.PhoneVerificationRequired) {
        this.router.navigate(['/verify-otp']);
      } else if (status === AuthStatus.Unauthenticated && this.successMessage) {
        // Successfully registered without phone, or phone was optional and not provided.
        // User is not logged in yet. Message already set by register method.
        // Optionally navigate to login after a delay, or let user click.
        // setTimeout(() => this.router.navigate(['/login']), 3000);
      }
    }));
  }

  get emailControl() { return this.registrationForm.get('email'); }
  get phoneControl() { return this.registrationForm.get('phone'); }
  get passwordControl() { return this.registrationForm.get('password'); }
  get confirmPasswordControl() { return this.registrationForm.get('confirmPassword'); }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.errorMessage = "Please correct the errors in the form.";
      this.registrationForm.markAllAsTouched();
      return;
    }
    this.errorMessage = null;
    this.successMessage = null;

    const rawValues = this.registrationForm.value;
    const registrationData: UserRegistrationRequest = {
      email: rawValues.email,
      password: rawValues.password,
      phone: rawValues.phone || undefined // Send undefined if empty, so backend doesn't try to process empty string
    };

    this.authService.register(registrationData).subscribe({
      next: (user) => { // Backend's UserRegistrationResponse is User model
        // Success message and navigation are handled by authStatus$ subscription
        // based on whether phone verification is required or not.
        // AuthService sets a generic success message or error.
        this.successMessage = this.authService.error$.value; // error$ also carries success messages from authService
        if (!this.authService.error$.value) { // If no specific message from authService, set a default.
           this.successMessage = "Registration processing...";
        }
        // If no phone, user is registered but not logged in.
        if (!registrationData.phone) {
          this.successMessage = "Registration successful! Please login.";
           setTimeout(() => {
            if (this.authService.currentAuthStatus === AuthStatus.Unauthenticated) {
                 this.router.navigate(['/login']);
            }
           }, 3000);
        }
        // If phone was provided, authStatus will change to PhoneVerificationRequired and trigger navigation.
      },
      error: (err) => {
        // Error message is handled by subscription to authService.error$
        // if (!this.errorMessage) {
        //   this.errorMessage = err.message || 'Registration failed due to an unexpected error.';
        // }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
