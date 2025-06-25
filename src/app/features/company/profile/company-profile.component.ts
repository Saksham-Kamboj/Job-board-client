import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';
import {
  ProfileService,
  UserProfile,
} from '../../../core/services/profile.service';
import { JobManagementService } from '../../../core/services/job-management.service';

@Component({
  selector: 'app-company-profile',
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TitleCasePipe],
})
export class CompanyProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userProfile: UserProfile | null = null;

  // Form controls
  profileForm: FormGroup;
  companyForm: FormGroup;

  // UI state
  activeSection = 'personal';
  isEditingProfile = false;
  isEditingCompany = false;
  isLoading = false;
  profileUpdateSuccess = false;
  errorMessage = '';
  successMessage = '';

  // Company data
  companyJobs: any[] = [];
  jobApplications: any[] = [];
  filteredApplications: any[] = [];
  applicationSearchQuery = '';
  selectedApplicationStatus = '';

  private authSubscription: Subscription = new Subscription();

  // Profile sections for company
  profileSections = [
    {
      id: 'personal',
      title: 'Company Information',
      icon: 'building',
      description: 'Manage company details and contact information',
    },
    {
      id: 'jobs',
      title: 'Job Postings',
      icon: 'briefcase',
      description: 'Manage your job listings',
    },
    {
      id: 'applications',
      title: 'Applications',
      icon: 'users',
      description: 'Review job applications',
    },
    {
      id: 'preferences',
      title: 'Preferences',
      icon: 'settings',
      description: 'Customize your experience',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: ProfileService,
    private jobManagementService: JobManagementService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      linkedinUrl: [''],
      portfolioUrl: [''],
      githubUrl: [''],
      street: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      country: ['United States'],
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      companyDescription: [''],
      companyWebsite: [''],
      companySize: [''],
      industry: [''],
    });

    this.companyForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      companyDescription: [''],
      companyWebsite: [''],
      companySize: [''],
      industry: [''],
    });
  }

  ngOnInit() {
    // Subscribe to query parameters to handle tab changes
    this.authSubscription.add(
      this.route.queryParams.subscribe((params) => {
        const tab = params['tab'];
        if (tab && this.profileSections.some((section) => section.id === tab)) {
          this.activeSection = tab;
        } else {
          // Default to first section if no valid tab parameter
          this.activeSection = this.profileSections[0].id;
        }
      })
    );

    // Subscribe to authentication state
    this.authSubscription.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
        if (user && user.role === 'company') {
          this.loadUserProfile();
          this.loadCompanyData();
          this.loadCompanyJobs();
        }
      })
    );
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }

  // Helper methods for profile header
  getUserInitials(): string {
    if (this.currentUser) {
      const first = this.currentUser.firstName?.charAt(0) || '';
      const last = this.currentUser.lastName?.charAt(0) || '';
      return (first + last).toUpperCase();
    }
    return 'U';
  }

  getUserFullName(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName || ''} ${
        this.currentUser.lastName || ''
      }`.trim();
    }
    return 'User';
  }

  getRoleDisplayName(): string {
    return 'Company';
  }

  setActiveSection(sectionId: string) {
    this.activeSection = sectionId;
    this.isEditingProfile = false;
    this.isEditingCompany = false;
    this.clearMessages();

    // Update URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: sectionId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  loadUserProfile() {
    if (this.currentUser) {
      this.isLoading = true;
      this.authSubscription.add(
        this.profileService.getUserProfile(this.currentUser.id).subscribe({
          next: (profile) => {
            this.userProfile = profile;
            this.populateProfileForm();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading user profile:', error);
            this.isLoading = false;
            this.populateProfileForm();
          },
        })
      );
    }
  }

  loadCompanyData() {
    if (this.currentUser) {
      this.companyForm.patchValue({
        companyName: this.currentUser.companyName || '',
        companyDescription: this.currentUser.companyDescription || '',
        companyWebsite: this.currentUser.companyWebsite || '',
        companySize: this.currentUser.companySize || '',
        industry: this.currentUser.industry || '',
      });
    }
  }

  loadCompanyJobs() {
    if (this.currentUser?.role === 'company') {
      this.isLoading = true;

      const companyName =
        this.currentUser.companyName ||
        this.currentUser.firstName + ' ' + this.currentUser.lastName;

      this.authSubscription.add(
        this.jobManagementService.getJobs().subscribe({
          next: (jobs) => {
            this.companyJobs = jobs.filter(
              (job) =>
                job.company === companyName ||
                job.companyId === this.currentUser?.id ||
                job.company === this.currentUser?.companyName
            );
            this.isLoading = false;
            this.loadJobApplications();
          },
          error: (error) => {
            console.error('Error loading company jobs:', error);
            this.isLoading = false;
            this.companyJobs = [];
          },
        })
      );
    }
  }

  loadJobApplications() {
    if (this.currentUser?.role === 'company' && this.companyJobs.length > 0) {
      this.authSubscription.add(
        this.jobManagementService
          .getApplicationsByCompany(this.companyJobs)
          .subscribe({
            next: (applications) => {
              this.jobApplications = applications;
              this.filteredApplications = [...applications];
            },
            error: (error) => {
              console.error('Error loading job applications:', error);
              this.jobApplications = [];
              this.filteredApplications = [];
            },
          })
      );
    }
  }

  populateProfileForm() {
    if (this.currentUser) {
      this.profileForm.patchValue({
        firstName:
          this.userProfile?.personalInfo?.firstName ||
          this.currentUser.firstName ||
          '',
        lastName:
          this.userProfile?.personalInfo?.lastName ||
          this.currentUser.lastName ||
          '',
        email:
          this.userProfile?.personalInfo?.email || this.currentUser.email || '',
        phone: this.userProfile?.personalInfo?.phone || '',
        linkedinUrl: this.userProfile?.personalInfo?.linkedinUrl || '',
        portfolioUrl: this.userProfile?.personalInfo?.portfolioUrl || '',
        githubUrl: this.userProfile?.personalInfo?.githubUrl || '',
        street: this.userProfile?.personalInfo?.address?.street || '',
        city: this.userProfile?.personalInfo?.address?.city || '',
        state: this.userProfile?.personalInfo?.address?.state || '',
        zipCode: this.userProfile?.personalInfo?.address?.zipCode || '',
        country:
          this.userProfile?.personalInfo?.address?.country || 'United States',
        companyName: this.currentUser.companyName || '',
        companyDescription: this.currentUser.companyDescription || '',
        companyWebsite: this.currentUser.companyWebsite || '',
        companySize: this.currentUser.companySize || '',
        industry: this.currentUser.industry || '',
      });
    }
  }

  toggleEditProfile() {
    this.isEditingProfile = !this.isEditingProfile;
    if (!this.isEditingProfile) {
      this.populateProfileForm();
    }
    this.clearMessages();
  }

  toggleEditCompany() {
    this.isEditingCompany = !this.isEditingCompany;
    if (!this.isEditingCompany) {
      this.loadCompanyData();
    }
    this.clearMessages();
  }

  onProfileSubmit() {
    if (this.profileForm.valid && this.currentUser) {
      this.isLoading = true;
      this.clearMessages();

      const formValue = this.profileForm.value;
      const profileData = {
        userId: this.currentUser.id,
        personalInfo: {
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          email: formValue.email,
          phone: formValue.phone,
          linkedinUrl: formValue.linkedinUrl,
          portfolioUrl: formValue.portfolioUrl,
          githubUrl: formValue.githubUrl,
          address: {
            street: formValue.street,
            city: formValue.city,
            state: formValue.state,
            zipCode: formValue.zipCode,
            country: formValue.country,
          },
        },
        professionalInfo: this.userProfile?.professionalInfo || {
          currentTitle: '',
          yearsOfExperience: 0,
          summary: '',
          skills: [],
          preferredJobTypes: [],
          preferredLocations: [],
          expectedSalary: { min: 0, max: 0, currency: 'USD' },
          jobAlertFrequency: 'weekly',
        },
        education: this.userProfile?.education || [],
        experience: this.userProfile?.experience || [],
        resume: this.userProfile?.resume,
      };

      // Handle profile update/create
      if (this.userProfile) {
        this.authSubscription.add(
          this.profileService.updateUserProfile(profileData).subscribe({
            next: (updatedProfile) => {
              this.userProfile = updatedProfile;
              this.handleCompanyUserUpdate(formValue);
            },
            error: (error) => {
              console.error('Error updating profile:', error);
              this.isLoading = false;
              this.errorMessage = 'Failed to update profile. Please try again.';
              setTimeout(() => {
                this.errorMessage = '';
              }, 5000);
            },
          })
        );
      } else {
        this.authSubscription.add(
          this.profileService.createUserProfile(profileData).subscribe({
            next: (newProfile) => {
              this.userProfile = newProfile;
              this.handleCompanyUserUpdate(formValue);
            },
            error: (error) => {
              console.error('Error creating profile:', error);
              this.isLoading = false;
              this.errorMessage = 'Failed to create profile. Please try again.';
              setTimeout(() => {
                this.errorMessage = '';
              }, 5000);
            },
          })
        );
      }
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  private handleCompanyUserUpdate(formValue: any) {
    const userUpdateData = {
      companyName: formValue.companyName,
      companyDescription: formValue.companyDescription,
      companyWebsite: formValue.companyWebsite,
      companySize: formValue.companySize,
      industry: formValue.industry,
    };

    this.authSubscription.add(
      this.authService.updateProfile(userUpdateData).subscribe({
        next: (updatedUser) => {
          this.currentUser = updatedUser;
          this.isLoading = false;
          this.isEditingProfile = false;
          this.profileUpdateSuccess = true;
          setTimeout(() => {
            this.profileUpdateSuccess = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating company user data:', error);
          this.isLoading = false;
          this.errorMessage =
            'Failed to update company information. Please try again.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        },
      })
    );
  }

  onCompanySubmit() {
    if (this.companyForm.valid && this.currentUser) {
      this.isLoading = true;
      this.clearMessages();

      const formValue = this.companyForm.value;

      this.authService.updateProfile(formValue).subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isLoading = false;
          this.isEditingCompany = false;
          this.profileUpdateSuccess = true;
          setTimeout(() => {
            this.profileUpdateSuccess = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating company profile:', error);
          this.isLoading = false;
          this.errorMessage =
            'Failed to update company profile. Please try again.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        },
      });
    } else {
      this.markFormGroupTouched(this.companyForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field && field.touched && field.errors) {
      if (field.errors['required'])
        return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength'])
        return `${this.getFieldLabel(fieldName)} must be at least ${
          field.errors['minlength'].requiredLength
        } characters`;
    }
    return '';
  }

  getCompanyFieldError(fieldName: string): string {
    const field = this.companyForm.get(fieldName);
    if (field && field.touched && field.errors) {
      if (field.errors['required'])
        return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength'])
        return `${this.getFieldLabel(fieldName)} must be at least ${
          field.errors['minlength'].requiredLength
        } characters`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      companyName: 'Company name',
    };
    return labels[fieldName] || fieldName;
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.profileUpdateSuccess = false;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  }

  // Job and Application Management Methods
  navigateToCreateJob() {
    this.router.navigate(['/company/post-job']);
  }

  editJob(jobId: string) {
    this.router.navigate([`/company/jobs/${jobId}/edit`]);
  }

  deleteJob(jobId: string) {
    if (confirm('Are you sure you want to delete this job posting?')) {
      this.authSubscription.add(
        this.jobManagementService.deleteJob(jobId).subscribe({
          next: () => {
            this.companyJobs = this.companyJobs.filter(
              (job) => job.id !== jobId
            );
            this.successMessage = 'Job posting deleted successfully';
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            console.error('Error deleting job:', error);
            this.errorMessage =
              'Failed to delete job posting. Please try again.';
            setTimeout(() => {
              this.errorMessage = '';
            }, 5000);
          },
        })
      );
    }
  }

  filterApplications() {
    this.filteredApplications = this.jobApplications.filter((application) => {
      const matchesStatus =
        !this.selectedApplicationStatus ||
        application.status === this.selectedApplicationStatus;
      const matchesSearch =
        !this.applicationSearchQuery ||
        application.applicantName
          .toLowerCase()
          .includes(this.applicationSearchQuery.toLowerCase()) ||
        application.jobTitle
          .toLowerCase()
          .includes(this.applicationSearchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }

  onApplicationStatusChange(application: any, event: Event) {
    const target = event.target as HTMLSelectElement;
    const newStatus = target.value;
    this.updateApplicationStatus(application.id, newStatus);
  }

  updateApplicationStatus(applicationId: string, newStatus: string) {
    this.authSubscription.add(
      this.jobManagementService
        .updateApplicationStatus(applicationId, newStatus)
        .subscribe({
          next: () => {
            const application = this.jobApplications.find(
              (app) => app.id === applicationId
            );
            if (application) {
              application.status = newStatus;
              this.filterApplications();
            }
            this.successMessage = `Application status updated to ${newStatus}`;
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            console.error('Error updating application status:', error);
            this.errorMessage =
              'Failed to update application status. Please try again.';
            setTimeout(() => {
              this.errorMessage = '';
            }, 5000);
          },
        })
    );
  }

  viewApplication(applicationId: string) {
    this.router.navigate([`/company/applications/${applicationId}`]);
  }

  getJobStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'closed':
        return 'status-closed';
      case 'draft':
        return 'status-draft';
      default:
        return 'status-unknown';
    }
  }

  getApplicationStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'reviewed':
        return 'status-reviewed';
      case 'shortlisted':
        return 'status-shortlisted';
      case 'rejected':
        return 'status-rejected';
      case 'hired':
        return 'status-hired';
      default:
        return 'status-unknown';
    }
  }

  getTimeAgo(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return '1 day ago';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      return `${Math.floor(diffInDays / 30)} months ago`;
    } catch {
      return 'Unknown';
    }
  }
}
