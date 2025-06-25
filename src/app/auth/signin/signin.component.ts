import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService, LoginRequest } from '../../core/services/auth.service';

@Component({
  selector: 'app-signin',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.css',
})
export class SigninComponent implements OnInit {
  signinForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.signinForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    // Get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  get email() {
    return this.signinForm.get('email');
  }
  get password() {
    return this.signinForm.get('password');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.signinForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const loginRequest: LoginRequest = {
        email: this.signinForm.value.email,
        password: this.signinForm.value.password,
      };

      this.authService.login(loginRequest).subscribe({
        next: (response) => {
          this.isLoading = false;

          // Redirect based on user role
          if (response.user.role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else if (response.user.role === 'company') {
            this.router.navigate(['/company/dashboard']);
          } else {
            this.router.navigate(['/jobseeker/dashboard']);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            error.message || 'Login failed. Please try again.';
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signinForm.controls).forEach((key) => {
      const control = this.signinForm.get(key);
      control?.markAsTouched();
    });
  }

  // Demo login methods - Updated to match db.json credentials
  loginAsJobSeeker(): void {
    this.signinForm.patchValue({
      email: 'jobseeker@demo.com',
      password: 'password123',
    });
    this.onSubmit();
  }

  loginAsCompany(): void {
    this.signinForm.patchValue({
      email: 'company@demo.com',
      password: 'Company@123',
    });
    this.onSubmit();
  }

  loginAsAdmin(): void {
    this.signinForm.patchValue({
      email: 'admin@demo.com',
      password: 'Admin@123',
    });
    this.onSubmit();
  }

  getFieldError(fieldName: string): string {
    const field = this.signinForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${
          field.errors['minlength'].requiredLength
        } characters`;
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      email: 'Email',
      password: 'Password',
    };
    return displayNames[fieldName] || fieldName;
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.signinForm.get(fieldName);
    return !!(field?.errors && field?.touched);
  }
}
