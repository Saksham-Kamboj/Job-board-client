import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { JobService, Job } from './job.service';
import { environment } from '../../../environments/environment';

export interface Interview {
  id: string;
  userId: string;
  jobId: string;
  applicationId: string;
  interviewDate: string;
  interviewType: 'phone' | 'video' | 'in-person' | 'technical' | 'hr' | 'final';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  interviewMode: 'phone' | 'video' | 'in-person';
  notes?: string;
}

export interface InterviewWithDetails extends Interview {
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  jobType: string;
}

@Injectable({
  providedIn: 'root',
})
export class InterviewsService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private jobService: JobService
  ) {}

  /**
   * Get all interviews for a user
   */
  getInterviews(userId: string): Observable<Interview[]> {
    console.log('InterviewsService.getInterviews called with userId:', userId);
    console.log('Making GET request to:', `${this.apiUrl}/interviews?userId=${userId}`);
    
    return this.http.get<Interview[]>(`${this.apiUrl}/interviews?userId=${userId}`).pipe(
      map((response) => {
        console.log('InterviewsService.getInterviews response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('InterviewsService.getInterviews error:', error);
        return of([]);
      })
    );
  }

  /**
   * Get interviews with full job details
   */
  getInterviewsWithDetails(userId: string): Observable<InterviewWithDetails[]> {
    return this.getInterviews(userId).pipe(
      switchMap((interviews) => {
        if (interviews.length === 0) {
          return of([]);
        }

        // Get job details for each interview
        const jobDetailRequests = interviews.map((interview) =>
          this.jobService.getJobById(interview.jobId).pipe(
            map((job) => ({
              ...interview,
              jobTitle: job?.title || 'Unknown Job',
              company: job?.company || 'Unknown Company',
              location: job?.location || 'Unknown Location',
              salary: job?.salary || 'Not specified',
              jobType: job?.type || 'Unknown',
            })),
            catchError(() =>
              of({
                ...interview,
                jobTitle: 'Job Not Found',
                company: 'Unknown Company',
                location: 'Unknown Location',
                salary: 'Not specified',
                jobType: 'Unknown',
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
   * Add a new interview
   */
  addInterview(interview: Omit<Interview, 'id'>): Observable<Interview> {
    const newInterview: Interview = {
      ...interview,
      id: this.generateId(),
    };

    console.log('InterviewsService.addInterview called with:', newInterview);
    console.log('Making POST request to:', `${this.apiUrl}/interviews`);

    return this.http.post<Interview>(`${this.apiUrl}/interviews`, newInterview).pipe(
      map((response) => {
        console.log('InterviewsService.addInterview response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('InterviewsService.addInterview error:', error);
        throw error;
      })
    );
  }

  /**
   * Update interview
   */
  updateInterview(interviewId: string, updates: Partial<Interview>): Observable<Interview> {
    return this.http.patch<Interview>(`${this.apiUrl}/interviews/${interviewId}`, updates);
  }

  /**
   * Delete interview
   */
  deleteInterview(interviewId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/interviews/${interviewId}`);
  }

  /**
   * Get interviews by status
   */
  getInterviewsByStatus(userId: string, status: Interview['status']): Observable<InterviewWithDetails[]> {
    return this.getInterviewsWithDetails(userId).pipe(
      map((interviews) => interviews.filter((interview) => interview.status === status))
    );
  }

  /**
   * Get upcoming interviews
   */
  getUpcomingInterviews(userId: string): Observable<InterviewWithDetails[]> {
    return this.getInterviewsWithDetails(userId).pipe(
      map((interviews) => 
        interviews
          .filter((interview) => 
            interview.status === 'scheduled' && 
            new Date(interview.interviewDate) > new Date()
          )
          .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime())
      )
    );
  }

  /**
   * Get interviews count for a user
   */
  getInterviewsCount(userId: string): Observable<number> {
    return this.getInterviews(userId).pipe(
      map((interviews) => interviews.length),
      catchError(() => of(0))
    );
  }

  /**
   * Get scheduled interviews count
   */
  getScheduledInterviewsCount(userId: string): Observable<number> {
    return this.getInterviews(userId).pipe(
      map((interviews) => interviews.filter((i) => i.status === 'scheduled').length),
      catchError(() => of(0))
    );
  }

  /**
   * Check if user has interview for a specific job
   */
  hasInterviewForJob(userId: string, jobId: string): Observable<boolean> {
    return this.getInterviews(userId).pipe(
      map((interviews) => interviews.some((i) => i.jobId === jobId)),
      catchError(() => of(false))
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
