import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService, User } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import {
  SettingsService,
  UserSettings,
} from '../../../core/services/settings.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-job-seeker-settings',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './job-seeker-settings.component.html',
  styleUrl: './job-seeker-settings.component.css',
})
export class JobSeekerSettingsComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  currentUser: User | null = null;
  private authSubscription: Subscription = new Subscription();

  // Password change functionality
  passwordForm: FormGroup;
  isChangingPassword = false;
  isLoading = false;
  passwordUpdateSuccess = false;
  errorMessage = '';

  // Job-seeker specific settings categories
  settingsCategories = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: 'palette',
      description: 'Customize your dashboard theme and layout',
    },
    {
      id: 'account',
      title: 'Account Security',
      icon: 'user',
      description: 'Manage your account and security settings',
    },
    {
      id: 'notifications',
      title: 'Job Notifications',
      icon: 'bell',
      description: 'Configure job alerts and application notifications',
    },
    {
      id: 'preferences',
      title: 'Job Preferences',
      icon: 'heart',
      description: 'Set your job search preferences and criteria',
    },
    {
      id: 'privacy',
      title: 'Privacy & Profile',
      icon: 'shield',
      description: 'Control your profile visibility and data privacy',
    },
    {
      id: 'applications',
      title: 'Application Settings',
      icon: 'file-text',
      description: 'Manage application preferences and defaults',
    },
  ];

  activeCategory = 'appearance';

  // Settings data
  userSettings: UserSettings | null = null;

  // Job seeker notification settings
  notificationSettings = {
    emailNotifications: true,
    jobAlerts: true,
    newJobMatches: true,
    applicationUpdates: true,
    interviewInvitations: true,
    weeklyJobDigest: true,
    companyFollowUps: true,
    marketingEmails: false,
  };

  // Job preferences settings
  jobPreferences = {
    preferredJobTypes: ['full-time'],
    preferredLocations: [] as string[],
    remoteWork: true,
    salaryExpectation: '',
    experienceLevel: 'mid-level',
    availabilityDate: '',
    willingToRelocate: false,
    preferredIndustries: [] as string[],
  };

  // Privacy settings
  privacySettings = {
    profileVisibility: 'public',
    showSalaryExpectation: false,
    allowRecruiterContact: true,
    showApplicationHistory: false,
    allowDataExport: true,
    enableProfileAnalytics: true,
  };

  // Application settings
  applicationSettings = {
    autoFillApplications: true,
    saveApplicationDrafts: true,
    requireCoverLetterReminder: true,
    trackApplicationStatus: true,
    enableQuickApply: true,
    defaultCoverLetter: '',
  };

  // Available options
  jobTypes = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'internship', label: 'Internship' },
  ];

  experienceLevels = [
    { value: 'entry-level', label: 'Entry Level' },
    { value: 'mid-level', label: 'Mid Level' },
    { value: 'senior-level', label: 'Senior Level' },
    { value: 'executive', label: 'Executive' },
  ];

  profileVisibilityOptions = [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
    { value: 'recruiters-only', label: 'Recruiters Only' },
  ];

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private formBuilder: FormBuilder,
    private settingsService: SettingsService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Initialize password form
    this.passwordForm = this.formBuilder.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit() {
    // Subscribe to query parameters to handle tab changes
    this.authSubscription.add(
      this.route.queryParams.subscribe((params) => {
        const tab = params['tab'];
        if (tab && this.settingsCategories.some((cat) => cat.id === tab)) {
          this.activeCategory = tab;
        } else {
          // Default to first category if no valid tab parameter
          this.activeCategory = this.settingsCategories[0].id;
        }
      })
    );

    // Subscribe to theme changes
    this.authSubscription.add(
      this.themeService.isDarkMode$.subscribe((isDark) => {
        this.isDarkMode = isDark;
      })
    );

    // Subscribe to authentication state
    this.authSubscription.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
        if (user && user.role === 'job-seeker') {
          this.loadUserSettings(user.id);
        }
      })
    );

    // Subscribe to settings changes
    this.authSubscription.add(
      this.settingsService.userSettings$.subscribe((settings) => {
        if (settings) {
          this.userSettings = settings;
          this.updateLocalSettingsFromUserSettings(settings);
        }
      })
    );
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }

  setActiveCategory(categoryId: string) {
    this.activeCategory = categoryId;

    // Update URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: categoryId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
    if (this.currentUser?.role === 'job-seeker') {
      return 'Job Seeker';
    }
    if (this.currentUser?.role) {
      return (
        this.currentUser.role.charAt(0).toUpperCase() +
        this.currentUser.role.slice(1)
      );
    }
    return 'User';
  }

  // Load user settings from database
  loadUserSettings(userId: string) {
    this.settingsService.getUserSettings(userId).subscribe({
      next: (settings) => {
        this.userSettings = settings;
        this.updateLocalSettingsFromUserSettings(settings);
      },
      error: (error) => {
        console.error('Error loading job seeker settings:', error);
      },
    });
  }

  // Update local settings from user settings
  updateLocalSettingsFromUserSettings(settings: UserSettings) {
    // Update job seeker notification settings
    this.notificationSettings = {
      emailNotifications: settings.notifications.emailNotifications,
      jobAlerts: settings.notifications.jobAlerts || true,
      newJobMatches: settings.notifications.newJobMatches || true,
      applicationUpdates: settings.notifications.applicationUpdates || true,
      interviewInvitations: settings.notifications.interviewInvitations || true,
      weeklyJobDigest: settings.notifications.weeklyJobDigest || true,
      companyFollowUps: settings.notifications.companyFollowUps || true,
      marketingEmails: settings.notifications.marketingEmails || false,
    };

    // Update job preferences if available
    if (settings.jobPreferences) {
      this.jobPreferences = {
        preferredJobTypes: settings.jobPreferences.preferredJobTypes || [
          'full-time',
        ],
        preferredLocations: settings.jobPreferences.preferredLocations || [],
        remoteWork: settings.jobPreferences.remoteWork ?? true,
        salaryExpectation: settings.jobPreferences.salaryExpectation || '',
        experienceLevel: settings.jobPreferences.experienceLevel || 'mid-level',
        availabilityDate: settings.jobPreferences.availabilityDate || '',
        willingToRelocate: settings.jobPreferences.willingToRelocate ?? false,
        preferredIndustries: settings.jobPreferences.preferredIndustries || [],
      };
    }

    // Update privacy settings if available
    if (settings.privacy) {
      this.privacySettings = {
        profileVisibility: settings.privacy.profileVisibility || 'public',
        showSalaryExpectation: settings.privacy.showSalaryExpectation ?? false,
        allowRecruiterContact: settings.privacy.allowRecruiterContact ?? true,
        showApplicationHistory:
          settings.privacy.showApplicationHistory ?? false,
        allowDataExport: settings.privacy.allowDataExport ?? true,
        enableProfileAnalytics: settings.privacy.enableProfileAnalytics ?? true,
      };
    }

    // Update application settings if available
    if (settings.applications) {
      this.applicationSettings = {
        autoFillApplications:
          settings.applications.autoFillApplications ?? true,
        saveApplicationDrafts:
          settings.applications.saveApplicationDrafts ?? true,
        requireCoverLetterReminder:
          settings.applications.requireCoverLetterReminder ?? true,
        trackApplicationStatus:
          settings.applications.trackApplicationStatus ?? true,
        enableQuickApply: settings.applications.enableQuickApply ?? true,
        defaultCoverLetter: settings.applications.defaultCoverLetter || '',
      };
    }

    // Update theme from appearance settings
    if (settings.appearance.theme) {
      this.themeService.syncThemeFromSettings(
        settings.appearance.theme as 'light' | 'dark'
      );
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();

    // Update theme in user settings database
    if (this.userSettings) {
      const newTheme = this.themeService.getThemeString();
      this.settingsService
        .updateAppearanceSettings({ theme: newTheme })
        .subscribe({
          next: (settings) => {
            console.log('Job seeker theme updated:', newTheme);
          },
          error: (error) => {
            console.error('Error updating job seeker theme:', error);
            this.themeService.toggleTheme();
          },
        });
    }
  }

  updateNotificationSetting(setting: string, value: boolean) {
    (this.notificationSettings as any)[setting] = value;

    // Save to database
    if (this.userSettings) {
      const notificationUpdate = { [setting]: value };
      this.settingsService
        .updateNotificationSettings(notificationUpdate)
        .subscribe({
          next: (settings) => {
            console.log(
              'Job seeker notification setting updated:',
              setting,
              value
            );
          },
          error: (error) => {
            console.error(
              'Error updating job seeker notification setting:',
              error
            );
            (this.notificationSettings as any)[setting] = !value;
          },
        });
    }
  }

  updateJobPreference(setting: string, value: any) {
    (this.jobPreferences as any)[setting] = value;

    // Save to database
    if (this.userSettings) {
      const jobPreferenceUpdate = { [setting]: value };
      this.settingsService.updateJobPreferences(jobPreferenceUpdate).subscribe({
        next: (settings) => {
          console.log('Job preference updated:', setting, value);
        },
        error: (error) => {
          console.error('Error updating job preference:', error);
          // Revert the change on error
          this.loadUserSettings(this.currentUser!.id);
        },
      });
    }
  }

  updatePrivacySetting(setting: string, value: any) {
    (this.privacySettings as any)[setting] = value;

    // Save to database
    if (this.userSettings) {
      const privacyUpdate = { [setting]: value };
      this.settingsService.updatePrivacySettings(privacyUpdate).subscribe({
        next: (settings) => {
          console.log('Privacy setting updated:', setting, value);
        },
        error: (error) => {
          console.error('Error updating privacy setting:', error);
          // Revert the change on error
          this.loadUserSettings(this.currentUser!.id);
        },
      });
    }
  }

  updateApplicationSetting(setting: string, value: any) {
    (this.applicationSettings as any)[setting] = value;

    // Save to database
    if (this.userSettings) {
      const applicationUpdate = { [setting]: value };
      this.settingsService
        .updateApplicationSettings(applicationUpdate)
        .subscribe({
          next: (settings) => {
            console.log('Application setting updated:', setting, value);
          },
          error: (error) => {
            console.error('Error updating application setting:', error);
            // Revert the change on error
            this.loadUserSettings(this.currentUser!.id);
          },
        });
    }
  }

  onNotificationChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement;
    this.updateNotificationSetting(setting, target.checked);
  }

  onJobPreferenceChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value =
      target.type === 'checkbox'
        ? (target as HTMLInputElement).checked
        : target.value;
    this.updateJobPreference(setting, value);
  }

  onPrivacyChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value =
      target.type === 'checkbox'
        ? (target as HTMLInputElement).checked
        : target.value;
    this.updatePrivacySetting(setting, value);
  }

  onApplicationChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value =
      target.type === 'checkbox'
        ? (target as HTMLInputElement).checked
        : target.value;
    this.updateApplicationSetting(setting, value);
  }

  toggleChangePassword() {
    this.isChangingPassword = !this.isChangingPassword;
    if (!this.isChangingPassword) {
      this.passwordForm.reset();
    }
    this.clearMessages();
  }

  onPasswordSubmit() {
    if (this.passwordForm.valid && this.currentUser) {
      this.isLoading = true;
      this.clearMessages();

      const { currentPassword, newPassword } = this.passwordForm.value;

      this.authService.changePassword(currentPassword, newPassword).subscribe({
        next: () => {
          this.isLoading = false;
          this.isChangingPassword = false;
          this.passwordUpdateSuccess = true;
          this.passwordForm.reset();

          setTimeout(() => {
            this.passwordUpdateSuccess = false;
          }, 3000);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Failed to change password';

          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        },
      });
    } else {
      this.markFormGroupTouched(this.passwordForm);
    }
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (
      newPassword &&
      confirmPassword &&
      newPassword.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private clearMessages() {
    this.passwordUpdateSuccess = false;
    this.errorMessage = '';
  }

  getFieldError(fieldName: string): string | null {
    const field = this.passwordForm.get(fieldName);
    if (field && field.touched && field.errors) {
      if (field.errors['required']) {
        return `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } is required`;
      }
      if (field.errors['minlength']) {
        return `Password must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return null;
  }

  // Job seeker specific actions
  exportProfileData() {
    console.log('Exporting profile data...');
    // Implement profile data export
  }

  clearJobAlerts() {
    if (confirm('Are you sure you want to clear all job alerts?')) {
      console.log('Clearing job alerts...');
      // Implement job alerts clearing
    }
  }

  resetJobPreferences() {
    if (
      confirm('Are you sure you want to reset all job preferences to default?')
    ) {
      console.log('Resetting job preferences...');
      // Implement job preferences reset
    }
  }
}
