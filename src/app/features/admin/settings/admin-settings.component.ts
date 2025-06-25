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
  SystemSettings,
} from '../../../core/services/settings.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-settings',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css',
})
export class AdminSettingsComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  currentUser: User | null = null;
  private authSubscription: Subscription = new Subscription();

  // Password change functionality
  passwordForm: FormGroup;
  isChangingPassword = false;
  isLoading = false;
  passwordUpdateSuccess = false;
  errorMessage = '';

  // Admin-specific settings categories
  settingsCategories = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: 'palette',
      description: 'Customize the admin interface theme and layout',
    },
    {
      id: 'account',
      title: 'Account Security',
      icon: 'user',
      description: 'Manage your admin account and security settings',
    },
    {
      id: 'notifications',
      title: 'Admin Notifications',
      icon: 'bell',
      description: 'Configure system alerts and admin notifications',
    },
    {
      id: 'system',
      title: 'System Configuration',
      icon: 'settings',
      description: 'Configure platform-wide system settings',
    },
    {
      id: 'security',
      title: 'Security & Compliance',
      icon: 'shield',
      description: 'Manage security policies and compliance settings',
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: 'bar-chart',
      description: 'Configure analytics tracking and reporting',
    },
  ];

  activeCategory = 'appearance';

  // Settings data
  userSettings: UserSettings | null = null;
  systemSettings: SystemSettings | null = null;

  // Admin notification settings
  notificationSettings = {
    emailNotifications: true,
    systemAlerts: true,
    userRegistrations: true,
    jobPostings: true,
    reportGeneration: true,
    securityAlerts: true,
    maintenanceNotifications: true,
  };

  // System configuration settings
  systemConfig = {
    allowUserRegistration: true,
    requireEmailVerification: true,
    enableJobApproval: false,
    maxJobsPerCompany: 50,
    sessionTimeout: 30,
    enableAnalytics: true,
    maintenanceMode: false,
  };

  // Security settings
  securitySettings = {
    enforcePasswordPolicy: true,
    requireTwoFactor: false,
    sessionSecurity: 'high',
    loginAttempts: 5,
    accountLockoutTime: 30,
    auditLogging: true,
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
        if (user && user.role === 'admin') {
          this.loadUserSettings(user.id);
          this.loadSystemSettings();
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

    this.authSubscription.add(
      this.settingsService.systemSettings$.subscribe((settings) => {
        this.systemSettings = settings;
        this.updateSystemConfigFromSettings(settings);
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
        console.error('Error loading admin settings:', error);
      },
    });
  }

  // Load system settings from database
  loadSystemSettings() {
    this.settingsService.getSystemSettings().subscribe({
      next: (settings) => {
        this.systemSettings = settings;
        this.updateSystemConfigFromSettings(settings);
      },
      error: (error) => {
        console.error('Error loading system settings:', error);
      },
    });
  }

  // Update local settings from user settings
  updateLocalSettingsFromUserSettings(settings: UserSettings) {
    // Update admin notification settings
    this.notificationSettings = {
      emailNotifications: settings.notifications.emailNotifications,
      systemAlerts: settings.notifications.systemAlerts || true,
      userRegistrations: settings.notifications.userRegistrations || true,
      jobPostings: settings.notifications.jobPostings || true,
      reportGeneration: settings.notifications.reportGeneration || true,
      securityAlerts: settings.notifications.securityAlerts || true,
      maintenanceNotifications:
        settings.notifications.maintenanceNotifications || true,
    };

    // Update theme from appearance settings
    if (settings.appearance.theme) {
      this.themeService.syncThemeFromSettings(
        settings.appearance.theme as 'light' | 'dark'
      );
    }
  }

  // Update system config from system settings
  updateSystemConfigFromSettings(settings: SystemSettings | null) {
    if (settings) {
      this.systemConfig = {
        allowUserRegistration: settings.allowUserRegistration ?? true,
        requireEmailVerification: settings.requireEmailVerification ?? true,
        enableJobApproval: settings.enableJobApproval ?? false,
        maxJobsPerCompany: settings.maxJobsPerCompany ?? 50,
        sessionTimeout: settings.sessionTimeout ?? 30,
        enableAnalytics: settings.enableAnalytics ?? true,
        maintenanceMode: settings.maintenanceMode ?? false,
      };

      this.securitySettings = {
        enforcePasswordPolicy: settings.security?.enforcePasswordPolicy ?? true,
        requireTwoFactor: settings.security?.requireTwoFactor ?? false,
        sessionSecurity: settings.security?.sessionSecurity ?? 'high',
        loginAttempts: settings.security?.loginAttempts ?? 5,
        accountLockoutTime: settings.security?.accountLockoutTime ?? 30,
        auditLogging: settings.security?.auditLogging ?? true,
      };
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
            console.log('Admin theme updated:', newTheme);
          },
          error: (error) => {
            console.error('Error updating admin theme:', error);
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
            console.log('Admin notification setting updated:', setting, value);
          },
          error: (error) => {
            console.error('Error updating admin notification setting:', error);
            (this.notificationSettings as any)[setting] = !value;
          },
        });
    }
  }

  updateSystemSetting(setting: string, value: any) {
    (this.systemConfig as any)[setting] = value;

    // Save to database
    const systemUpdate = { [setting]: value };
    this.settingsService.updateSystemSettings(systemUpdate).subscribe({
      next: (settings) => {
        console.log('System setting updated:', setting, value);
      },
      error: (error) => {
        console.error('Error updating system setting:', error);
        // Revert the change on error
        this.loadSystemSettings();
      },
    });
  }

  updateSecuritySetting(setting: string, value: any) {
    (this.securitySettings as any)[setting] = value;

    // Save to database - need to include all required security fields
    if (this.systemSettings?.security) {
      const securityUpdate = {
        security: {
          ...this.systemSettings.security,
          [setting]: value,
        },
      };
      this.settingsService.updateSystemSettings(securityUpdate).subscribe({
        next: (settings) => {
          console.log('Security setting updated:', setting, value);
        },
        error: (error) => {
          console.error('Error updating security setting:', error);
          // Revert the change on error
          this.loadSystemSettings();
        },
      });
    }
  }

  onNotificationChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement;
    this.updateNotificationSetting(setting, target.checked);
  }

  onSystemConfigChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    this.updateSystemSetting(setting, value);
  }

  onSecurityChange(event: Event, setting: string) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value =
      target.type === 'checkbox'
        ? (target as HTMLInputElement).checked
        : target.value;
    this.updateSecuritySetting(setting, value);
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

  // Admin-specific actions
  generateSystemReport() {
    console.log('Generating system report...');
    // Implement system report generation
  }

  exportSystemData() {
    console.log('Exporting system data...');
    // Implement system data export
  }

  clearSystemCache() {
    if (confirm('Are you sure you want to clear the system cache?')) {
      console.log('Clearing system cache...');
      // Implement cache clearing
    }
  }

  runSystemMaintenance() {
    if (
      confirm(
        'Are you sure you want to run system maintenance? This may affect platform performance.'
      )
    ) {
      console.log('Running system maintenance...');
      // Implement system maintenance
    }
  }
}
