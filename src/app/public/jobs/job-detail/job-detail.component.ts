import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../../core/services/auth.service';
import { JobService, Job } from '../../../core/services/job.service';
import { JobApplicationService } from '../../../core/services/job-application.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { SavedJobsService } from '../../../core/services/saved-jobs.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-job-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.css',
})
export class JobDetailComponent implements OnInit, OnDestroy {
  job: Job | null = null;
  currentUser: User | null = null;
  isLoading = true;
  hasApplied = false;
  isApplying = false;
  isSaved = false;
  errorMessage = '';
  successMessage = '';

  private routeSubscription: Subscription = new Subscription();
  private authSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private jobService: JobService,
    private jobApplicationService: JobApplicationService,
    private navigationService: NavigationService,
    private savedJobsService: SavedJobsService
  ) {}

  ngOnInit(): void {
    // Subscribe to route parameters
    this.routeSubscription = this.route.params.subscribe((params) => {
      const jobId = params['id'];
      if (jobId) {
        this.loadJob(jobId);
      }
    });

    // Subscribe to authentication state
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (this.job && user) {
        this.checkApplicationStatus();
        this.checkSavedStatus();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
    this.authSubscription.unsubscribe();
  }

  private loadJob(jobId: string) {
    this.isLoading = true;
    this.errorMessage = '';

    this.jobService.getJobById(jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.isLoading = false;

        if (!this.job) {
          this.errorMessage = 'Job not found';
        } else if (this.currentUser) {
          this.checkApplicationStatus();
          this.checkSavedStatus();
        }
      },
      error: (error) => {
        console.error('Error loading job:', error);
        this.errorMessage =
          'Failed to load job details. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  private checkApplicationStatus() {
    if (!this.job || !this.currentUser) return;

    this.jobApplicationService
      .checkIfUserApplied(this.currentUser.id, this.job.id)
      .subscribe({
        next: (hasApplied: boolean) => {
          this.hasApplied = hasApplied;
        },
        error: (error: any) => {
          console.error('Error checking application status:', error);
        },
      });
  }

  private checkSavedStatus() {
    if (
      !this.job ||
      !this.currentUser ||
      this.currentUser.role !== 'job-seeker'
    )
      return;

    this.savedJobsService
      .isJobSaved(this.currentUser.id, this.job.id)
      .subscribe({
        next: (isSaved: boolean) => {
          this.isSaved = isSaved;
        },
        error: (error: any) => {
          console.error('Error checking saved status:', error);
        },
      });
  }

  applyForJob() {
    if (!this.job || !this.currentUser || this.hasApplied || this.isApplying) {
      return;
    }

    // Store current job ID for potential return navigation
    const storedState = this.navigationService.getJobsPageState();
    if (storedState) {
      this.navigationService.storeJobsPageState(
        storedState.route,
        storedState.queryParams,
        this.job.id
      );
    }

    // Navigate to application page
    this.router.navigate(['/jobs', this.job.id, 'apply']);
  }

  goBack() {
    // Check if we have stored navigation state
    const storedState = this.navigationService.getJobsPageState();
    if (storedState) {
      // Navigate back to jobs page with stored filters
      this.router.navigate([storedState.route], {
        queryParams: storedState.queryParams,
      });
    } else {
      // Default back to jobs page
      this.router.navigate(['/jobs']);
    }
  }

  hasStoredFilters(): boolean {
    const storedState = this.navigationService.getJobsPageState();
    return !!(
      storedState &&
      storedState.queryParams &&
      Object.keys(storedState.queryParams).length > 0
    );
  }

  getStoredFiltersDescription(): string {
    const storedState = this.navigationService.getJobsPageState();
    if (!storedState || !storedState.queryParams) return '';

    const params = storedState.queryParams;
    const descriptions: string[] = [];

    if (params['q']) descriptions.push(`"${params['q']}"`);
    if (params['location']) descriptions.push(`in ${params['location']}`);
    if (params['type']) descriptions.push(`${params['type']} jobs`);
    if (params['level']) descriptions.push(`${params['level']} level`);
    if (params['salary']) descriptions.push(`${params['salary']} salary`);

    return descriptions.join(', ');
  }

  shareJob() {
    if (navigator.share && this.job) {
      navigator.share({
        title: this.job.title,
        text: `Check out this job opportunity: ${this.job.title} at ${this.job.company}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.successMessage = 'Job link copied to clipboard!';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      });
    }
  }

  getExperienceLevelDisplay(): string {
    if (!this.job) return '';

    const levels: { [key: string]: string } = {
      entry: 'Entry Level',
      mid: 'Mid Level',
      senior: 'Senior Level',
      executive: 'Executive Level',
    };

    return levels[this.job.experienceLevel] || this.job.experienceLevel;
  }

  getJobTypeDisplay(): string {
    if (!this.job) return '';

    const types: { [key: string]: string } = {
      'full-time': 'Full Time',
      'part-time': 'Part Time',
      contract: 'Contract',
      remote: 'Remote',
    };

    return types[this.job.type] || this.job.type;
  }

  getTimeAgo(): string {
    if (!this.job) return '';

    const date = new Date(this.job.postedDate);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return '1 day ago';
    } else {
      return `${diffInDays} days ago`;
    }
  }

  canApply(): boolean {
    return !!(
      this.currentUser &&
      this.currentUser.role === 'job-seeker' &&
      this.job &&
      !this.hasApplied &&
      !this.isApplying
    );
  }

  getApplyButtonText(): string {
    if (this.hasApplied) return 'Applied';
    if (this.isApplying) return 'Applying...';
    return 'Apply Now';
  }

  canSave(): boolean {
    return !!(
      this.currentUser &&
      this.currentUser.role === 'job-seeker' &&
      this.job
    );
  }

  getSaveButtonText(): string {
    return this.isSaved ? 'Saved' : 'Save Job';
  }

  toggleSaveJob() {
    if (!this.canSave()) {
      this.router.navigate(['/auth/signin'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.savedJobsService
      .toggleSaveJob(this.currentUser!.id, this.job!.id)
      .subscribe({
        next: (result) => {
          this.isSaved = result.saved;
          // Remove success message toast - just update the state silently
        },
        error: (error) => {
          console.error('Error toggling save status:', error);
          this.errorMessage = 'Failed to save job. Please try again.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 3000);
        },
      });
  }
}
