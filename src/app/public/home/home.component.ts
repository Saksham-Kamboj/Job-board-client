import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobService, Job } from '../../core/services/job.service';
import { AuthService } from '../../core/services/auth.service';
import {
  DataService,
  JobCategory,
  Testimonial,
} from '../../core/services/data.service';
import { SearchService } from '../../core/services/search.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  searchQuery = '';
  searchLocation = '';
  featuredJobs: Job[] = [];
  isLoading = true;
  isAuthenticated = false;

  // Typing animation properties
  currentTypingWord = '';
  typingWords = [
    'Dream Job',
    'Perfect Role',
    'Next Career',
    'Ideal Position',
    'Future Path',
  ];
  currentWordIndex = 0;
  currentCharIndex = 0;
  isDeleting = false;
  typingSpeed = 100;
  deletingSpeed = 50;
  pauseTime = 2000;
  private typingTimeout: any;

  // Platform statistics
  stats = {
    totalJobs: 0,
    totalCompanies: 0,
    totalApplications: 0,
    successfulPlacements: 0,
  };

  // Job categories and testimonials from API
  jobCategories: JobCategory[] = [];
  testimonials: Testimonial[] = [];

  constructor(
    private jobService: JobService,
    private authService: AuthService,
    private dataService: DataService,
    private searchService: SearchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.loadFeaturedJobs();
    this.loadStats();
    this.loadJobCategories();
    this.loadTestimonials();
    this.startTypingAnimation();
  }

  loadFeaturedJobs(): void {
    this.jobService.getAllJobs().subscribe({
      next: (jobs) => {
        // Get featured jobs or first 6 jobs
        this.featuredJobs = jobs.filter((job) => job.featured).slice(0, 6);
        if (this.featuredJobs.length < 6) {
          const remainingJobs = jobs
            .filter((job) => !job.featured)
            .slice(0, 6 - this.featuredJobs.length);
          this.featuredJobs = [...this.featuredJobs, ...remainingJobs];
        }
        this.isLoading = false;
        this.updateCategoryCounts(jobs);
      },
      error: (error) => {
        console.error('Error loading featured jobs:', error);
        this.isLoading = false;
      },
    });
  }

  loadStats(): void {
    this.jobService.getAllJobs().subscribe({
      next: (jobs) => {
        this.stats.totalJobs = jobs.length;
        this.stats.totalCompanies = new Set(
          jobs.map((job) => job.company)
        ).size;
        this.stats.totalApplications = jobs.reduce(
          (sum, job) => sum + (job.applicationCount || 0),
          0
        );
        this.stats.successfulPlacements = Math.floor(
          this.stats.totalApplications * 0.15
        ); // Simulated
      },
    });
  }

  loadJobCategories(): void {
    this.dataService.getJobCategories().subscribe({
      next: (categories) => {
        this.jobCategories = categories;
        // Update counts based on current jobs
        this.jobService.getAllJobs().subscribe({
          next: (jobs) => {
            this.updateCategoryCounts(jobs);
          },
        });
      },
      error: (error) => {
        console.error('Error loading job categories:', error);
      },
    });
  }

  loadTestimonials(): void {
    this.dataService.getTestimonials().subscribe({
      next: (testimonials) => {
        this.testimonials = testimonials;
      },
      error: (error) => {
        console.error('Error loading testimonials:', error);
      },
    });
  }

  updateCategoryCounts(jobs: Job[]): void {
    // Reset counts
    this.jobCategories.forEach((category) => (category.count = 0));

    // Simple categorization based on job titles
    jobs.forEach((job) => {
      const title = job.title.toLowerCase();

      if (
        title.includes('developer') ||
        title.includes('engineer') ||
        title.includes('tech') ||
        title.includes('software')
      ) {
        const techCategory = this.jobCategories.find(
          (cat) => cat.name === 'Technology'
        );
        if (techCategory) techCategory.count++;
      } else if (
        title.includes('design') ||
        title.includes('ui') ||
        title.includes('ux') ||
        title.includes('graphic')
      ) {
        const designCategory = this.jobCategories.find(
          (cat) => cat.name === 'Design'
        );
        if (designCategory) designCategory.count++;
      } else if (
        title.includes('marketing') ||
        title.includes('content') ||
        title.includes('digital')
      ) {
        const marketingCategory = this.jobCategories.find(
          (cat) => cat.name === 'Marketing'
        );
        if (marketingCategory) marketingCategory.count++;
      } else if (
        title.includes('sales') ||
        title.includes('business') ||
        title.includes('manager')
      ) {
        const salesCategory = this.jobCategories.find(
          (cat) => cat.name === 'Sales'
        );
        if (salesCategory) salesCategory.count++;
      } else if (
        title.includes('finance') ||
        title.includes('accounting') ||
        title.includes('financial')
      ) {
        const financeCategory = this.jobCategories.find(
          (cat) => cat.name === 'Finance'
        );
        if (financeCategory) financeCategory.count++;
      } else if (
        title.includes('health') ||
        title.includes('medical') ||
        title.includes('nurse') ||
        title.includes('healthcare')
      ) {
        const healthCategory = this.jobCategories.find(
          (cat) => cat.name === 'Healthcare'
        );
        if (healthCategory) healthCategory.count++;
      }
    });
  }

  onSearch(): void {
    // Update search service with current search parameters
    this.searchService.updateFilters({
      query: this.searchQuery.trim() || undefined,
      location: this.searchLocation.trim() || undefined,
    });

    // Navigate to jobs page with search parameters
    const queryParams: any = {};
    if (this.searchQuery.trim()) {
      queryParams.q = this.searchQuery.trim();
    }
    if (this.searchLocation.trim()) {
      queryParams.location = this.searchLocation.trim();
    }

    // Navigate using Angular router with query parameters
    this.router.navigate(['/jobs'], { queryParams });
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

  // Typing animation methods
  startTypingAnimation(): void {
    this.typeText();
  }

  typeText(): void {
    const currentWord = this.typingWords[this.currentWordIndex];

    if (this.isDeleting) {
      // Deleting characters
      this.currentTypingWord = currentWord.substring(
        0,
        this.currentCharIndex - 1
      );
      this.currentCharIndex--;

      if (this.currentCharIndex === 0) {
        this.isDeleting = false;
        this.currentWordIndex =
          (this.currentWordIndex + 1) % this.typingWords.length;
        this.typingTimeout = setTimeout(
          () => this.typeText(),
          this.typingSpeed
        );
      } else {
        this.typingTimeout = setTimeout(
          () => this.typeText(),
          this.deletingSpeed
        );
      }
    } else {
      // Typing characters
      this.currentTypingWord = currentWord.substring(
        0,
        this.currentCharIndex + 1
      );
      this.currentCharIndex++;

      if (this.currentCharIndex === currentWord.length) {
        // Word complete, pause then start deleting
        this.isDeleting = true;
        this.typingTimeout = setTimeout(() => this.typeText(), this.pauseTime);
      } else {
        this.typingTimeout = setTimeout(
          () => this.typeText(),
          this.typingSpeed
        );
      }
    }
  }

  ngOnDestroy(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }
}
