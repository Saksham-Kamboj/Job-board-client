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
  selector: 'app-company-settings',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './company-settings.component.html',
  styleUrl: './company-settings.component.css',
})
export class CompanySettingsComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  currentUser: User | null = null;
  private authSubscription: Subscription = new Subscription();

  // Password change functionality
  passwordForm: FormGroup;
  isChangingPassword = false;
  isLoading = false;
  passwordUpdateSuccess = false;
  errorMessage = '';

  // Company-specific settings categories
  settingsCategories = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: 'palette',
      description: 'Customize your company dashboard theme',
    },
    {
      id: 'account',
      title: 'Account Security',
      icon: 'user',
      description: 'Manage your company account and security',
    },
    {
      id: 'notifications',
      title: 'Hiring Notifications',
      icon: 'bell',
      description: 'Configure application and hiring notifications',
    },
    {
      id: 'company',
      title: 'Company Profile',
      icon: 'building',
      description: 'Manage company profile and hiring preferences',
    },
    {
      id: 'billing',
      title: 'Billing & Plans',
      icon: 'credit-card',
      description: 'Manage subscription and billing information',
    },
    {
      id: 'privacy',
      title: 'Privacy & Data',
      icon: 'shield',
      description: 'Control company data privacy and visibility',
    },
  ];

  activeCategory = 'appearance';

  // Settings data
  userSettings: UserSettings | null = null;

  // Company notification settings
  notificationSettings = {
    emailNotifications: true,
    applicationAlerts: true,
    newApplications: true,
    interviewReminders: true,
    jobExpirationAlerts: true,
    weeklyReports: true,
    marketingEmails: false,
  };

  // Company profile settings
  companySettings = {
    autoReplyToApplications: true,
    showCompanySize: true,
    showSalaryRanges: true,
    enableQuickApply: true,
    requireCoverLetter: false,
    allowRemoteApplications: true,
    publicCompanyProfile: true,
  };

  // Billing settings
  billingSettings = {
    currentPlan: 'Professional',
    jobPostingsUsed: 15,
    jobPostingsLimit: 50,
    nextBillingDate: '2024-02-15',
    autoRenew: true,
  };

  // Privacy settings
  privacySettings = {
    showCompanyInSearch: true,
    allowDataExport: true,
    shareAnalytics: false,
    enableCookies: true,
    dataRetentionPeriod: '2-years',
  };

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
        if (user && user.role === 'company') {
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
        console.error('Error loading company settings:', error);
      },
    });
  }

  // Update local settings from user settings
  updateLocalSettingsFromUserSettings(settings: UserSettings) {
    // Update company notification settings
    this.notificationSettings = {
      emailNotifications: settings.notifications.emailNotifications,
      applicationAlerts: settings.notifications.applicationAlerts || true,
      newApplications: settings.notifications.newApplications || true,
      interviewReminders: settings.notifications.interviewReminders || true,
      jobExpirationAlerts: settings.notifications.jobExpirationAlerts || true,
      weeklyReports: settings.notifications.weeklyReports || true,
      marketingEmails: settings.notifications.marketingEmails || false,
    };

    // Update company profile settings if available
    if (settings.company) {
      this.companySettings = {
        autoReplyToApplications:
          settings.company.autoReplyToApplications ?? true,
        showCompanySize: settings.company.showCompanySize ?? true,
        showSalaryRanges: settings.company.showSalaryRanges ?? true,
        enableQuickApply: settings.company.enableQuickApply ?? true,
        requireCoverLetter: settings.company.requireCoverLetter ?? false,
        allowRemoteApplications:
          settings.company.allowRemoteApplications ?? true,
        publicCompanyProfile: settings.company.publicCompanyProfile ?? true,
      };
    }

    // Update privacy settings if available
    if (settings.privacy) {
      this.privacySettings = {
        showCompanyInSearch: settings.privacy.showCompanyInSearch ?? true,
        allowDataExport: settings.privacy.allowDataExport ?? true,
        shareAnalytics: settings.privacy.shareAnalytics ?? false,
        enableCookies: settings.privacy.enableCookies ?? true,
        dataRetentionPeriod: settings.privacy.dataRetentionPeriod ?? '2-years',
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
            console.log('Company theme updated:', newTheme);
          },
          error: (error) => {
            console.error('Error updating company theme:', error);
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
              'Company notification setting updated:',
              setting,
              value
            );
          },
          error: (error) => {
            console.error(
              'Error updating company notification setting:',
              error
            );
            (this.notificationSettings as any)[setting] = !value;
          },
        });
    }
  }

  updateCompanySetting(setting: string, value: any) {
    (this.companySettings as any)[setting] = value;

    // Save to database
    if (this.userSettings) {
      const companyUpdate = { [setting]: value };
      this.settingsService.updateCompanySettings(companyUpdate).subscribe({
        next: (settings) => {
          console.log('Company setting updated:', setting, value);
        },
        error: (error) => {
          console.error('Error updating company setting:', error);
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
          console.log('Company privacy setting updated:', setting, value);
        },
        error: (error) => {
          console.error('Error updating company privacy setting:', error);
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

  onCompanySettingChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement;
    this.updateCompanySetting(setting, target.checked);
  }

  onPrivacyChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value =
      target.type === 'checkbox'
        ? (target as HTMLInputElement).checked
        : target.value;
    this.updatePrivacySetting(setting, value);
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

  // Company-specific actions
  exportCompanyData() {
    console.log('Exporting company data...');
    // Implement company data export
  }

  downloadInvoices() {
    console.log('Downloading invoices...');
    // Implement invoice download
  }

  cancelSubscription() {
    if (confirm('Are you sure you want to cancel your subscription?')) {
      console.log('Canceling subscription...');
      // Implement subscription cancellation
    }
  }

  upgradeSubscription() {
    console.log('Upgrading subscription...');
    // Implement subscription upgrade
  }
}
