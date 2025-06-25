import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { JobService, Job } from '../../../core/services/job.service';
import {
  SearchService,
  SearchFilters,
  SearchResults,
} from '../../../core/services/search.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { AuthService, User } from '../../../core/services/auth.service';
import { JobApplicationService } from '../../../core/services/job-application.service';
import { SavedJobsService } from '../../../core/services/saved-jobs.service';
import { ScrollService } from '../../../core/services/scroll.service';

@Component({
  selector: 'app-job-list',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.css',
})
export class JobListComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];
  isLoading = true;
  errorMessage = '';
  currentUser: User | null = null;
  appliedJobIds: Set<string> = new Set(); // Track which jobs the user has applied to
  savedJobIds: Set<string> = new Set(); // Track which jobs the user has saved
  searchResults: SearchResults = {
    jobs: [],
    totalCount: 0,
    filteredCount: 0,
    appliedFilters: {},
  };

  // Search and filter properties
  searchQuery = '';
  searchLocation = '';
  selectedJobType = '';
  selectedExperienceLevel = '';
  selectedSalaryRange = '';
  sortBy = 'newest';

  // Available filter options
  jobTypes = [
    { value: '', label: 'All Types' },
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'remote', label: 'Remote' },
  ];

  experienceLevels = [
    { value: '', label: 'All Levels' },
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'executive', label: 'Executive' },
  ];

  salaryRanges = [
    { value: '', label: 'All Salaries' },
    { value: '0-50k', label: '$0 - $50k' },
    { value: '50k-100k', label: '$50k - $100k' },
    { value: '100k-150k', label: '$100k - $150k' },
    { value: '150k+', label: '$150k+' },
  ];

  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'salary-high', label: 'Salary: High to Low' },
    { value: 'salary-low', label: 'Salary: Low to High' },
    { value: 'company', label: 'Company A-Z' },
  ];

  private subscriptions = new Subscription();

  constructor(
    private jobService: JobService,
    private searchService: SearchService,
    private route: ActivatedRoute,
    private router: Router,
    private navigationService: NavigationService,
    private authService: AuthService,
    private jobApplicationService: JobApplicationService,
    private savedJobsService: SavedJobsService,
    private scrollService: ScrollService
  ) {}

  ngOnInit(): void {
    this.initializeSearch();
    this.subscribeToSearchResults();
    this.loadQueryParams();
    this.loadCurrentUser();

    // Check if we need to scroll to a specific job after navigation
    this.checkForJobScrollTarget();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initializeSearch(): void {
    // Subscribe to search results
    const searchSub = this.searchService.searchResults$.subscribe({
      next: (results) => {
        this.searchResults = results;
        this.jobs = this.sortJobs(results.jobs);
        this.isLoading = false;
        // Check application and saved status after jobs are loaded
        this.checkApplicationStatus();
        this.checkSavedStatus();
      },
      error: (error) => {
        console.error('Error in search results:', error);
        this.errorMessage = 'Failed to load jobs. Please try again later.';
        this.isLoading = false;
      },
    });

    this.subscriptions.add(searchSub);
  }

  subscribeToSearchResults(): void {
    // Subscribe to route query parameters
    const routeSub = this.route.queryParams.subscribe((params) => {
      // Update component state from URL parameters
      this.searchQuery = params['q'] || '';
      this.searchLocation = params['location'] || '';
      this.selectedJobType = params['type'] || '';
      this.selectedExperienceLevel = params['level'] || '';
      this.selectedSalaryRange = params['salary'] || '';
      this.sortBy = params['sort'] || 'newest';

      // Update search service with parameters (without updating URL again)
      const filters: SearchFilters = {
        query: this.searchQuery || undefined,
        location: this.searchLocation || undefined,
        jobType: this.selectedJobType || undefined,
        experienceLevel: this.selectedExperienceLevel || undefined,
        salaryRange: this.selectedSalaryRange || undefined,
      };

      this.searchService.updateFilters(filters);
    });

    this.subscriptions.add(routeSub);
  }

  loadQueryParams(): void {
    // Initial load based on current query params
    const params = this.route.snapshot.queryParams;
    if (Object.keys(params).length === 0) {
      // No search params, load all jobs
      this.searchService.clearFilters();
    }
  }

  updateSearchFilters(): void {
    const filters: SearchFilters = {
      query: this.searchQuery || undefined,
      location: this.searchLocation || undefined,
      jobType: this.selectedJobType || undefined,
      experienceLevel: this.selectedExperienceLevel || undefined,
      salaryRange: this.selectedSalaryRange || undefined,
    };

    this.searchService.updateFilters(filters);
    this.updateUrlParams();
  }

  updateUrlParams(): void {
    const queryParams: any = {};

    // Add non-empty parameters to URL
    if (this.searchQuery?.trim()) {
      queryParams.q = this.searchQuery.trim();
    }
    if (this.searchLocation?.trim()) {
      queryParams.location = this.searchLocation.trim();
    }
    if (this.selectedJobType) {
      queryParams.type = this.selectedJobType;
    }
    if (this.selectedExperienceLevel) {
      queryParams.level = this.selectedExperienceLevel;
    }
    if (this.selectedSalaryRange) {
      queryParams.salary = this.selectedSalaryRange;
    }
    if (this.sortBy && this.sortBy !== 'newest') {
      queryParams.sort = this.sortBy;
    }

    // Store current state in navigation service
    this.navigationService.storeJobsPageState('/jobs', queryParams);

    // Update URL without triggering navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace',
    });
  }

  navigateToJobDetail(jobId: string): void {
    // Get current query parameters
    const currentParams = this.route.snapshot.queryParams;

    // Store current jobs page state before navigation, including the job ID
    this.navigationService.storeJobsPageState('/jobs', currentParams, jobId);

    // Navigate to job detail
    this.router.navigate(['/jobs', jobId]);
  }

  onSearch(): void {
    this.updateSearchFilters();
  }

  onFilterChange(): void {
    this.updateSearchFilters();
  }

  onSortChange(): void {
    this.jobs = this.sortJobs(this.searchResults.jobs);
    this.updateUrlParams();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.searchLocation = '';
    this.selectedJobType = '';
    this.selectedExperienceLevel = '';
    this.selectedSalaryRange = '';
    this.sortBy = 'newest';
    this.searchService.clearFilters();

    // Clear URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'replace',
    });
  }

  sortJobs(jobs: Job[]): Job[] {
    const sortedJobs = [...jobs];

    switch (this.sortBy) {
      case 'newest':
        return sortedJobs.sort(
          (a, b) =>
            new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
        );
      case 'oldest':
        return sortedJobs.sort(
          (a, b) =>
            new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime()
        );
      case 'salary-high':
        return sortedJobs.sort((a, b) => {
          const salaryA = this.extractMaxSalary(a.salary);
          const salaryB = this.extractMaxSalary(b.salary);
          return salaryB - salaryA;
        });
      case 'salary-low':
        return sortedJobs.sort((a, b) => {
          const salaryA = this.extractMaxSalary(a.salary);
          const salaryB = this.extractMaxSalary(b.salary);
          return salaryA - salaryB;
        });
      case 'company':
        return sortedJobs.sort((a, b) => a.company.localeCompare(b.company));
      default:
        return sortedJobs;
    }
  }

  extractMaxSalary(salary: string): number {
    const numbers = salary.match(/\d+/g);
    if (!numbers) return 0;

    const values = numbers.map((num) => {
      const value = parseInt(num);
      if (value < 1000 && salary.includes('k')) {
        return value * 1000;
      }
      return value;
    });

    return Math.max(...values);
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
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

  getJobTypeDisplay(type: string): string {
    const types: { [key: string]: string } = {
      'full-time': 'Full Time',
      'part-time': 'Part Time',
      contract: 'Contract',
      remote: 'Remote',
    };
    return types[type] || type;
  }

  getResultsText(): string {
    const { filteredCount, totalCount, searchQuery } = this.searchResults;

    if (searchQuery) {
      return `${filteredCount} jobs found for "${searchQuery}"`;
    } else if (filteredCount < totalCount) {
      return `${filteredCount} of ${totalCount} jobs`;
    } else {
      return `${totalCount} jobs found`;
    }
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.searchLocation ||
      this.selectedJobType ||
      this.selectedExperienceLevel ||
      this.selectedSalaryRange
    );
  }

  getExperienceLevelDisplay(level: string): string {
    const levelMap = this.experienceLevels.find((l) => l.value === level);
    return levelMap ? levelMap.label : level;
  }

  getSalaryRangeDisplay(range: string): string {
    const rangeMap = this.salaryRanges.find((r) => r.value === range);
    return rangeMap ? rangeMap.label : range;
  }

  private loadCurrentUser(): void {
    const userSub = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      // Check application and saved status when user changes
      this.checkApplicationStatus();
      this.checkSavedStatus();
    });
    this.subscriptions.add(userSub);
  }

  /**
   * Check if the current user has applied to any of the displayed jobs
   */
  private checkApplicationStatus(): void {
    if (
      !this.currentUser ||
      this.currentUser.role !== 'job-seeker' ||
      this.jobs.length === 0
    ) {
      this.appliedJobIds.clear();
      return;
    }

    // Create array of observables to check each job
    const applicationChecks = this.jobs.map((job) =>
      this.jobApplicationService
        .checkIfUserApplied(this.currentUser!.id, job.id)
        .pipe(map((hasApplied) => ({ jobId: job.id, hasApplied })))
    );

    // Execute all checks in parallel
    const checkSub = forkJoin(applicationChecks).subscribe({
      next: (results) => {
        this.appliedJobIds.clear();
        results.forEach((result) => {
          if (result.hasApplied) {
            this.appliedJobIds.add(result.jobId);
          }
        });
      },
      error: (error) => {
        console.error('Error checking application status:', error);
        // Don't clear the set on error, keep existing state
      },
    });

    this.subscriptions.add(checkSub);
  }

  /**
   * Check if the current user has applied to a specific job
   */
  hasAppliedToJob(jobId: string): boolean {
    return this.appliedJobIds.has(jobId);
  }

  /**
   * Get the appropriate button text for the apply button
   */
  getApplyButtonText(jobId: string): string {
    return this.hasAppliedToJob(jobId) ? 'Applied' : 'Apply Now';
  }

  /**
   * Check if the apply button should be disabled
   */
  isApplyButtonDisabled(jobId: string): boolean {
    return this.hasAppliedToJob(jobId);
  }

  /**
   * Check saved status for all displayed jobs
   */
  private checkSavedStatus(): void {
    if (
      !this.currentUser ||
      this.currentUser.role !== 'job-seeker' ||
      this.jobs.length === 0
    ) {
      this.savedJobIds.clear();
      return;
    }

    const savedSub = this.savedJobsService
      .getSavedJobIds(this.currentUser.id)
      .subscribe({
        next: (savedIds) => {
          this.savedJobIds = savedIds;
        },
        error: (error) => {
          console.error('Error checking saved status:', error);
          // Don't clear the set on error, keep existing state
        },
      });

    this.subscriptions.add(savedSub);
  }

  /**
   * Check if a job is saved by the current user
   */
  isJobSaved(jobId: string): boolean {
    return this.savedJobIds.has(jobId);
  }

  /**
   * Get the appropriate text for the save button
   */
  getSaveButtonText(jobId: string): string {
    return this.isJobSaved(jobId) ? 'Saved' : 'Save Job';
  }

  /**
   * Toggle save status of a job
   */
  toggleSaveJob(jobId: string): void {
    console.log('toggleSaveJob called with jobId:', jobId);
    console.log('currentUser:', this.currentUser);

    if (!this.currentUser || this.currentUser.role !== 'job-seeker') {
      console.log(
        'User not authenticated or not a job seeker, redirecting to signin'
      );
      this.router.navigate(['/auth/signin'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    console.log(
      'Calling savedJobsService.toggleSaveJob with userId:',
      this.currentUser.id,
      'jobId:',
      jobId
    );

    const toggleSub = this.savedJobsService
      .toggleSaveJob(this.currentUser.id, jobId)
      .subscribe({
        next: (result) => {
          console.log('toggleSaveJob success:', result);
          if (result.saved) {
            this.savedJobIds.add(jobId);
            console.log('Job saved, added to savedJobIds');
          } else {
            this.savedJobIds.delete(jobId);
            console.log('Job unsaved, removed from savedJobIds');
          }
          console.log('Current savedJobIds:', this.savedJobIds);
        },
        error: (error) => {
          console.error('Error toggling save status:', error);
          console.error('Error details:', error.message, error.status);
        },
      });

    this.subscriptions.add(toggleSub);
  }

  applyForJob(jobId: string): void {
    // Don't allow applying if already applied
    if (this.hasAppliedToJob(jobId)) {
      return;
    }

    // Check if user is authenticated
    if (!this.currentUser) {
      this.router.navigate(['/auth/signin'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    // Check if user is a job seeker
    if (this.currentUser.role !== 'job-seeker') {
      // Could show an error message here
      console.error('Only job seekers can apply for jobs');
      return;
    }

    // Store current jobs page state before navigation
    const currentParams = this.route.snapshot.queryParams;
    this.navigationService.storeJobsPageState('/jobs', currentParams);

    // Navigate to job application page
    this.router.navigate(['/jobs', jobId, 'apply']);
  }

  /**
   * Check if we need to scroll to a specific job after returning from job detail
   */
  private checkForJobScrollTarget(): void {
    const targetJobId = this.navigationService.getLastViewedJobId();
    if (targetJobId) {
      // Use a more efficient approach with single subscription
      let hasScrolled = false;

      const scrollSubscription = this.searchService.searchResults$.subscribe(
        (results) => {
          if (results.jobs.length > 0 && !hasScrolled) {
            hasScrolled = true;

            // Use requestAnimationFrame for better performance
            requestAnimationFrame(() => {
              // Additional frame to ensure DOM is fully rendered
              requestAnimationFrame(() => {
                this.scrollToJob(targetJobId);
                // Clear the target job ID after scrolling
                this.navigationService.clearLastViewedJobId();
                // Unsubscribe to prevent memory leaks
                scrollSubscription.unsubscribe();
              });
            });
          }
        }
      );

      // Add to subscriptions for cleanup
      this.subscriptions.add(scrollSubscription);
    }
  }

  /**
   * Scroll to a specific job card in the list
   */
  private scrollToJob(jobId: string): void {
    const jobElement = document.getElementById(`job-card-${jobId}`);
    if (jobElement) {
      // Check if user prefers reduced motion
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      // Get element position for manual smooth scroll
      const elementRect = jobElement.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.scrollY;
      const offset = 120; // Header offset
      const targetPosition = absoluteElementTop - offset;

      // Use optimized smooth scroll
      if (prefersReducedMotion) {
        // Instant scroll for reduced motion preference
        window.scrollTo(0, targetPosition);
        this.addHighlightEffect(jobElement);
      } else {
        // Custom smooth scroll with better performance
        this.smoothScrollTo(targetPosition, () => {
          this.addHighlightEffect(jobElement);
        });
      }
    }
  }

  /**
   * Custom smooth scroll implementation for better performance
   */
  private smoothScrollTo(targetY: number, callback?: () => void): void {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = Math.min(800, Math.abs(distance) * 0.5); // Adaptive duration
    let startTime: number;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };

    const scroll = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * ease);

      if (progress < 1) {
        requestAnimationFrame(scroll);
      } else if (callback) {
        callback();
      }
    };

    requestAnimationFrame(scroll);
  }

  /**
   * Add highlight effect to job card
   */
  private addHighlightEffect(jobElement: HTMLElement): void {
    // Add highlight effect with better performance
    jobElement.classList.add('highlight-job');

    // Use passive event listener for better performance
    const removeHighlight = () => {
      jobElement.classList.remove('highlight-job');
    };

    // Remove highlight after animation
    setTimeout(removeHighlight, 2000);
  }
}
