import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService, User } from '../../../../core/services/auth.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import {
  JobApplicationService,
  JobApplication,
} from '../../../../core/services/job-application.service';
import { JobService } from '../../../../core/services/job.service';

interface AppliedJob {
  id: string;
  jobId: string;
  title: string;
  company: string;
  location: string;
  appliedDate: string;
  status: string;
  applicationId: string;
}

@Component({
  selector: 'app-applied-jobs',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './applied-jobs.component.html',
  styleUrl: './applied-jobs.component.css',
})
export class AppliedJobsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  appliedJobs: AppliedJob[] = [];
  filteredJobs: AppliedJob[] = [];
  isLoading = true;
  error: string | null = null;

  // Filter and search properties
  searchQuery = '';
  statusFilter = '';
  sortBy = 'date-desc';

  constructor(
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private jobApplicationService: JobApplicationService,
    private jobService: JobService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Initialize filters from URL parameters
    this.initializeFiltersFromUrl();

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        if (user) {
          this.loadAppliedJobs(user.id);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAppliedJobs(userId: string): void {
    this.isLoading = true;
    this.error = null;

    // Use JobApplicationService to get applications with details
    this.jobApplicationService
      .getUserApplicationsWithDetails(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (applications) => {
          // Map JobApplicationWithDetails to AppliedJob interface
          this.appliedJobs = applications
            .map((app) => ({
              id: app.id,
              jobId: app.jobId,
              title: app.jobTitle,
              company: app.company,
              location: app.location,
              appliedDate: app.submittedAt,
              status: app.status,
              applicationId: app.id,
            }))
            .sort(
              (a, b) =>
                new Date(b.appliedDate).getTime() -
                new Date(a.appliedDate).getTime()
            );
          this.applyFiltersAndSort();
          this.isLoading = false;

          // Apply URL filters after data is loaded
          this.initializeFiltersFromUrl();
        },
        error: (error) => {
          console.error('Error loading applied jobs:', error);
          this.error = 'Failed to load applied jobs';
          this.isLoading = false;
        },
      });
  }

  getStatusDisplayText(status: string): string {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'Submitted';
      case 'reviewed':
        return 'Reviewed';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'scheduled':
        return 'Interview Scheduled';
      default:
        // Capitalize first letter for unknown statuses
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'status-submitted';
      case 'reviewed':
        return 'status-reviewed';
      case 'accepted':
        return 'status-accepted';
      case 'rejected':
        return 'status-rejected';
      case 'scheduled':
        return 'status-interview';
      default:
        return 'status-submitted';
    }
  }

  // New methods for enhanced functionality
  getActiveApplicationsCount(): number {
    return this.appliedJobs.filter(
      (job) =>
        !['rejected', 'accepted', 'scheduled'].includes(
          job.status.toLowerCase()
        )
    ).length;
  }

  onSearch(): void {
    this.updateUrlParams();
    this.applyFiltersAndSort();
  }

  onFilterChange(): void {
    this.updateUrlParams();
    this.applyFiltersAndSort();
  }

  onSortChange(): void {
    this.updateUrlParams();
    this.applyFiltersAndSort();
  }

  private applyFiltersAndSort(): void {
    let filtered = [...this.appliedJobs];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.location.toLowerCase().includes(query)
      );
    }

    // Apply status filter (exact match only for the 4 defined statuses)
    if (this.statusFilter) {
      filtered = filtered.filter((job) => {
        return job.status.toLowerCase() === this.statusFilter.toLowerCase();
      });
    }

    // Apply sorting
    switch (this.sortBy) {
      case 'date-asc':
        filtered.sort(
          (a, b) =>
            new Date(a.appliedDate).getTime() -
            new Date(b.appliedDate).getTime()
        );
        break;
      case 'date-desc':
        filtered.sort(
          (a, b) =>
            new Date(b.appliedDate).getTime() -
            new Date(a.appliedDate).getTime()
        );
        break;
      case 'company':
        filtered.sort((a, b) => a.company.localeCompare(b.company));
        break;
      case 'status':
        filtered.sort((a, b) => a.status.localeCompare(b.status));
        break;
    }

    this.filteredJobs = filtered;
  }

  trackByJobId(index: number, job: AppliedJob): string {
    return job.id;
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'today';
    } else if (diffInDays === 1) {
      return '1 day ago';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  }

  // Correct Progress step methods

  // Current step shows ✓ tick
  isCurrentStep(step: string, currentStatus: string): boolean {
    return step.toLowerCase() === currentStatus.toLowerCase();
  }

  // Next step shows animation
  isStepActive(step: string, currentStatus: string): boolean {
    const nextStep = this.getNextStep(currentStatus);
    // Don't show animation for rejected applications beyond decision step
    if (currentStatus.toLowerCase() === 'rejected' && step === 'scheduled') {
      return false;
    }
    return step === nextStep;
  }

  // Previous steps show ✓ tick
  isStepCompleted(step: string, currentStatus: string): boolean {
    const stepOrder = ['submitted', 'reviewed', 'decision', 'scheduled'];
    const stepIndex = stepOrder.indexOf(step);
    const currentStepIndex = this.getCurrentStepIndex(currentStatus);

    // For rejected applications, don't mark scheduled as completed
    if (currentStatus.toLowerCase() === 'rejected' && step === 'scheduled') {
      return false;
    }

    return stepIndex < currentStepIndex;
  }

  private getCurrentStepIndex(status: string): number {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 1;
      case 'reviewed':
        return 2;
      case 'accepted':
        return 3;
      case 'rejected':
        return 3; // Rejected ends at decision step
      case 'scheduled':
        return 4;
      default:
        return 0;
    }
  }

  private getNextStep(status: string): string {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'reviewed';
      case 'reviewed':
        return 'decision';
      case 'accepted':
        return 'scheduled'; // Only accepted applications can proceed to scheduled
      case 'rejected':
        return ''; // Rejected applications have no next step
      case 'scheduled':
        return ''; // No next step
      default:
        return 'submitted';
    }
  }

  // Get progress percentage - line reaches current step then moves towards next
  getProgressPercentage(currentStatus: string): number {
    const stepIndex = this.getCurrentStepIndex(currentStatus);
    const status = currentStatus.toLowerCase();

    // For rejected applications, we have 3 steps total
    // For others, we have 4 steps total
    const totalSteps = status === 'rejected' ? 3 : 4;

    // Calculate the percentage based on step completion
    // Each step represents a segment of the total progress
    const basePercentage = ((stepIndex - 1) / (totalSteps - 1)) * 100;
    const nextStepPercentage = (stepIndex / (totalSteps - 1)) * 100;
    const animationOffset = (nextStepPercentage - basePercentage) * 0.5;

    switch (stepIndex) {
      case 1: // submitted - line reaches step 1, moves towards step 2
        return basePercentage + animationOffset;
      case 2: // reviewed - line reaches step 2, moves towards step 3
        return basePercentage + animationOffset;
      case 3: // accepted/rejected - line reaches step 3
        if (status === 'rejected') {
          return 100; // Rejected process is complete (100% of available space)
        } else if (status === 'accepted') {
          return basePercentage + animationOffset; // Accepted moves towards step 4
        }
        return basePercentage; // Default for decision step
      case 4: // scheduled - line reaches final step
        return 100; // 100% complete
      default:
        return animationOffset; // Before first step, show small progress
    }
  }

  // Action methods
  viewJobDetails(jobId: string): void {
    this.router.navigate(['/jobs', jobId]);
  }

  downloadApplication(job: AppliedJob): void {
    // Implement download functionality
    console.log('Downloading application for:', job.title);
    // This would typically generate and download a PDF of the application
  }

  /**
   * Get the count of filtered jobs (for badge display)
   */
  getFilteredCount(): number {
    return this.filteredJobs.length;
  }

  /**
   * Check if there are any active filters
   */
  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery.trim() ||
      this.statusFilter ||
      this.sortBy !== 'date-desc'
    );
  }

  /**
   * Initialize filters from URL parameters
   */
  private initializeFiltersFromUrl(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        // Set search query from URL parameter
        this.searchQuery = params['search'] || '';

        // Set status filter from URL parameter
        this.statusFilter = params['status'] || '';

        // Set sort option from URL parameter
        this.sortBy = params['sort'] || 'date-desc';

        // Apply filters if we have loaded jobs
        if (this.appliedJobs.length > 0) {
          this.applyFiltersAndSort();
        }
      });
  }

  /**
   * Update URL parameters when filters change
   */
  private updateUrlParams(): void {
    const queryParams: any = {};

    // Add search parameter if not empty
    if (this.searchQuery.trim()) {
      queryParams['search'] = this.searchQuery.trim();
    }

    // Add status filter parameter if not empty
    if (this.statusFilter) {
      queryParams['status'] = this.statusFilter;
    }

    // Add sort parameter if not default
    if (this.sortBy !== 'date-desc') {
      queryParams['sort'] = this.sortBy;
    }

    // Update URL without reloading the page
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'replace', // Replace current query params
      replaceUrl: true, // Don't add to browser history
    });
  }

  /**
   * Clear all filters and update URL
   */
  clearAllFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.sortBy = 'date-desc';

    // Clear URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });

    this.applyFiltersAndSort();
  }
}
