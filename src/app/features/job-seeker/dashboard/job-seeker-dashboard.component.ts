import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService, User } from '../../../core/services/auth.service';
import {
  DashboardService,
  JobSeekerDashboardStats,
  RecentJobPosting,
  RecentApplication,
} from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-job-seeker-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './job-seeker-dashboard.component.html',
  styleUrl: './job-seeker-dashboard.component.css',
})
export class JobSeekerDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  isLoading = true;

  stats: JobSeekerDashboardStats = {
    id: '',
    userId: '',
    totalApplications: 0,
    pendingApplications: 0,
    interviewsScheduled: 0,
    savedJobs: 0,
    lastUpdated: '',
  };

  recentJobs: RecentJobPosting[] = [];
  recentApplications: RecentApplication[] = [];

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

    // Load job seeker dashboard stats
    this.dashboardService
      .getJobSeekerDashboardStats(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats: JobSeekerDashboardStats) => {
          this.stats = stats;
        },
        error: (error: any) => {
          console.error('Error loading job seeker dashboard stats:', error);
        },
      });

    // Load recent job postings (excluding jobs user has already applied to)
    this.dashboardService
      .getRecentJobPostings(3, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobs) => {
          this.recentJobs = jobs;
        },
        error: (error) => {
          console.error('Error loading recent job postings:', error);
        },
      });

    // Load user's recent applications
    this.dashboardService
      .getUserRecentApplications(userId, 3)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (applications: RecentApplication[]) => {
          this.recentApplications = applications;
        },
        error: (error: any) => {
          console.error('Error loading recent applications:', error);
        },
      });
  }

  getApplicationStatusClass(status: string): string {
    switch (status) {
      case 'submitted':
        return 'status-submitted';
      case 'under-review':
        return 'status-under-review';
      case 'pending':
        return 'status-pending';
      case 'interview':
        return 'status-interview';
      case 'shortlisted':
        return 'status-shortlisted';
      case 'reviewed':
        return 'status-reviewed';
      case 'rejected':
        return 'status-rejected';
      case 'accepted':
        return 'status-accepted';
      default:
        return 'status-submitted';
    }
  }

  getApplicationStatusText(status: string): string {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'under-review':
        return 'Under Review';
      case 'pending':
        return 'Pending';
      case 'interview':
        return 'Interview';
      case 'shortlisted':
        return 'Shortlisted';
      case 'reviewed':
        return 'Reviewed';
      case 'rejected':
        return 'Rejected';
      case 'accepted':
        return 'Accepted';
      default:
        return 'Submitted';
    }
  }

  getJobTypeClass(type: string): string {
    switch (type) {
      case 'full-time':
        return 'type-full-time';
      case 'part-time':
        return 'type-part-time';
      case 'contract':
        return 'type-contract';
      case 'remote':
        return 'type-remote';
      default:
        return 'type-full-time';
    }
  }

  getJobTypeText(type: string): string {
    switch (type) {
      case 'full-time':
        return 'Full-time';
      case 'part-time':
        return 'Part-time';
      case 'contract':
        return 'Contract';
      case 'remote':
        return 'Remote';
      default:
        return 'Full-time';
    }
  }
}
