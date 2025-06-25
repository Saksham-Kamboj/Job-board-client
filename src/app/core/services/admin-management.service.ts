import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminSettings {
  id: string;
  platformName: string;
  platformDescription: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxJobPostingsPerCompany: number;
  jobPostingDurationDays: number;
  featuredJobPrice: number;
  maintenanceMode: boolean;
  supportEmail: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UserManagement {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
  location?: string;
  companyName?: string;
  jobApplicationsCount?: number;
  jobPostingsCount?: number;
}

export interface JobManagementStats {
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  expiredJobs: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminManagementService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Admin Settings Methods
  getAdminSettings(): Observable<AdminSettings> {
    return this.http
      .get<AdminSettings[]>(`${this.apiUrl}/adminSettings`)
      .pipe(
        map((settings) =>
          settings.length > 0 ? settings[0] : this.getDefaultAdminSettings()
        )
      );
  }

  updateAdminSettings(
    settings: Partial<AdminSettings>
  ): Observable<AdminSettings> {
    return this.getAdminSettings().pipe(
      switchMap((currentSettings) => {
        const updatedSettings = {
          ...currentSettings,
          ...settings,
          updatedAt: new Date().toISOString(),
        };

        if (currentSettings.id && currentSettings.id !== 'default') {
          return this.http.put<AdminSettings>(
            `${this.apiUrl}/adminSettings/${currentSettings.id}`,
            updatedSettings
          );
        } else {
          return this.http.post<AdminSettings>(
            `${this.apiUrl}/adminSettings`,
            updatedSettings
          );
        }
      })
    );
  }

  private getDefaultAdminSettings(): AdminSettings {
    return {
      id: 'default',
      platformName: 'JobBoard Pro',
      platformDescription:
        'Professional job board platform connecting talent with opportunities',
      allowRegistration: true,
      requireEmailVerification: false,
      maxJobPostingsPerCompany: 50,
      jobPostingDurationDays: 30,
      featuredJobPrice: 99.99,
      maintenanceMode: false,
      supportEmail: 'support@jobboard.com',
      privacyPolicyUrl: '/privacy-policy',
      termsOfServiceUrl: '/terms-of-service',
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };
  }

  // User Management Methods
  getAllUsers(): Observable<UserManagement[]> {
    return forkJoin({
      users: this.http.get<any[]>(`${this.apiUrl}/users`),
      applications: this.http.get<any[]>(`${this.apiUrl}/jobApplications`),
      jobs: this.http.get<any[]>(`${this.apiUrl}/jobs`),
    }).pipe(
      map(({ users, applications, jobs }) => {
        return users.map((user) => {
          const userApplications = applications.filter(
            (app) => app.userId === user.id
          );
          const userJobs = jobs.filter((job) => job.companyId === user.id);

          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            phone: user.phone,
            location: user.location,
            companyName: user.companyName,
            jobApplicationsCount: userApplications.length,
            jobPostingsCount: userJobs.length,
          };
        });
      })
    );
  }

  updateUserStatus(
    userId: string,
    isActive: boolean
  ): Observable<UserManagement> {
    return this.http.patch<UserManagement>(`${this.apiUrl}/users/${userId}`, {
      isActive,
      updatedAt: new Date().toISOString(),
    });
  }

  updateUserRole(userId: string, role: string): Observable<UserManagement> {
    return this.http.patch<UserManagement>(`${this.apiUrl}/users/${userId}`, {
      role,
      updatedAt: new Date().toISOString(),
    });
  }

  deleteUser(userId: string): Observable<any> {
    // Use a simpler approach - just delete the user directly
    // The UI will handle the immediate update and refresh
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  // Job Management Methods for Admin
  getJobManagementStats(): Observable<JobManagementStats> {
    return forkJoin({
      jobs: this.http.get<any[]>(`${this.apiUrl}/jobs`),
      applications: this.http.get<any[]>(`${this.apiUrl}/jobApplications`),
    }).pipe(
      map(({ jobs, applications }) => {
        const now = new Date();
        const activeJobs = jobs.filter(
          (job) => job.isActive && new Date(job.applicationDeadline) > now
        );
        const pausedJobs = jobs.filter((job) => !job.isActive);
        const expiredJobs = jobs.filter(
          (job) => job.isActive && new Date(job.applicationDeadline) <= now
        );

        const pendingApplications = applications.filter(
          (app) => app.status === 'pending'
        );
        const approvedApplications = applications.filter((app) =>
          ['approved', 'shortlisted', 'hired'].includes(app.status)
        );
        const rejectedApplications = applications.filter(
          (app) => app.status === 'rejected'
        );

        return {
          totalJobs: jobs.length,
          activeJobs: activeJobs.length,
          pausedJobs: pausedJobs.length,
          expiredJobs: expiredJobs.length,
          totalApplications: applications.length,
          pendingApplications: pendingApplications.length,
          approvedApplications: approvedApplications.length,
          rejectedApplications: rejectedApplications.length,
        };
      })
    );
  }

  getAllJobsForAdmin(): Observable<any[]> {
    return forkJoin({
      jobs: this.http.get<any[]>(`${this.apiUrl}/jobs`),
      applications: this.http.get<any[]>(`${this.apiUrl}/jobApplications`),
      users: this.http.get<any[]>(`${this.apiUrl}/users`),
    }).pipe(
      map(({ jobs, applications, users }) => {
        return jobs.map((job) => {
          const jobApplications = applications.filter(
            (app) => app.jobId === job.id
          );
          const company = users.find(
            (user) =>
              user.id === job.companyId || user.companyName === job.company
          );

          return {
            ...job,
            applicationCount: jobApplications.length,
            companyContact: company
              ? `${company.firstName} ${company.lastName}`
              : 'Unknown',
            companyEmail: company?.email || 'Unknown',
            isExpired: new Date(job.applicationDeadline) <= new Date(),
            daysRemaining: Math.ceil(
              (new Date(job.applicationDeadline).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            ),
          };
        });
      })
    );
  }

  updateJobStatus(jobId: string, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/jobs/${jobId}`, {
      isActive,
      updatedAt: new Date().toISOString(),
    });
  }

  deleteJobAsAdmin(jobId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/jobs/${jobId}`);
  }

  // Helper methods
  getUserRoleDisplayName(role: string): string {
    switch (role) {
      case 'job-seeker':
        return 'Job Seeker';
      case 'company':
        return 'Company';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  }

  getJobStatusDisplayName(job: any): string {
    if (!job.isActive) return 'Paused';
    if (job.isExpired) return 'Expired';
    return 'Active';
  }

  getJobStatusClass(job: any): string {
    if (!job.isActive) return 'status-paused';
    if (job.isExpired) return 'status-expired';
    return 'status-active';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }
}
