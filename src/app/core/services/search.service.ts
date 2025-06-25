import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { JobService, Job } from './job.service';

export interface SearchFilters {
  query?: string;
  location?: string;
  jobType?: string;
  experienceLevel?: string;
  salaryRange?: string;
  company?: string;
  skills?: string[];
  remote?: boolean;
}

export interface SearchResults {
  jobs: Job[];
  totalCount: number;
  filteredCount: number;
  searchQuery?: string;
  appliedFilters: SearchFilters;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchFiltersSubject = new BehaviorSubject<SearchFilters>({});
  private searchResultsSubject = new BehaviorSubject<SearchResults>({
    jobs: [],
    totalCount: 0,
    filteredCount: 0,
    appliedFilters: {}
  });

  public searchFilters$ = this.searchFiltersSubject.asObservable();
  public searchResults$ = this.searchResultsSubject.asObservable();

  constructor(private jobService: JobService) {
    // Subscribe to filter changes and update results
    this.searchFilters$.subscribe(filters => {
      this.performSearch(filters);
    });
  }

  /**
   * Update search filters
   */
  updateFilters(filters: Partial<SearchFilters>): void {
    const currentFilters = this.searchFiltersSubject.value;
    const newFilters = { ...currentFilters, ...filters };
    this.searchFiltersSubject.next(newFilters);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchFiltersSubject.next({});
  }

  /**
   * Get current filters
   */
  getCurrentFilters(): SearchFilters {
    return this.searchFiltersSubject.value;
  }

  /**
   * Perform search with current filters
   */
  private performSearch(filters: SearchFilters): void {
    this.jobService.getAllJobs().subscribe({
      next: (allJobs) => {
        const filteredJobs = this.filterJobs(allJobs, filters);
        
        const results: SearchResults = {
          jobs: filteredJobs,
          totalCount: allJobs.length,
          filteredCount: filteredJobs.length,
          searchQuery: filters.query,
          appliedFilters: filters
        };

        this.searchResultsSubject.next(results);
      },
      error: (error) => {
        console.error('Error performing search:', error);
        this.searchResultsSubject.next({
          jobs: [],
          totalCount: 0,
          filteredCount: 0,
          appliedFilters: filters
        });
      }
    });
  }

  /**
   * Filter jobs based on search criteria
   */
  private filterJobs(jobs: Job[], filters: SearchFilters): Job[] {
    let filteredJobs = [...jobs];

    // Text search (query)
    if (filters.query && filters.query.trim()) {
      const query = filters.query.toLowerCase().trim();
      filteredJobs = filteredJobs.filter(job => 
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.skills.some(skill => skill.toLowerCase().includes(query)) ||
        job.requirements.some(req => req.toLowerCase().includes(query))
      );
    }

    // Location filter
    if (filters.location && filters.location.trim()) {
      const location = filters.location.toLowerCase().trim();
      filteredJobs = filteredJobs.filter(job => 
        job.location.toLowerCase().includes(location) ||
        (location === 'remote' && (job.type === 'remote' || job.location.toLowerCase().includes('remote')))
      );
    }

    // Job type filter
    if (filters.jobType) {
      filteredJobs = filteredJobs.filter(job => job.type === filters.jobType);
    }

    // Experience level filter
    if (filters.experienceLevel) {
      filteredJobs = filteredJobs.filter(job => job.experienceLevel === filters.experienceLevel);
    }

    // Company filter
    if (filters.company && filters.company.trim()) {
      const company = filters.company.toLowerCase().trim();
      filteredJobs = filteredJobs.filter(job => 
        job.company.toLowerCase().includes(company)
      );
    }

    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      filteredJobs = filteredJobs.filter(job => 
        filters.skills!.some(skill => 
          job.skills.some(jobSkill => 
            jobSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    // Remote filter
    if (filters.remote) {
      filteredJobs = filteredJobs.filter(job => 
        job.type === 'remote' || job.location.toLowerCase().includes('remote')
      );
    }

    // Salary range filter (basic implementation)
    if (filters.salaryRange) {
      filteredJobs = this.filterBySalaryRange(filteredJobs, filters.salaryRange);
    }

    return filteredJobs;
  }

  /**
   * Filter jobs by salary range
   */
  private filterBySalaryRange(jobs: Job[], salaryRange: string): Job[] {
    // Extract salary numbers from job salary strings
    return jobs.filter(job => {
      const salaryNumbers = this.extractSalaryNumbers(job.salary);
      if (salaryNumbers.length === 0) return true; // Include jobs without clear salary info

      const maxSalary = Math.max(...salaryNumbers);
      
      switch (salaryRange) {
        case '0-50k':
          return maxSalary <= 50000;
        case '50k-100k':
          return maxSalary >= 50000 && maxSalary <= 100000;
        case '100k-150k':
          return maxSalary >= 100000 && maxSalary <= 150000;
        case '150k+':
          return maxSalary >= 150000;
        default:
          return true;
      }
    });
  }

  /**
   * Extract salary numbers from salary string
   */
  private extractSalaryNumbers(salary: string): number[] {
    const numbers = salary.match(/\d+/g);
    if (!numbers) return [];
    
    return numbers.map(num => {
      const value = parseInt(num);
      // Convert to full number if it looks like abbreviated (e.g., "120" -> 120000)
      if (value < 1000 && salary.includes('k')) {
        return value * 1000;
      }
      return value;
    });
  }

  /**
   * Get search suggestions based on current query
   */
  getSearchSuggestions(query: string): Observable<string[]> {
    if (!query || query.length < 2) {
      return new Observable(observer => observer.next([]));
    }

    return this.jobService.getAllJobs().pipe(
      map(jobs => {
        const suggestions = new Set<string>();
        const lowerQuery = query.toLowerCase();

        jobs.forEach(job => {
          // Add matching job titles
          if (job.title.toLowerCase().includes(lowerQuery)) {
            suggestions.add(job.title);
          }
          
          // Add matching companies
          if (job.company.toLowerCase().includes(lowerQuery)) {
            suggestions.add(job.company);
          }
          
          // Add matching skills
          job.skills.forEach(skill => {
            if (skill.toLowerCase().includes(lowerQuery)) {
              suggestions.add(skill);
            }
          });
        });

        return Array.from(suggestions).slice(0, 8); // Limit to 8 suggestions
      })
    );
  }

  /**
   * Get popular search terms
   */
  getPopularSearches(): string[] {
    return [
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Data Scientist',
      'Product Manager',
      'UX Designer',
      'DevOps Engineer',
      'Software Engineer',
      'Marketing Manager',
      'Sales Manager'
    ];
  }
}
