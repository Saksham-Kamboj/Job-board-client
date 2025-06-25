import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserSettings {
  id: string;
  userId: string;
  appearance: {
    theme: string;
    language: string;
    fontSize: string;
    compactMode: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    jobAlerts?: boolean;
    applicationUpdates?: boolean;
    profileViews?: boolean;
    newApplications?: boolean;
    jobPostingExpiry?: boolean;
    weeklyReports?: boolean;
    systemAlerts?: boolean;
    userReports?: boolean;
    platformAnalytics?: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
    // Admin-specific notifications
    userRegistrations?: boolean;
    jobPostings?: boolean;
    reportGeneration?: boolean;
    securityAlerts?: boolean;
    maintenanceNotifications?: boolean;
    // Company-specific notifications
    applicationAlerts?: boolean;
    interviewReminders?: boolean;
    jobExpirationAlerts?: boolean;
    // Job-seeker-specific notifications
    newJobMatches?: boolean;
    interviewInvitations?: boolean;
    weeklyJobDigest?: boolean;
    companyFollowUps?: boolean;
  };
  privacy?: {
    profileVisibility: string;
    showEmail: boolean;
    showPhone: boolean;
    allowSearchEngines: boolean;
    showOnlineStatus: boolean;
    // Job-seeker-specific privacy settings
    showSalaryExpectation?: boolean;
    allowRecruiterContact?: boolean;
    showApplicationHistory?: boolean;
    allowDataExport?: boolean;
    enableProfileAnalytics?: boolean;
    // Company-specific privacy settings
    showCompanyInSearch?: boolean;
    shareAnalytics?: boolean;
    enableCookies?: boolean;
    dataRetentionPeriod?: string;
  };
  jobPreferences?: {
    preferredJobTypes: string[];
    salaryRange?: {
      min: number;
      max: number;
      currency: string;
    };
    preferredLocations: string[];
    jobAlertFrequency?: string;
    autoApplyEnabled?: boolean;
    // Additional job-seeker preferences
    remoteWork?: boolean;
    salaryExpectation?: string;
    experienceLevel?: string;
    availabilityDate?: string;
    willingToRelocate?: boolean;
    preferredIndustries?: string[];
  };
  companySettings?: {
    companySize: string;
    autoReplyToApplications: boolean;
    applicationDeadlineReminders: boolean;
    requireCoverLetter: boolean;
    allowAnonymousApplications: boolean;
  };
  billing?: {
    currentPlan: string;
    planPrice: number;
    currency: string;
    billingCycle: string;
    jobPostingsUsed: number;
    jobPostingsLimit: number;
    nextBillingDate: string;
  };
  applications?: {
    autoFillApplications: boolean;
    saveApplicationDrafts: boolean;
    requireCoverLetterReminder: boolean;
    trackApplicationStatus: boolean;
    enableQuickApply: boolean;
    defaultCoverLetter: string;
  };
  company?: {
    autoReplyToApplications?: boolean;
    showCompanySize?: boolean;
    showSalaryRanges?: boolean;
    enableQuickApply?: boolean;
    requireCoverLetter?: boolean;
    allowRemoteApplications?: boolean;
    publicCompanyProfile?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id: string;
  platformName: string;
  platformDescription: string;
  supportEmail: string;
  allowRegistration: boolean;
  allowUserRegistration?: boolean; // Alias for allowRegistration
  requireEmailVerification: boolean;
  maintenanceMode: boolean;
  maxJobPostingsPerCompany: number;
  jobPostingDurationDays: number;
  featuredJobPrice: number;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  // Additional admin settings
  enableJobApproval?: boolean;
  maxJobsPerCompany?: number;
  sessionTimeout?: number;
  enableAnalytics?: boolean;
  analytics: {
    trackingEnabled: boolean;
    weeklyReportsEnabled: boolean;
    dataRetentionDays: number;
  };
  security: {
    requireTwoFactorAuth: boolean;
    requireTwoFactor?: boolean; // Alias for requireTwoFactorAuth
    sessionTimeoutMinutes: number;
    passwordMinLength: number;
    dataRetentionDays: number;
    // Additional security settings
    enforcePasswordPolicy?: boolean;
    sessionSecurity?: string;
    loginAttempts?: number;
    accountLockoutTime?: number;
    auditLogging?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = environment.apiUrl;
  private userSettingsSubject = new BehaviorSubject<UserSettings | null>(null);
  private systemSettingsSubject = new BehaviorSubject<SystemSettings | null>(
    null
  );

  public userSettings$ = this.userSettingsSubject.asObservable();
  public systemSettings$ = this.systemSettingsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // User Settings Methods
  getUserSettings(userId: string): Observable<UserSettings> {
    return this.http
      .get<UserSettings[]>(`${this.apiUrl}/userSettings?userId=${userId}`)
      .pipe(
        map((settings) => {
          if (settings.length > 0) {
            this.userSettingsSubject.next(settings[0]);
            return settings[0];
          } else {
            // Create default settings if none exist
            return this.createDefaultUserSettings(userId);
          }
        }),
        catchError((error) => {
          console.error('Error fetching user settings:', error);
          return throwError(() => error);
        })
      );
  }

  updateUserSettings(
    settings: Partial<UserSettings>
  ): Observable<UserSettings> {
    const currentSettings = this.userSettingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('No current settings found'));
    }

    const updatedSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .put<UserSettings>(
        `${this.apiUrl}/userSettings/${currentSettings.id}`,
        updatedSettings
      )
      .pipe(
        tap((updated) => this.userSettingsSubject.next(updated)),
        catchError((error) => {
          console.error('Error updating user settings:', error);
          return throwError(() => error);
        })
      );
  }

  private createDefaultUserSettings(userId: string): UserSettings {
    const defaultSettings: UserSettings = {
      id: `settings-${userId}`,
      userId: userId,
      appearance: {
        theme: 'light',
        language: 'en',
        fontSize: 'medium',
        compactMode: false,
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: false,
        marketingEmails: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create settings in database
    this.http
      .post<UserSettings>(`${this.apiUrl}/userSettings`, defaultSettings)
      .subscribe((created) => this.userSettingsSubject.next(created));

    return defaultSettings;
  }

  // System Settings Methods (Admin only)
  getSystemSettings(): Observable<SystemSettings> {
    return this.http
      .get<SystemSettings[]>(`${this.apiUrl}/systemSettings`)
      .pipe(
        map((settings) => {
          if (settings.length > 0) {
            this.systemSettingsSubject.next(settings[0]);
            return settings[0];
          } else {
            throw new Error('No system settings found');
          }
        }),
        catchError((error) => {
          console.error('Error fetching system settings:', error);
          return throwError(() => error);
        })
      );
  }

  updateSystemSettings(
    settings: Partial<SystemSettings>
  ): Observable<SystemSettings> {
    const currentSettings = this.systemSettingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('No current system settings found'));
    }

    const updatedSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .put<SystemSettings>(
        `${this.apiUrl}/systemSettings/${currentSettings.id}`,
        updatedSettings
      )
      .pipe(
        tap((updated) => this.systemSettingsSubject.next(updated)),
        catchError((error) => {
          console.error('Error updating system settings:', error);
          return throwError(() => error);
        })
      );
  }

  // Convenience methods for specific settings
  updateAppearanceSettings(
    appearance: Partial<UserSettings['appearance']>
  ): Observable<UserSettings> {
    const currentSettings = this.userSettingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('No current settings found'));
    }

    return this.updateUserSettings({
      appearance: { ...currentSettings.appearance, ...appearance },
    });
  }

  updateNotificationSettings(
    notifications: Partial<UserSettings['notifications']>
  ): Observable<UserSettings> {
    const currentSettings = this.userSettingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('No current settings found'));
    }

    return this.updateUserSettings({
      notifications: { ...currentSettings.notifications, ...notifications },
    });
  }

  updatePrivacySettings(
    privacy: Partial<UserSettings['privacy']>
  ): Observable<UserSettings> {
    const currentSettings = this.userSettingsSubject.value;
    if (!currentSettings || !currentSettings.privacy) {
      return throwError(() => new Error('No current settings found'));
    }

    return this.updateUserSettings({
      privacy: { ...currentSettings.privacy, ...privacy },
    });
  }

  updateJobPreferences(
    jobPreferences: Partial<UserSettings['jobPreferences']>
  ): Observable<UserSettings> {
    const currentSettings = this.userSettingsSubject.value;
    if (!currentSettings || !currentSettings.jobPreferences) {
      return throwError(() => new Error('No current settings found'));
    }

    return this.updateUserSettings({
      jobPreferences: { ...currentSettings.jobPreferences, ...jobPreferences },
    });
  }

  updateCompanySettings(
    companySettings: Partial<UserSettings['company']>
  ): Observable<UserSettings> {
    const currentSettings = this.userSettingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('No current settings found'));
    }

    return this.updateUserSettings({
      company: {
        ...currentSettings.company,
        ...companySettings,
      },
    });
  }

  updateApplicationSettings(
    applicationSettings: Partial<UserSettings['applications']>
  ): Observable<UserSettings> {
    const currentSettings = this.userSettingsSubject.value;
    if (!currentSettings || !currentSettings.applications) {
      return throwError(() => new Error('No current settings found'));
    }

    return this.updateUserSettings({
      applications: {
        ...currentSettings.applications,
        ...applicationSettings,
      },
    });
  }

  // Get current settings synchronously
  getCurrentUserSettings(): UserSettings | null {
    return this.userSettingsSubject.value;
  }

  getCurrentSystemSettings(): SystemSettings | null {
    return this.systemSettingsSubject.value;
  }
}
