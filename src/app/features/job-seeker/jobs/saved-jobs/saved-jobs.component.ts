import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../../../core/services/auth.service';
import {
  SavedJobsService,
  SavedJobWithDetails,
} from '../../../../core/services/saved-jobs.service';

@Component({
  selector: 'app-saved-jobs',
  imports: [CommonModule, RouterModule],
  templateUrl: './saved-jobs.component.html',
  styleUrl: './saved-jobs.component.css',
})
export class SavedJobsComponent implements OnInit, OnDestroy {
  savedJobs: SavedJobWithDetails[] = [];
  currentUser: User | null = null;
  isLoading = true;
  error: string | null = null;

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private savedJobsService: SavedJobsService
  ) {}

  ngOnInit(): void {
    const userSub = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadSavedJobs(user.id);
      }
    });
    this.subscriptions.add(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadSavedJobs(userId: string): void {
    this.isLoading = true;
    this.error = null;

    const savedSub = this.savedJobsService
      .getSavedJobsWithDetails(userId)
      .subscribe({
        next: (savedJobs) => {
          this.savedJobs = savedJobs;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading saved jobs:', error);
          this.error = 'Failed to load saved jobs. Please try again later.';
          this.isLoading = false;
        },
      });

    this.subscriptions.add(savedSub);
  }

  removeSavedJob(jobId: string): void {
    if (!this.currentUser) return;

    const removeSub = this.savedJobsService
      .unsaveJob(this.currentUser.id, jobId)
      .subscribe({
        next: () => {
          this.savedJobs = this.savedJobs.filter((job) => job.jobId !== jobId);
        },
        error: (error) => {
          console.error('Error removing saved job:', error);
          // Optional: Show error message
        },
      });

    this.subscriptions.add(removeSub);
  }
}
