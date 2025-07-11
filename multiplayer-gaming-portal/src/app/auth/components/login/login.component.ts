import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms'; // For Reactive Forms
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router'; // Added ActivatedRoute
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserLoginRequest, AuthStatus } from '../../models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule], // Added ReactiveFormsModule
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null; // For messages like "Phone verified"
  isLoading = false;

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute // For query params
  ) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required])
    });
  }

  ngOnInit(): void {
    // Clear any existing auth errors when the component loads
    this.authService.clearError();

    this.subscriptions.add(this.authService.loading$.subscribe(loading => this.isLoading = loading));
    this.subscriptions.add(this.authService.error$.subscribe(error => {
      this.errorMessage = error;
      if (error) this.successMessage = null; // Clear success message if new error
    }));
    this.subscriptions.add(this.authService.authStatus$.subscribe(status => {
      if (status === AuthStatus.Authenticated) {
        this.router.navigate(['/']); // Or to a dashboard/home page
      } else if (status === AuthStatus.OtpRequired) {
        this.router.navigate(['/verify-otp']);
      }
    }));

    // Check for success messages from query params (e.g., after phone verification)
    this.route.queryParams.subscribe(params => {
        if (params['message']) {
            this.successMessage = params['message'];
        }
    });
  }

  get emailControl() { return this.loginForm.get('email'); }
  get passwordControl() { return this.loginForm.get('password'); }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.errorMessage = "Please enter a valid email and password.";
      this.loginForm.markAllAsTouched(); // Mark fields as touched to show validation errors
      return;
    }
    this.errorMessage = null;
    this.successMessage = null; // Clear previous success messages

    const credentials: UserLoginRequest = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    // AuthService's login method will now handle setting loading state
    // and authStatus updates, which this component subscribes to.
    this.authService.login(credentials).subscribe({
      // Next and error are primarily handled by subscriptions to authStatus$ and error$
      // We might only need to handle specific component logic here if any.
      // For example, if login directly returns an error that isn't globally set:
      error: (err) => {
         // This error might already be set by authService.error$, but if not:
        if (!this.errorMessage) {
            this.errorMessage = err.message || 'Login failed due to an unexpected error.';
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
