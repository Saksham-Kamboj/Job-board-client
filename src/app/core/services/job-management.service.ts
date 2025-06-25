import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
  benefits: string[];
  postedDate: string;
  applicationDeadline: string;
  companyDescription: string;
  contactEmail: string;
  experienceLevel: string;
  skills: string[];
  isActive: boolean;
  applicationCount: number;
  featured: boolean;
  companyId?: string;
  status?: string; // Job status: active, paused, closed
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  applicationData: {
    personalInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
    };
    coverLetter: string;
    resume: {
      fileName: string;
      fileUrl: string;
      fileSize: number;
    };
    additionalDocuments: any[];
  };
  status: string;
  submittedAt: string;
  updatedAt: string;
  notes: string;
  applicationStatus?: {
    current: string;
    history: any[];
    nextSteps: string;
    interviewDate: string | null;
    feedback: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class JobManagementService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Get all jobs
  getJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/jobs`);
  }

  // Get jobs by company (for company users)
  getJobsByCompany(companyId: string): Observable<Job[]> {
    return this.http
      .get<Job[]>(`${this.apiUrl}/jobs`)
      .pipe(
        map((jobs) =>
          jobs.filter(
            (job) => job.companyId === companyId || job.company === companyId
          )
        )
      );
  }

  // Get job by ID
  getJobById(id: string): Observable<Job> {
    return this.http.get<Job>(`${this.apiUrl}/jobs/${id}`);
  }

  // Create new job
  createJob(job: Partial<Job>): Observable<Job> {
    return this.http.post<Job>(`${this.apiUrl}/jobs`, job);
  }

  // Update existing job
  updateJob(id: string, job: Partial<Job>): Observable<Job> {
    return this.http.put<Job>(`${this.apiUrl}/jobs/${id}`, job);
  }

  // Delete job
  deleteJob(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/jobs/${id}`);
  }

  // Get all applications
  getApplications(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.apiUrl}/jobApplications`);
  }

  // Get applications for a specific job
  getApplicationsByJob(jobId: string): Observable<JobApplication[]> {
    return this.http
      .get<JobApplication[]>(`${this.apiUrl}/jobApplications`)
      .pipe(
        map((applications) => applications.filter((app) => app.jobId === jobId))
      );
  }

  // Get applications for a company (all jobs posted by the company)
  getApplicationsByCompany(companyJobs: Job[]): Observable<JobApplication[]> {
    const jobIds = companyJobs.map((job) => job.id);
    return this.http
      .get<JobApplication[]>(`${this.apiUrl}/jobApplications`)
      .pipe(
        map((applications) =>
          applications.filter((app) => jobIds.includes(app.jobId))
        )
      );
  }

  // Update application status
  updateApplicationStatus(
    applicationId: string,
    status: string
  ): Observable<JobApplication> {
    return this.http.patch<JobApplication>(
      `${this.apiUrl}/jobApplications/${applicationId}`,
      {
        status,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  // Get application by ID
  getApplicationById(id: string): Observable<JobApplication> {
    return this.http.get<JobApplication>(
      `${this.apiUrl}/jobApplications/${id}`
    );
  }

  // Submit job application
  submitApplication(
    application: Partial<JobApplication>
  ): Observable<JobApplication> {
    return this.http.post<JobApplication>(`${this.apiUrl}/jobApplications`, {
      ...application,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Helper methods for data processing
  getJobApplicationCount(
    jobId: string,
    applications: JobApplication[]
  ): number {
    return applications.filter((app) => app.jobId === jobId).length;
  }

  getDaysUntilDeadline(deadline: string): number {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const pastDate = new Date(date);
    const diffTime = now.getTime() - pastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  filterApplications(
    applications: JobApplication[],
    jobFilter: string,
    statusFilter: string
  ): JobApplication[] {
    return applications.filter((app) => {
      const jobMatch = !jobFilter || app.jobId === jobFilter;
      const statusMatch = !statusFilter || app.status === statusFilter;
      return jobMatch && statusMatch;
    });
  }
}
