import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private previousJobsUrl: string = '/jobs';
  private previousJobsParams: any = {};
  private lastViewedJobId: string | null = null; // Store the job ID that was clicked

  constructor(private router: Router) {}

  /**
   * Store the current jobs page URL with filters for later navigation
   */
  storeJobsPageState(url: string, queryParams: any, jobId?: string): void {
    this.previousJobsUrl = url;
    this.previousJobsParams = { ...queryParams };
    if (jobId) {
      this.lastViewedJobId = jobId;
    }
  }

  /**
   * Navigate back to the jobs page with preserved filters
   */
  navigateBackToJobs(): void {
    if (Object.keys(this.previousJobsParams).length > 0) {
      // Navigate with preserved query parameters
      this.router.navigate(['/jobs'], {
        queryParams: this.previousJobsParams,
      });
    } else {
      // Navigate to jobs page without parameters
      this.router.navigate(['/jobs']);
    }
  }

  /**
   * Navigate to job detail page and store current jobs state
   */
  navigateToJobDetail(
    jobId: string,
    currentUrl: string,
    currentParams: any
  ): void {
    // Store current jobs page state
    this.storeJobsPageState(currentUrl, currentParams);

    // Navigate to job detail
    this.router.navigate(['/jobs', jobId]);
  }

  /**
   * Get the stored jobs page URL
   */
  getPreviousJobsUrl(): string {
    return this.previousJobsUrl;
  }

  /**
   * Get the stored jobs page parameters
   */
  getPreviousJobsParams(): any {
    return { ...this.previousJobsParams };
  }

  /**
   * Get the stored jobs page state (URL and params)
   */
  getJobsPageState(): { route: string; queryParams: any } | null {
    if (this.previousJobsUrl) {
      return {
        route: this.previousJobsUrl,
        queryParams: { ...this.previousJobsParams },
      };
    }
    return null;
  }

  /**
   * Get the last viewed job ID (for scrolling back to specific job)
   */
  getLastViewedJobId(): string | null {
    return this.lastViewedJobId;
  }

  /**
   * Clear the last viewed job ID
   */
  clearLastViewedJobId(): void {
    this.lastViewedJobId = null;
  }

  /**
   * Clear stored navigation state
   */
  clearStoredState(): void {
    this.previousJobsUrl = '/jobs';
    this.previousJobsParams = {};
    this.lastViewedJobId = null;
  }

  /**
   * Check if there are stored filter parameters
   */
  hasStoredFilters(): boolean {
    return Object.keys(this.previousJobsParams).length > 0;
  }

  /**
   * Get a human-readable description of stored filters
   */
  getStoredFiltersDescription(): string {
    const params = this.previousJobsParams;
    const descriptions: string[] = [];

    if (params.q) {
      descriptions.push(`Search: "${params.q}"`);
    }
    if (params.location) {
      descriptions.push(`Location: "${params.location}"`);
    }
    if (params.type) {
      descriptions.push(`Type: ${this.getJobTypeDisplay(params.type)}`);
    }
    if (params.level) {
      descriptions.push(
        `Level: ${this.getExperienceLevelDisplay(params.level)}`
      );
    }
    if (params.salary) {
      descriptions.push(`Salary: ${this.getSalaryRangeDisplay(params.salary)}`);
    }

    return descriptions.length > 0 ? descriptions.join(', ') : 'No filters';
  }

  private getJobTypeDisplay(type: string): string {
    const types: { [key: string]: string } = {
      'full-time': 'Full Time',
      'part-time': 'Part Time',
      contract: 'Contract',
      remote: 'Remote',
    };
    return types[type] || type;
  }

  private getExperienceLevelDisplay(level: string): string {
    const levels: { [key: string]: string } = {
      entry: 'Entry Level',
      mid: 'Mid Level',
      senior: 'Senior Level',
      executive: 'Executive Level',
    };
    return levels[level] || level;
  }

  private getSalaryRangeDisplay(range: string): string {
    const ranges: { [key: string]: string } = {
      '0-50k': '$0 - $50k',
      '50k-100k': '$50k - $100k',
      '100k-150k': '$100k - $150k',
      '150k+': '$150k+',
    };
    return ranges[range] || range;
  }
}
