import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { JobService, Job } from '../../../../core/services/job.service';
import {
  UserProfileService,
  UserProfile,
  Resume,
} from '../../../../core/services/user-profile.service';
import { JobApplicationService } from '../../../../core/services/job-application.service';
import { AuthService, User } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-job-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './job-apply.component.html',
  styleUrls: ['./job-apply.component.css'],
})
export class JobApplyComponent implements OnInit, OnDestroy {
  job: Job | null = null;
  userProfile: UserProfile | null = null;
  currentUser: User | null = null;
  applicationForm: FormGroup;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  success: string | null = null;
  selectedResume: File | null = null;
  resumePreview: Resume | null = null;
  showFullForm = false;

  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private jobService: JobService,
    private userProfileService: UserProfileService,
    private jobApplicationService: JobApplicationService,
    private authService: AuthService
  ) {
    this.applicationForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadJobDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Personal Information
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)],
      ],

      // Address
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['United States', Validators.required],

      // Professional
      coverLetter: ['', [Validators.required, Validators.minLength(100)]],

      // Optional fields
      linkedinUrl: [''],
      portfolioUrl: [''],
      githubUrl: [''],
    });
  }

  private loadCurrentUser(): void {
    const userSub = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadUserProfile(user.id);
      }
    });
    this.subscriptions.add(userSub);
  }

  private loadUserProfile(userId: string): void {
    const profileSub = this.userProfileService
      .getUserProfile(userId)
      .subscribe({
        next: (profile) => {
          this.userProfile = profile;
          if (profile) {
            this.populateFormWithProfile(profile);
          }
        },
        error: (error) => {
          console.error('Error loading user profile:', error);
          // Profile doesn't exist yet, that's okay
        },
      });
    this.subscriptions.add(profileSub);
  }

  private loadJobDetails(): void {
    const jobId = this.route.snapshot.paramMap.get('id');
    if (!jobId) {
      this.error = 'Job ID not found';
      return;
    }

    this.isLoading = true;
    const jobSub = this.jobService.getJobById(jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load job details';
        this.isLoading = false;
        console.error('Error loading job:', error);
      },
    });
    this.subscriptions.add(jobSub);
  }

  private populateFormWithProfile(profile: UserProfile): void {
    this.applicationForm.patchValue({
      firstName: profile.personalInfo.firstName,
      lastName: profile.personalInfo.lastName,
      email: profile.personalInfo.email,
      phone: profile.personalInfo.phone,
      street: profile.personalInfo.address.street,
      city: profile.personalInfo.address.city,
      state: profile.personalInfo.address.state,
      zipCode: profile.personalInfo.address.zipCode,
      country: profile.personalInfo.address.country,
      linkedinUrl: profile.personalInfo.linkedinUrl || '',
      portfolioUrl: profile.personalInfo.portfolioUrl || '',
      githubUrl: profile.personalInfo.githubUrl || '',
    });

    if (profile.resume) {
      this.resumePreview = profile.resume;
    }
  }

  onResumeSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.type)) {
        this.error = 'Please upload a PDF or Word document';
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'File size must be less than 5MB';
        return;
      }

      this.selectedResume = file;
      this.error = null;
    }
  }

  onSubmit(): void {
    if (this.applicationForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (!this.selectedResume && !this.resumePreview) {
      this.error = 'Please upload a resume';
      return;
    }

    if (!this.currentUser || !this.job) {
      this.error = 'Missing required information';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    // If new resume is selected, upload it first
    if (this.selectedResume) {
      this.uploadResumeAndSubmit();
    } else {
      this.submitApplication(this.resumePreview!);
    }
  }

  private uploadResumeAndSubmit(): void {
    const uploadSub = this.userProfileService
      .uploadResume(this.selectedResume!)
      .subscribe({
        next: (resume) => {
          this.submitApplication(resume);
        },
        error: (error) => {
          this.error = 'Failed to upload resume';
          this.isSubmitting = false;
          console.error('Resume upload error:', error);
        },
      });
    this.subscriptions.add(uploadSub);
  }

  private submitApplication(resume: Resume): void {
    const formValue = this.applicationForm.value;

    const applicationData = {
      personalInfo: {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        phone: formValue.phone,
        address: {
          street: formValue.street,
          city: formValue.city,
          state: formValue.state,
          zipCode: formValue.zipCode,
          country: formValue.country,
        },
        linkedinUrl: formValue.linkedinUrl,
        portfolioUrl: formValue.portfolioUrl,
        githubUrl: formValue.githubUrl,
      },
      coverLetter: formValue.coverLetter,
      resume: resume,
      additionalDocuments: [],
    };

    const application = {
      jobId: this.job!.id,
      userId: this.currentUser!.id,
      applicationData: applicationData,
      status: 'submitted' as const,
      notes: '',
    };

    const submitSub = this.jobApplicationService
      .submitJobApplication(application)
      .subscribe({
        next: (result) => {
          this.success = 'Application submitted successfully!';
          this.isSubmitting = false;

          // Redirect to job detail page after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/jobs', this.job!.id]);
          }, 2000);
        },
        error: (error) => {
          this.error = 'Failed to submit application. Please try again.';
          this.isSubmitting = false;
          console.error('Application submission error:', error);
        },
      });
    this.subscriptions.add(submitSub);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.applicationForm.controls).forEach((key) => {
      const control = this.applicationForm.get(key);
      control?.markAsTouched();
    });
  }

  goBack(): void {
    if (this.job) {
      this.router.navigate(['/jobs', this.job.id]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  getFieldError(fieldName: string): string | null {
    const field = this.applicationForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['pattern']) return `${fieldName} format is invalid`;
    }
    return null;
  }

  goToProfile(): void {
    this.router.navigate(['/jobseeker/profile']);
  }

  continueWithoutProfile(): void {
    this.showFullForm = true;
  }

  editProfile(): void {
    this.router.navigate(['/jobseeker/profile']);
  }

  getProfileInitials(): string {
    if (this.userProfile) {
      const first = this.userProfile.personalInfo.firstName?.charAt(0) || '';
      const last = this.userProfile.personalInfo.lastName?.charAt(0) || '';
      return (first + last).toUpperCase();
    }
    return 'U';
  }
}
