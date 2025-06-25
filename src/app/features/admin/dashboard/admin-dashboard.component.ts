import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService, User } from '../../../core/services/auth.service';
import {
  DashboardService,
  AdminDashboardStats,
  RecentJobPosting,
  RecentApplicationForAdmin,
} from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  isLoading = true;

  stats: AdminDashboardStats = {
    id: '',
    userId: '',
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    newApplications: 0,
    lastUpdated: '',
  };

  recentJobs: RecentJobPosting[] = [];
  recentApplications: RecentApplicationForAdmin[] = [];

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

    // Load admin dashboard stats
    this.dashboardService
      .getAdminDashboardStats(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error('Error loading admin dashboard stats:', error);
        },
      });

    // Load recent job postings
    this.dashboardService
      .getRecentJobPostings(3)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobs) => {
          this.recentJobs = jobs;
        },
        error: (error) => {
          console.error('Error loading recent job postings:', error);
        },
      });

    // Load recent applications
    this.dashboardService
      .getRecentApplicationsForAdmin(3)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (applications) => {
          this.recentApplications = applications;
        },
        error: (error) => {
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
        return 'Interview';
      case 'rejected':
        return 'Rejected';
      case 'hired':
        return 'Hired';
      default:
        return 'Unknown';
    }
  }
}
