import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';
import {
  ProfileService,
  UserProfile,
} from '../../../core/services/profile.service';
import {
  AdminManagementService,
  UserManagement,
  JobManagementStats,
} from '../../../core/services/admin-management.service';

@Component({
  selector: 'app-admin-profile',
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class AdminProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userProfile: UserProfile | null = null;

  // Form controls
  profileForm: FormGroup;

  // UI state
  activeSection = 'personal';
  isEditingProfile = false;
  isLoading = false;
  profileUpdateSuccess = false;
  errorMessage = '';
  successMessage = '';

  // Admin data
  allUsers: UserManagement[] = [];
  filteredUsers: UserManagement[] = [];
  allJobsForAdmin: any[] = [];
  filteredJobsForAdmin: any[] = [];
  jobManagementStats: JobManagementStats | null = null;
  selectedUserRoleFilter = '';
  selectedUserStatusFilter = '';
  selectedJobStatusFilter = '';
  userSearchQuery = '';
  jobSearchQuery = '';

  private authSubscription: Subscription = new Subscription();

  // Profile sections for admin
  profileSections = [
    {
      id: 'personal',
      title: 'Personal Information',
      icon: 'user',
      description: 'Update your basic information',
    },
    {
      id: 'admin',
      title: 'Admin Settings',
      icon: 'shield-check',
      description: 'Platform administration settings',
    },
    {
      id: 'users',
      title: 'User Management',
      icon: 'users',
      description: 'Manage platform users',
    },
    {
      id: 'jobs',
      title: 'Job Management',
      icon: 'briefcase',
      description: 'Oversee all job postings',
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
    private adminManagementService: AdminManagementService,
    private route: ActivatedRoute,
    private router: Router
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
        if (user && user.role === 'admin') {
          this.loadUserProfile();
          this.loadAdminData();
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
    return 'Admin';
  }

  setActiveSection(sectionId: string) {
    this.activeSection = sectionId;
    this.isEditingProfile = false;
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

  loadAdminData() {
    if (this.currentUser?.role === 'admin') {
      this.loadAllUsers();
      this.loadAllJobs();
      this.loadJobManagementStats();
    }
  }

  loadAllUsers() {
    this.authSubscription.add(
      this.adminManagementService.getAllUsers().subscribe({
        next: (users) => {
          this.allUsers = users;
          this.filteredUsers = [...users];
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.allUsers = [];
          this.filteredUsers = [];
        },
      })
    );
  }

  loadAllJobs() {
    this.authSubscription.add(
      this.adminManagementService.getAllJobsForAdmin().subscribe({
        next: (jobs: any[]) => {
          this.allJobsForAdmin = jobs;
          this.filteredJobsForAdmin = [...jobs];
        },
        error: (error: any) => {
          console.error('Error loading jobs:', error);
          this.allJobsForAdmin = [];
          this.filteredJobsForAdmin = [];
        },
      })
    );
  }

  loadJobManagementStats() {
    this.authSubscription.add(
      this.adminManagementService.getJobManagementStats().subscribe({
        next: (stats) => {
          this.jobManagementStats = stats;
        },
        error: (error) => {
          console.error('Error loading job management stats:', error);
          this.jobManagementStats = null;
        },
      })
    );
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

      if (this.userProfile) {
        this.authSubscription.add(
          this.profileService.updateUserProfile(profileData).subscribe({
            next: (updatedProfile) => {
              this.userProfile = updatedProfile;
              this.isLoading = false;
              this.isEditingProfile = false;
              this.profileUpdateSuccess = true;
              setTimeout(() => {
                this.profileUpdateSuccess = false;
              }, 3000);
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
              this.isLoading = false;
              this.isEditingProfile = false;
              this.profileUpdateSuccess = true;
              setTimeout(() => {
                this.profileUpdateSuccess = false;
              }, 3000);
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

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
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
    return this.adminManagementService.formatDate(dateString);
  }

  // Admin-specific methods
  filterUsers() {
    this.filteredUsers = this.allUsers.filter((user) => {
      const matchesRole =
        !this.selectedUserRoleFilter ||
        user.role === this.selectedUserRoleFilter;
      const matchesStatus =
        !this.selectedUserStatusFilter ||
        (this.selectedUserStatusFilter === 'active'
          ? user.isActive
          : !user.isActive);
      const matchesSearch =
        !this.userSearchQuery ||
        user.firstName
          .toLowerCase()
          .includes(this.userSearchQuery.toLowerCase()) ||
        user.lastName
          .toLowerCase()
          .includes(this.userSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(this.userSearchQuery.toLowerCase());

      return matchesRole && matchesStatus && matchesSearch;
    });
  }

  filterJobs() {
    this.filteredJobsForAdmin = this.allJobsForAdmin.filter((job) => {
      const matchesStatus =
        !this.selectedJobStatusFilter ||
        job.status === this.selectedJobStatusFilter;
      const matchesSearch =
        !this.jobSearchQuery ||
        job.title.toLowerCase().includes(this.jobSearchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(this.jobSearchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(this.jobSearchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }

  updateUserStatus(user: UserManagement) {
    this.authSubscription.add(
      this.adminManagementService
        .updateUserStatus(user.id, user.isActive)
        .subscribe({
          next: () => {
            this.successMessage = `User ${user.firstName} ${
              user.lastName
            } has been ${user.isActive ? 'activated' : 'deactivated'}`;
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            console.error('Error updating user status:', error);
            user.isActive = !user.isActive; // Revert the change
            this.errorMessage =
              'Failed to update user status. Please try again.';
            setTimeout(() => {
              this.errorMessage = '';
            }, 5000);
          },
        })
    );
  }

  deleteUser(user: UserManagement) {
    if (
      confirm(
        `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`
      )
    ) {
      this.authSubscription.add(
        this.adminManagementService.deleteUser(user.id).subscribe({
          next: () => {
            this.allUsers = this.allUsers.filter((u) => u.id !== user.id);
            this.filterUsers();
            this.successMessage = `User ${user.firstName} ${user.lastName} has been deleted`;
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.errorMessage = 'Failed to delete user. Please try again.';
            setTimeout(() => {
              this.errorMessage = '';
            }, 5000);
          },
        })
      );
    }
  }

  onJobStatusChange(job: any, event: Event) {
    const target = event.target as HTMLSelectElement;
    const newStatus = target.value;
    this.updateJobStatus(job, newStatus);
  }

  updateJobStatus(job: any, newStatus: string) {
    const isActive = newStatus === 'active';
    this.authSubscription.add(
      this.adminManagementService.updateJobStatus(job.id, isActive).subscribe({
        next: () => {
          job.status = newStatus;
          this.successMessage = `Job "${job.title}" status updated to ${newStatus}`;
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating job status:', error);
          this.errorMessage = 'Failed to update job status. Please try again.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        },
      })
    );
  }

  deleteJob(job: any) {
    if (
      confirm(
        `Are you sure you want to delete the job "${job.title}"? This action cannot be undone.`
      )
    ) {
      this.authSubscription.add(
        this.adminManagementService.deleteJobAsAdmin(job.id).subscribe({
          next: () => {
            this.allJobsForAdmin = this.allJobsForAdmin.filter(
              (j) => j.id !== job.id
            );
            this.filterJobs();
            this.successMessage = `Job "${job.title}" has been deleted`;
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error: any) => {
            console.error('Error deleting job:', error);
            this.errorMessage = 'Failed to delete job. Please try again.';
            setTimeout(() => {
              this.errorMessage = '';
            }, 5000);
          },
        })
      );
    }
  }

  // Helper methods for admin
  getUserRoleDisplayName(role: string): string {
    return this.adminManagementService.getUserRoleDisplayName(role);
  }

  getJobStatusDisplayName(job: any): string {
    return this.adminManagementService.getJobStatusDisplayName(job);
  }

  getJobStatusClass(job: any): string {
    return this.adminManagementService.getJobStatusClass(job);
  }

  getTimeAgoAdmin(dateString: string): string {
    return this.adminManagementService.getTimeAgo(dateString);
  }
}
