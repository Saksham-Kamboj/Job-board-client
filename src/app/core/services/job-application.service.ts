import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { PersonalInfo, Resume } from './user-profile.service';
import { ApplicationStatus } from './dashboard.service';
import { JobService } from './job.service';
import { environment } from '../../../environments/environment';

export interface JobApplicationData {
  personalInfo: PersonalInfo;
  coverLetter: string;
  resume: Resume;
  additionalDocuments: any[];
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  applicationData: JobApplicationData;
  status:
    | 'draft'
    | 'submitted'
    | 'under-review'
    | 'pending'
    | 'interview'
    | 'shortlisted'
    | 'reviewed'
    | 'rejected'
    | 'accepted'
    | 'scheduled';
  submittedAt: string;
  updatedAt: string;
  notes: string;
  applicationStatus?: ApplicationStatus;
}

export interface JobApplicationWithDetails extends JobApplication {
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
export class JobApplicationService {
  private apiUrl = environment.apiUrl + '/jobApplications';

  constructor(private http: HttpClient, private jobService: JobService) {}

  submitJobApplication(
    application: Omit<JobApplication, 'id' | 'submittedAt' | 'updatedAt'>
  ): Observable<JobApplication> {
    const newApplication = {
      ...application,
      id: this.generateId(),
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.http.post<JobApplication>(this.apiUrl, newApplication);
  }

  getUserApplications(userId: string): Observable<JobApplication[]> {
    console.log(
      'JobApplicationService.getUserApplications called with userId:',
      userId
    );
    console.log('Making GET request to:', `${this.apiUrl}?userId=${userId}`);

    return this.http
      .get<JobApplication[]>(`${this.apiUrl}?userId=${userId}`)
      .pipe(
        map((response) => {
          console.log(
            'JobApplicationService.getUserApplications response:',
            response
          );
          return response;
        }),
        catchError((error) => {
          console.error(
            'JobApplicationService.getUserApplications error:',
            error
          );
          return of([]);
        })
      );
  }

  getJobApplications(jobId: string): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.apiUrl}?jobId=${jobId}`);
  }

  getApplicationById(applicationId: string): Observable<JobApplication> {
    return this.http.get<JobApplication>(`${this.apiUrl}/${applicationId}`);
  }

  updateApplicationStatus(
    applicationId: string,
    status: JobApplication['status'],
    notes?: string
  ): Observable<JobApplication> {
    const updates = {
      status,
      updatedAt: new Date().toISOString(),
      ...(notes && { notes }),
    };

    return this.http.patch<JobApplication>(
      `${this.apiUrl}/${applicationId}`,
      updates
    );
  }

  checkIfUserApplied(userId: string, jobId: string): Observable<boolean> {
    return this.getUserApplications(userId).pipe(
      map((applications) => applications.some((app) => app.jobId === jobId)),
      catchError(() => of(false))
    );
  }

  /**
   * Get job applications with full job details (replaces getAppliedJobsWithDetails)
   */
  getUserApplicationsWithDetails(
    userId: string
  ): Observable<JobApplicationWithDetails[]> {
    return this.getUserApplications(userId).pipe(
      switchMap((applications) => {
        if (applications.length === 0) {
          return of([]);
        }

        // Get job details for each application
        const jobDetailRequests = applications.map((application) =>
          this.jobService.getJobById(application.jobId).pipe(
            map((job) => ({
              ...application,
              jobTitle: job?.title || 'Unknown Job',
              company: job?.company || 'Unknown Company',
              location: job?.location || 'Unknown Location',
              salary: job?.salary || 'Not specified',
              jobType: job?.type || 'Unknown',
              postedDate: job?.postedDate || '',
            })),
            catchError(() =>
              of({
                ...application,
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
   * Get applied job IDs for a user (replaces getAppliedJobIds)
   */
  getAppliedJobIds(userId: string): Observable<Set<string>> {
    return this.getUserApplications(userId).pipe(
      map((applications) => new Set(applications.map((app) => app.jobId))),
      catchError(() => of(new Set<string>()))
    );
  }

  /**
   * Get count of job applications for a user (replaces getAppliedJobsCount)
   */
  getUserApplicationsCount(userId: string): Observable<number> {
    return this.getUserApplications(userId).pipe(
      map((applications) => applications.length),
      catchError(() => of(0))
    );
  }

  /**
   * Get job applications by status (replaces getAppliedJobsByStatus)
   */
  getUserApplicationsByStatus(
    userId: string,
    status: JobApplication['status']
  ): Observable<JobApplicationWithDetails[]> {
    return this.getUserApplicationsWithDetails(userId).pipe(
      map((applications) => applications.filter((app) => app.status === status))
    );
  }

  /**
   * Get recent job applications (replaces getRecentAppliedJobs)
   */
  getRecentUserApplications(
    userId: string,
    limit: number = 5
  ): Observable<JobApplicationWithDetails[]> {
    return this.getUserApplicationsWithDetails(userId).pipe(
      map((applications) =>
        applications
          .sort(
            (a, b) =>
              new Date(b.submittedAt).getTime() -
              new Date(a.submittedAt).getTime()
          )
          .slice(0, limit)
      )
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
