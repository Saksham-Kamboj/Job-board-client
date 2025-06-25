import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService, User } from '../../../core/services/auth.service';
import {
  DashboardService,
  CompanyDashboardStats,
  RecentJobPosting,
  RecentApplicationForCompany,
} from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-company-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './company-dashboard.component.html',
  styleUrl: './company-dashboard.component.css',
})
export class CompanyDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  isLoading = true;

  stats: CompanyDashboardStats = {
    id: '',
    userId: '',
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    newApplications: 0,
    lastUpdated: '',
  };

  recentJobs: RecentJobPosting[] = [];
  recentApplications: RecentApplicationForCompany[] = [];

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        if (user) {
          this.loadDashboardData(user.id);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(userId: string): void {
    this.isLoading = true;

    // Load company dashboard stats
    this.dashboardService
      .getCompanyDashboardStats(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats: CompanyDashboardStats) => {
          this.stats = stats;
        },
        error: (error: any) => {
          console.error('Error loading company dashboard stats:', error);
        },
      });

    // Load company's recent job postings
    this.dashboardService
      .getCompanyRecentJobPostings(userId, 3)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobs: RecentJobPosting[]) => {
          this.recentJobs = jobs;
        },
        error: (error: any) => {
          console.error('Error loading recent job postings:', error);
        },
      });

    // Load recent applications for company's jobs
    this.dashboardService
      .getCompanyRecentApplications(userId, 3)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (applications: RecentApplicationForCompany[]) => {
          this.recentApplications = applications;
        },
        error: (error: any) => {
          console.error('Error loading recent applications:', error);
        },
      });
  }

  getJobStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'paused':
        return 'status-paused';
      case 'closed':
        return 'status-closed';
      case 'draft':
        return 'status-draft';
      default:
        return 'status-active';
    }
  }

  getJobStatusText(status: string): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'closed':
        return 'Closed';
      case 'draft':
        return 'Draft';
      default:
        return 'Unknown';
    }
  }

  getApplicationStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'reviewed':
        return 'status-reviewed';
      case 'interview':
        return 'status-interview';
      case 'rejected':
        return 'status-rejected';
      case 'hired':
        return 'status-hired';
      default:
        return 'status-pending';
    }
  }

  getApplicationStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'reviewed':
        return 'Reviewed';
      case 'interview':
        return 'Interview Scheduled';
      case 'rejected':
        return 'Not Selected';
      case 'hired':
        return 'Hired';
      default:
        return 'Unknown';
    }
  }

  getApplicationPriorityClass(priority: string): string {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  }

  getJobPerformanceClass(applications: number): string {
    if (applications >= 20) return 'performance-excellent';
    if (applications >= 10) return 'performance-good';
    if (applications >= 5) return 'performance-fair';
    return 'performance-poor';
  }

  getCompanyName(): string {
    if (this.currentUser) {
      // Try to get company name from user data
      const companyUser = this.currentUser as any;
      return (
        companyUser.companyName ||
        `${this.currentUser.firstName} ${this.currentUser.lastName}`
      );
    }
    return 'Your Company';
  }
}
