import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { AdminManagementService } from '../../../core/services/admin-management.service';
import {
  JobManagementService,
  Job,
} from '../../../core/services/job-management.service';
import { AuthService, User } from '../../../core/services/auth.service';

interface JobWithMetadata extends Job {
  companyContact?: string;
  companyEmail?: string;
  isExpired?: boolean;
  daysRemaining?: number;
}

@Component({
  selector: 'app-job-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './job-management.component.html',
  styleUrls: ['./job-management.component.css'],
})
export class JobManagementComponent implements OnInit, OnDestroy {
  jobs: JobWithMetadata[] = [];
  filteredJobs: JobWithMetadata[] = [];
  currentUser: User | null = null;
  isLoading = true;
  error: string | null = null;
  success: string | null = null;
  Math = Math; // Make Math available in template

  // Filters
  searchQuery = '';
  statusFilter = 'all'; // all, active, inactive, expired
  sortBy = 'newest'; // newest, oldest, title, company, applications

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // Selection
  selectedJobs: string[] = [];
  selectAll = false;

  private subscriptions = new Subscription();

  constructor(
    private adminManagementService: AdminManagementService,
    private jobManagementService: JobManagementService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadJobs();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadCurrentUser(): void {
    const userSub = this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (error) => {
        console.error('Error loading user:', error);
      },
    });
    this.subscriptions.add(userSub);
  }

  private loadJobs(): void {
    this.isLoading = true;
    this.error = null;

    const jobsSub = this.adminManagementService.getAllJobsForAdmin().subscribe({
      next: (jobs) => {
        this.jobs = jobs;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading jobs:', error);
        this.error = 'Failed to load jobs';
        this.isLoading = false;
      },
    });
    this.subscriptions.add(jobsSub);
  }

  applyFilters(): void {
    let filtered = [...this.jobs];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.location.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((job) => {
        switch (this.statusFilter) {
          case 'active':
            return job.isActive && !job.isExpired;
          case 'inactive':
            return !job.isActive;
          case 'expired':
            return job.isExpired;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'oldest':
          return (
            new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime()
          );
        case 'title':
          return a.title.localeCompare(b.title);
        case 'company':
          return a.company.localeCompare(b.company);
        case 'applications':
          return (b.applicationCount || 0) - (a.applicationCount || 0);
        case 'newest':
        default:
          return (
            new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
          );
      }
    });

    this.filteredJobs = filtered;
    this.updatePagination();
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredJobs.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  get paginatedJobs(): JobWithMetadata[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredJobs.slice(startIndex, endIndex);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Selection methods
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.selectedJobs = this.paginatedJobs.map((job) => job.id);
    } else {
      this.selectedJobs = [];
    }
  }

  toggleJobSelection(jobId: string): void {
    const index = this.selectedJobs.indexOf(jobId);
    if (index > -1) {
      this.selectedJobs.splice(index, 1);
    } else {
      this.selectedJobs.push(jobId);
    }
    this.selectAll = this.selectedJobs.length === this.paginatedJobs.length;
  }

  isJobSelected(jobId: string): boolean {
    return this.selectedJobs.includes(jobId);
  }

  // Job actions
  editJob(jobId: string): void {
    this.router.navigate(['/jobs', jobId, 'edit']);
  }

  viewJob(jobId: string): void {
    this.router.navigate(['/jobs', jobId]);
  }

  toggleJobStatus(job: JobWithMetadata): void {
    const updateSub = this.adminManagementService
      .updateJobStatus(job.id, !job.isActive)
      .subscribe({
        next: () => {
          job.isActive = !job.isActive;
          this.success = `Job ${
            job.isActive ? 'activated' : 'deactivated'
          } successfully`;
          setTimeout(() => (this.success = null), 3000);
        },
        error: (error) => {
          console.error('Error updating job status:', error);
          this.error = 'Failed to update job status';
          setTimeout(() => (this.error = null), 3000);
        },
      });
    this.subscriptions.add(updateSub);
  }

  deleteJob(job: JobWithMetadata): void {
    if (
      confirm(
        `Are you sure you want to delete "${job.title}"? This action cannot be undone.`
      )
    ) {
      const deleteSub = this.adminManagementService
        .deleteJobAsAdmin(job.id)
        .subscribe({
          next: () => {
            this.jobs = this.jobs.filter((j) => j.id !== job.id);
            this.applyFilters();
            this.success = 'Job deleted successfully';
            setTimeout(() => (this.success = null), 3000);
          },
          error: (error) => {
            console.error('Error deleting job:', error);
            this.error = 'Failed to delete job';
            setTimeout(() => (this.error = null), 3000);
          },
        });
      this.subscriptions.add(deleteSub);
    }
  }

  // Bulk actions
  bulkActivate(): void {
    if (this.selectedJobs.length === 0) return;

    const promises = this.selectedJobs.map((jobId) =>
      this.adminManagementService.updateJobStatus(jobId, true).toPromise()
    );

    Promise.all(promises)
      .then(() => {
        this.selectedJobs.forEach((jobId) => {
          const job = this.jobs.find((j) => j.id === jobId);
          if (job) job.isActive = true;
        });
        this.selectedJobs = [];
        this.selectAll = false;
        this.success = 'Selected jobs activated successfully';
        setTimeout(() => (this.success = null), 3000);
      })
      .catch((error) => {
        console.error('Error activating jobs:', error);
        this.error = 'Failed to activate some jobs';
        setTimeout(() => (this.error = null), 3000);
      });
  }

  bulkDeactivate(): void {
    if (this.selectedJobs.length === 0) return;

    const promises = this.selectedJobs.map((jobId) =>
      this.adminManagementService.updateJobStatus(jobId, false).toPromise()
    );

    Promise.all(promises)
      .then(() => {
        this.selectedJobs.forEach((jobId) => {
          const job = this.jobs.find((j) => j.id === jobId);
          if (job) job.isActive = false;
        });
        this.selectedJobs = [];
        this.selectAll = false;
        this.success = 'Selected jobs deactivated successfully';
        setTimeout(() => (this.success = null), 3000);
      })
      .catch((error) => {
        console.error('Error deactivating jobs:', error);
        this.error = 'Failed to deactivate some jobs';
        setTimeout(() => (this.error = null), 3000);
      });
  }

  bulkDelete(): void {
    if (this.selectedJobs.length === 0) return;

    if (
      confirm(
        `Are you sure you want to delete ${this.selectedJobs.length} selected jobs? This action cannot be undone.`
      )
    ) {
      const promises = this.selectedJobs.map((jobId) =>
        this.adminManagementService.deleteJobAsAdmin(jobId).toPromise()
      );

      Promise.all(promises)
        .then(() => {
          this.jobs = this.jobs.filter(
            (job) => !this.selectedJobs.includes(job.id)
          );
          this.selectedJobs = [];
          this.selectAll = false;
          this.applyFilters();
          this.success = 'Selected jobs deleted successfully';
          setTimeout(() => (this.success = null), 3000);
        })
        .catch((error) => {
          console.error('Error deleting jobs:', error);
          this.error = 'Failed to delete some jobs';
          setTimeout(() => (this.error = null), 3000);
        });
    }
  }

  // Utility methods
  getStatusBadgeClass(job: JobWithMetadata): string {
    if (job.isExpired) return 'status-expired';
    if (job.isActive) return 'status-active';
    return 'status-inactive';
  }

  getStatusText(job: JobWithMetadata): string {
    if (job.isExpired) return 'Expired';
    if (job.isActive) return 'Active';
    return 'Inactive';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  goToPostJob(): void {
    this.router.navigate(['/post-job']);
  }

  refreshJobs(): void {
    this.loadJobs();
  }

  getMaxDisplayed(): number {
    return Math.min(
      this.currentPage * this.itemsPerPage,
      this.filteredJobs.length
    );
  }
}
