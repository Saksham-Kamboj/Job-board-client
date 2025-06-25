import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  JobManagementService,
  Job,
} from '../../../../core/services/job-management.service';
import { AuthService, User } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-job-post',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './job-post.component.html',
  styleUrls: ['./job-post.component.css'],
})
export class JobPostComponent implements OnInit, OnDestroy {
  jobForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  success: string | null = null;

  // Form options
  jobTypes = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'remote', label: 'Remote' },
  ];

  experienceLevels = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'executive', label: 'Executive' },
  ];

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private jobManagementService: JobManagementService,
    private authService: AuthService
  ) {
    this.jobForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadCurrentUser(): void {
    const userSub = this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user && user.role === 'company') {
          // Pre-fill company information for company users
          const companyUser = user as any;
          this.jobForm.patchValue({
            company:
              companyUser.companyName || `${user.firstName} ${user.lastName}`,
            contactEmail: user.email,
            companyDescription: companyUser.companyDescription || '',
            location: companyUser.location || '', // Pre-fill location if available
          });
        }
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.error = 'Failed to load user information';
      },
    });
    this.subscriptions.add(userSub);
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Basic Information
      title: ['', [Validators.required, Validators.minLength(3)]],
      company: ['', [Validators.required, Validators.minLength(2)]],
      location: ['', [Validators.required, Validators.minLength(3)]],
      type: ['full-time', Validators.required],
      salary: ['', Validators.required],
      experienceLevel: ['mid', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],

      // Detailed Information
      description: ['', [Validators.required, Validators.minLength(100)]],
      companyDescription: ['', [Validators.required, Validators.minLength(50)]],

      // Application Details
      applicationDeadline: ['', Validators.required],

      // Arrays
      requirements: this.fb.array([this.fb.control('', Validators.required)]),
      benefits: this.fb.array([this.fb.control('', Validators.required)]),
      skills: this.fb.array([this.fb.control('', Validators.required)]),

      // Status
      isActive: [true],
      featured: [false],
    });
  }

  // FormArray getters
  get requirements(): FormArray {
    return this.jobForm.get('requirements') as FormArray;
  }

  get benefits(): FormArray {
    return this.jobForm.get('benefits') as FormArray;
  }

  get skills(): FormArray {
    return this.jobForm.get('skills') as FormArray;
  }

  // Add/Remove methods for arrays
  addRequirement(): void {
    this.requirements.push(this.fb.control('', Validators.required));
  }

  removeRequirement(index: number): void {
    if (this.requirements.length > 1) {
      this.requirements.removeAt(index);
    }
  }

  addBenefit(): void {
    this.benefits.push(this.fb.control('', Validators.required));
  }

  removeBenefit(index: number): void {
    if (this.benefits.length > 1) {
      this.benefits.removeAt(index);
    }
  }

  addSkill(): void {
    this.skills.push(this.fb.control('', Validators.required));
  }

  removeSkill(index: number): void {
    if (this.skills.length > 1) {
      this.skills.removeAt(index);
    }
  }

  onSubmit(): void {
    if (this.jobForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (!this.currentUser) {
      this.error = 'User information not available';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const formValue = this.jobForm.value;
    const jobData: Partial<Job> = {
      title: formValue.title,
      company: formValue.company,
      location: formValue.location,
      type: formValue.type,
      salary: formValue.salary,
      description: formValue.description,
      requirements: formValue.requirements.filter((req: string) => req.trim()),
      benefits: formValue.benefits.filter((benefit: string) => benefit.trim()),
      skills: formValue.skills.filter((skill: string) => skill.trim()),
      experienceLevel: formValue.experienceLevel,
      contactEmail: formValue.contactEmail,
      companyDescription: formValue.companyDescription,
      applicationDeadline: formValue.applicationDeadline,
      isActive: formValue.isActive,
      featured: formValue.featured,
      postedDate: new Date().toISOString().split('T')[0],
      applicationCount: 0,
      companyId: this.currentUser.id,
    };

    const createSub = this.jobManagementService.createJob(jobData).subscribe({
      next: (result) => {
        this.success = 'Job posted successfully!';
        this.isSubmitting = false;

        // Redirect after 2 seconds
        setTimeout(() => {
          if (this.currentUser?.role === 'admin') {
            this.router.navigate(['/admin/jobs']);
          } else {
            this.router.navigate(['/jobs', result.id]);
          }
        }, 2000);
      },
      error: (error) => {
        this.error = 'Failed to post job. Please try again.';
        this.isSubmitting = false;
        console.error('Job posting error:', error);
      },
    });
    this.subscriptions.add(createSub);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.jobForm.controls).forEach((key) => {
      const control = this.jobForm.get(key);
      if (control instanceof FormArray) {
        control.controls.forEach((arrayControl) => {
          arrayControl.markAsTouched();
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.jobForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} is too short`;
    }
    return null;
  }

  getArrayFieldError(arrayName: string, index: number): string | null {
    const array = this.jobForm.get(arrayName) as FormArray;
    const field = array.at(index);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'This field is required';
    }
    return null;
  }

  goBack(): void {
    if (this.currentUser?.role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  // Set minimum date for application deadline (today)
  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
