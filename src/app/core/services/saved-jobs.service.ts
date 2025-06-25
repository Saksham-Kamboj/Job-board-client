import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { JobService, Job } from './job.service';
import { UserProfileService } from './user-profile.service';
import { environment } from '../../../environments/environment';

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  savedAt: string;
}

export interface SavedJobWithDetails extends SavedJob {
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  jobType: string;
  postedDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class SavedJobsService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private jobService: JobService,
    private userProfileService: UserProfileService
  ) {}

  /**
   * Get all saved jobs for a user
   */
  getSavedJobs(userId: string): Observable<SavedJob[]> {
    console.log('SavedJobsService.getSavedJobs called with userId:', userId);
    console.log(
      'Making GET request to:',
      `${this.apiUrl}/savedJobs?userId=${userId}`
    );

    return this.http
      .get<SavedJob[]>(`${this.apiUrl}/savedJobs?userId=${userId}`)
      .pipe(
        map((response) => {
          console.log('SavedJobsService.getSavedJobs response:', response);
          return response;
        }),
        catchError((error) => {
          console.error('SavedJobsService.getSavedJobs error:', error);
          throw error;
        })
      );
  }

  /**
   * Get saved jobs with full job details
   */
  getSavedJobsWithDetails(userId: string): Observable<SavedJobWithDetails[]> {
    return this.getSavedJobs(userId).pipe(
      switchMap((savedJobs) => {
        if (savedJobs.length === 0) {
          return of([]);
        }

        // Get job details for each saved job
        const jobDetailRequests = savedJobs.map((savedJob) =>
          this.jobService.getJobById(savedJob.jobId).pipe(
            map((job) => ({
              ...savedJob,
              jobTitle: job?.title || 'Unknown Job',
              company: job?.company || 'Unknown Company',
              location: job?.location || 'Unknown Location',
              salary: job?.salary || 'Not specified',
              jobType: job?.type || 'Unknown',
              postedDate: job?.postedDate || '',
            })),
            catchError(() =>
              of({
                ...savedJob,
                jobTitle: 'Job Not Found',
                company: 'Unknown Company',
                location: 'Unknown Location',
                salary: 'Not specified',
                jobType: 'Unknown',
                postedDate: '',
              })
            )
          )
        );

        return forkJoin(jobDetailRequests);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Save a job for a user
   */
  saveJob(userId: string, jobId: string): Observable<SavedJob> {
    const savedJob: SavedJob = {
      id: this.generateId(),
      userId,
      jobId,
      savedAt: new Date().toISOString(),
    };

    console.log('SavedJobsService.saveJob called with:', {
      userId,
      jobId,
      savedJob,
    });
    console.log('Making POST request to:', `${this.apiUrl}/savedJobs`);

    return this.http.post<SavedJob>(`${this.apiUrl}/savedJobs`, savedJob).pipe(
      map((response) => {
        console.log('SavedJobsService.saveJob response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('SavedJobsService.saveJob error:', error);
        throw error;
      })
    );
  }

  /**
   * Remove a saved job
   */
  unsaveJob(userId: string, jobId: string): Observable<void> {
    return this.getSavedJobs(userId).pipe(
      switchMap((savedJobs) => {
        const savedJob = savedJobs.find((sj) => sj.jobId === jobId);
        if (savedJob) {
          return this.http.delete<void>(
            `${this.apiUrl}/savedJobs/${savedJob.id}`
          );
        }
        return of(void 0);
      })
    );
  }

  /**
   * Check if a job is saved by a user
   */
  isJobSaved(userId: string, jobId: string): Observable<boolean> {
    return this.getSavedJobs(userId).pipe(
      map((savedJobs) => savedJobs.some((sj) => sj.jobId === jobId)),
      catchError(() => of(false))
    );
  }

  /**
   * Get saved job IDs for a user (for efficient checking)
   */
  getSavedJobIds(userId: string): Observable<Set<string>> {
    return this.getSavedJobs(userId).pipe(
      map((savedJobs) => new Set(savedJobs.map((sj) => sj.jobId))),
      catchError(() => of(new Set<string>()))
    );
  }

  /**
   * Toggle save status of a job
   */
  toggleSaveJob(
    userId: string,
    jobId: string
  ): Observable<{ saved: boolean; message: string }> {
    console.log('SavedJobsService.toggleSaveJob called with:', {
      userId,
      jobId,
    });

    return this.isJobSaved(userId, jobId).pipe(
      switchMap((isSaved) => {
        console.log('Current save status for job', jobId, ':', isSaved);

        if (isSaved) {
          console.log('Job is currently saved, removing it...');
          return this.unsaveJob(userId, jobId).pipe(
            map(() => {
              console.log('Job successfully removed from saved jobs');
              return {
                saved: false,
                message: 'Job removed from saved jobs',
              };
            })
          );
        } else {
          console.log('Job is not saved, saving it...');
          return this.saveJob(userId, jobId).pipe(
            map(() => {
              console.log('Job successfully saved');
              return { saved: true, message: 'Job saved successfully' };
            })
          );
        }
      }),
      catchError((error) => {
        console.error('SavedJobsService.toggleSaveJob error:', error);
        throw error;
      })
    );
  }

  /**
   * Get count of saved jobs for a user
   */
  getSavedJobsCount(userId: string): Observable<number> {
    return this.getSavedJobs(userId).pipe(
      map((savedJobs) => savedJobs.length),
      catchError(() => of(0))
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
