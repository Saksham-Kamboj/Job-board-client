import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterRequest } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent implements OnInit {
  signupForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        role: ['job-seeker', [Validators.required]],
        agreeToTerms: [false, [Validators.requiredTrue]],
        // Company-specific fields
        companyName: [''],
        companyDescription: [''],
        companyWebsite: [''],
        companySize: [''],
        industry: [''],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  ngOnInit(): void {}

  // Custom validator for password confirmation
  passwordMatchValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value
      ? null
      : { passwordMismatch: true };
  }

  get firstName() {
    return this.signupForm.get('firstName');
  }
  get lastName() {
    return this.signupForm.get('lastName');
  }
  get email() {
    return this.signupForm.get('email');
  }
  get password() {
    return this.signupForm.get('password');
  }
  get confirmPassword() {
    return this.signupForm.get('confirmPassword');
  }
  get role() {
    return this.signupForm.get('role');
  }
  get agreeToTerms() {
    return this.signupForm.get('agreeToTerms');
  }
  get companyName() {
    return this.signupForm.get('companyName');
  }
  get companyDescription() {
    return this.signupForm.get('companyDescription');
  }
  get companyWebsite() {
    return this.signupForm.get('companyWebsite');
  }
  get companySize() {
    return this.signupForm.get('companySize');
  }
  get industry() {
    return this.signupForm.get('industry');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const registerRequest: RegisterRequest = {
        firstName: this.signupForm.value.firstName,
        lastName: this.signupForm.value.lastName,
        email: this.signupForm.value.email,
        password: this.signupForm.value.password,
        role: this.signupForm.value.role,
        // Include company fields if role is company
        ...(this.signupForm.value.role === 'company' && {
          companyName: this.signupForm.value.companyName,
          companyDescription: this.signupForm.value.companyDescription,
          companyWebsite: this.signupForm.value.companyWebsite,
          companySize: this.signupForm.value.companySize,
          industry: this.signupForm.value.industry,
        }),
      };

      this.authService.register(registerRequest).subscribe({
        next: (response) => {
          this.isLoading = false;

          // Redirect based on user role
          if (response.user.role === 'company') {
            this.router.navigate(['/company/dashboard']);
          } else {
            this.router.navigate(['/jobseeker/dashboard']);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            error.message || 'Registration failed. Please try again.';
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach((key) => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.signupForm.get(fieldName);
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
      if (field.errors['requiredTrue']) {
        return 'You must agree to the terms and conditions';
      }
    }

    // Check for password mismatch
    if (
      fieldName === 'confirmPassword' &&
      this.signupForm.errors?.['passwordMismatch'] &&
      field?.touched
    ) {
      return 'Passwords do not match';
    }

    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      role: 'Role',
      agreeToTerms: 'Terms agreement',
      companyName: 'Company name',
      companyDescription: 'Company description',
      companyWebsite: 'Company website',
      companySize: 'Company size',
      industry: 'Industry',
    };
    return displayNames[fieldName] || fieldName;
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    const hasFieldError = !!(field?.errors && field?.touched);

    // Special case for confirm password
    if (fieldName === 'confirmPassword') {
      return (
        hasFieldError ||
        (this.signupForm.errors?.['passwordMismatch'] && field?.touched)
      );
    }

    return hasFieldError;
  }

  onRoleChange(role: 'job-seeker' | 'company'): void {
    this.signupForm.patchValue({ role });

    // Add/remove validators based on role
    if (role === 'company') {
      this.companyName?.setValidators([
        Validators.required,
        Validators.minLength(2),
      ]);
      this.companyWebsite?.setValidators([
        Validators.pattern(/^https?:\/\/.+/),
      ]);
      this.companySize?.setValidators([Validators.required]);
      this.industry?.setValidators([Validators.required]);
    } else {
      this.companyName?.clearValidators();
      this.companyWebsite?.clearValidators();
      this.companySize?.clearValidators();
      this.industry?.clearValidators();
      this.companyDescription?.clearValidators();
    }

    // Update validation status
    this.companyName?.updateValueAndValidity();
    this.companyWebsite?.updateValueAndValidity();
    this.companySize?.updateValueAndValidity();
    this.industry?.updateValueAndValidity();
    this.companyDescription?.updateValueAndValidity();
  }
}
