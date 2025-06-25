import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { JobService, Job } from './job.service';
import {
  JobApplicationService,
  JobApplication,
  JobApplicationWithDetails,
} from './job-application.service';
import { UserProfileService, UserProfile } from './user-profile.service';
import { SavedJobsService, SavedJobWithDetails } from './saved-jobs.service';
import { InterviewsService, InterviewWithDetails } from './interviews.service';
import { environment } from '../../../environments/environment';

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  savedAt: string;
}

export interface DashboardStats {
  id: string;
  userId: string;
  savedJobs: number;
  profileViews: number;
  interviewsScheduled: number;
  lastUpdated: string;
}

export interface AdminDashboardStats {
  id: string;
  userId: string;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  newApplications: number;
  lastUpdated: string;
}

export interface ApplicationStatusHistory {
  status: string;
  timestamp: string;
  note: string;
}

export interface ApplicationStatus {
  current: string;
  history: ApplicationStatusHistory[];
  nextSteps: string;
  interviewDate: string | null;
  feedback: string;
}

export interface RecentApplication {
  id: string;
  jobTitle: string;
  company: string;
  appliedDate: string;
  status: string;
  jobId: string;
  applicationStatus?: ApplicationStatus;
  nextSteps?: string;
  interviewDate?: string | null;
}

export interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  skills: string[];
}

export interface RecentJobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: string;
  applications: number;
  status: string;
}

export interface RecentApplicationForAdmin {
  id: string;
  applicantName: string;
  jobTitle: string;
  appliedDate: string;
  status: string;
  jobId: string;
  userId: string;
}

export interface JobSeekerDashboardStats {
  id: string;
  userId: string;
  totalApplications: number;
  pendingApplications: number;
  interviewsScheduled: number;
  savedJobs: number;
  lastUpdated: string;
}

export interface CompanyDashboardStats {
  id: string;
  userId: string;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  newApplications: number;
  lastUpdated: string;
}

export interface RecentApplicationForCompany {
  id: string;
  applicantName: string;
  jobTitle: string;
  appliedDate: string;
  status: string;
  jobId: string;
  userId: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private jobService: JobService,
    private jobApplicationService: JobApplicationService,
    private userProfileService: UserProfileService,
    private savedJobsService: SavedJobsService,
    private interviewsService: InterviewsService
  ) {}

  // Job Seeker Dashboard Methods (DEPRECATED - Use getJobSeekerDashboardStats instead)
  getDashboardStats(userId: string): Observable<DashboardStats> {
    // This method is deprecated, use getJobSeekerDashboardStats for new implementations
    return this.getJobSeekerDashboardStats(userId).pipe(
      map((stats) => ({
        id: stats.id,
        userId: stats.userId,
        appliedJobs: stats.totalApplications,
        savedJobs: stats.savedJobs,
        profileViews: 0, // Not tracked in new system
        interviewsScheduled: stats.interviewsScheduled,
        lastUpdated: stats.lastUpdated,
      }))
    );
  }

  getRecentApplications(
    userId: string,
    limit: number = 3
  ): Observable<RecentApplication[]> {
    return this.jobApplicationService.getUserApplications(userId).pipe(
      switchMap((applications) => {
        if (applications.length === 0) {
          return of([]);
        }

        const recentApps = applications
          .sort(
            (a, b) =>
              new Date(b.submittedAt).getTime() -
              new Date(a.submittedAt).getTime()
          )
          .slice(0, limit);

        const jobRequests = recentApps.map((app) =>
          this.jobService.getJobById(app.jobId).pipe(
            map((job) => ({
              id: app.id,
              jobTitle: job?.title || 'Unknown Job',
              company: job?.company || 'Unknown Company',
              appliedDate: this.formatDate(app.submittedAt),
              status: app.status,
              jobId: app.jobId,
              applicationStatus: app.applicationStatus,
              nextSteps: app.applicationStatus?.nextSteps,
              interviewDate: app.applicationStatus?.interviewDate,
            }))
          )
        );

        return forkJoin(jobRequests);
      }),
      catchError(() => of([]))
    );
  }

  getRecommendedJobs(
    userId: string,
    limit: number = 3
  ): Observable<RecommendedJob[]> {
    return this.userProfileService.getUserProfile(userId).pipe(
      switchMap((profile) => {
        if (!profile) {
          return this.jobService
            .getFeaturedJobs()
            .pipe(
              map((jobs) => this.mapJobsToRecommended(jobs.slice(0, limit), []))
            );
        }

        return this.jobService.getAllJobs().pipe(
          map((jobs) => {
            const userSkills = profile.professionalInfo?.skills || [];
            const preferredLocations =
              profile.professionalInfo?.preferredLocations || [];
            const preferredJobTypes =
              profile.professionalInfo?.preferredJobTypes || [];

            const scoredJobs = jobs
              .filter((job) => job.isActive)
              .map((job) => ({
                job,
                score: this.calculateMatchScore(
                  job,
                  userSkills,
                  preferredLocations,
                  preferredJobTypes
                ),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, limit);

            return scoredJobs.map(({ job, score }) => ({
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location,
              salary: job.salary,
              matchScore: score,
              skills: job.skills || [],
            }));
          })
        );
      }),
      catchError(() =>
        this.jobService
          .getFeaturedJobs()
          .pipe(
            map((jobs) => this.mapJobsToRecommended(jobs.slice(0, limit), []))
          )
      )
    );
  }

  getSavedJobs(userId: string): Observable<SavedJob[]> {
    // Use new SavedJobsService instead of dashboardData
    return this.savedJobsService
      .getSavedJobs(userId)
      .pipe(catchError(() => of([])));
  }

  saveJob(userId: string, jobId: string): Observable<SavedJob> {
    const savedJob: Omit<SavedJob, 'id'> = {
      userId,
      jobId,
      savedAt: new Date().toISOString(),
    };

    return this.http.post<SavedJob>(`${this.apiUrl}/savedJobs`, {
      ...savedJob,
      id: this.generateId(),
    });
  }

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

  // Admin Dashboard Methods
  getAdminDashboardStats(userId: string): Observable<AdminDashboardStats> {
    // Calculate admin stats dynamically from actual data
    return forkJoin({
      jobs: this.jobService.getAllJobs().pipe(catchError(() => of([]))),
      applications: this.http
        .get<JobApplication[]>(`${this.apiUrl}/jobApplications`)
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ jobs, applications }) => {
        const activeJobs = jobs.filter((job) => job.isActive).length;
        const recentApplications = applications.filter((app) => {
          const submittedDate = new Date(app.submittedAt);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return submittedDate >= weekAgo;
        }).length;

        return {
          id: `admin-stats-${userId}`,
          userId,
          totalJobs: jobs.length,
          activeJobs: activeJobs,
          totalApplications: applications.length,
          newApplications: recentApplications,
          lastUpdated: new Date().toISOString(),
        };
      }),
      catchError(() => of(this.getDefaultAdminStats(userId)))
    );
  }

  getRecentJobPostings(
    limit: number = 3,
    userId?: string
  ): Observable<RecentJobPosting[]> {
    return this.jobService.getAllJobs().pipe(
      switchMap((jobs) => {
        if (userId) {
          // Get user's applied jobs from JobApplicationService
          return this.jobApplicationService.getAppliedJobIds(userId).pipe(
            map((appliedJobIds: Set<string>) => {
              // Filter out jobs the user has already applied to
              const availableJobs = jobs.filter(
                (job) => !appliedJobIds.has(job.id)
              );

              return availableJobs
                .sort(
                  (a, b) =>
                    new Date(b.postedDate).getTime() -
                    new Date(a.postedDate).getTime()
                )
                .slice(0, limit)
                .map((job) => ({
                  id: job.id,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  postedDate: job.postedDate,
                  applications: job.applicationCount || 0,
                  status: job.isActive ? 'active' : 'inactive',
                }));
            }),
            catchError(() => {
              // Fallback: return all jobs if both fetches fail
              return of(
                jobs
                  .sort(
                    (a, b) =>
                      new Date(b.postedDate).getTime() -
                      new Date(a.postedDate).getTime()
                  )
                  .slice(0, limit)
                  .map((job) => ({
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    postedDate: job.postedDate,
                    applications: job.applicationCount || 0,
                    status: job.isActive ? 'active' : 'inactive',
                  }))
              );
            })
          );
        } else {
          // If no userId provided, return all jobs (for admin/company dashboards)
          return of(
            jobs
              .sort(
                (a, b) =>
                  new Date(b.postedDate).getTime() -
                  new Date(a.postedDate).getTime()
              )
              .slice(0, limit)
              .map((job) => ({
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                postedDate: job.postedDate,
                applications: job.applicationCount || 0,
                status: job.isActive ? 'active' : 'inactive',
              }))
          );
        }
      }),
      catchError(() => of([]))
    );
  }

  getRecentApplicationsForAdmin(
    limit: number = 3
  ): Observable<RecentApplicationForAdmin[]> {
    return this.http
      .get<JobApplication[]>(`${this.apiUrl}/jobApplications`)
      .pipe(
        switchMap((applications) => {
          if (applications.length === 0) {
            return of([]);
          }

          const recentApps = applications
            .sort(
              (a, b) =>
                new Date(b.submittedAt).getTime() -
                new Date(a.submittedAt).getTime()
            )
            .slice(0, limit);

          const requests = recentApps.map((app) =>
            forkJoin({
              job: this.jobService.getJobById(app.jobId),
              user: this.http.get<any>(`${this.apiUrl}/users/${app.userId}`),
            }).pipe(
              map(({ job, user }) => ({
                id: app.id,
                applicantName: `${user?.firstName || 'Unknown'} ${
                  user?.lastName || 'User'
                }`,
                jobTitle: job?.title || 'Unknown Job',
                appliedDate: this.formatDate(app.submittedAt),
                status: app.status,
                jobId: app.jobId,
                userId: app.userId,
              })),
              catchError(() =>
                of({
                  id: app.id,
                  applicantName: 'Unknown User',
                  jobTitle: 'Unknown Job',
                  appliedDate: this.formatDate(app.submittedAt),
                  status: app.status,
                  jobId: app.jobId,
                  userId: app.userId,
                })
              )
            )
          );

          return forkJoin(requests);
        }),
        catchError(() => of([]))
      );
  }

  // Job Seeker Dashboard Methods
  getJobSeekerDashboardStats(
    userId: string
  ): Observable<JobSeekerDashboardStats> {
    // Use new separate services instead of dashboardData
    return forkJoin({
      appliedJobs: this.jobApplicationService
        .getUserApplications(userId)
        .pipe(catchError(() => of([]))),
      savedJobs: this.savedJobsService
        .getSavedJobs(userId)
        .pipe(catchError(() => of([]))),
      interviews: this.interviewsService
        .getInterviews(userId)
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ appliedJobs, savedJobs, interviews }) => {
        // Calculate pending applications (submitted, pending, under-review)
        const pendingApplications = appliedJobs.filter(
          (app: JobApplication) =>
            app.status === 'pending' ||
            app.status === 'submitted' ||
            app.status === 'reviewed'
        ).length;

        // Calculate interviews scheduled
        const interviewsScheduled = interviews.filter(
          (interview) => interview.status === 'scheduled'
        ).length;

        return {
          id: `jobseeker-stats-${userId}`,
          userId,
          totalApplications: appliedJobs.length,
          pendingApplications,
          interviewsScheduled,
          savedJobs: savedJobs.length,
          lastUpdated: new Date().toISOString(),
        };
      }),
      catchError(() => of(this.getDefaultJobSeekerStats(userId)))
    );
  }

  getUserRecentApplications(
    userId: string,
    limit: number = 3
  ): Observable<RecentApplication[]> {
    // Use JobApplicationService instead of dashboardData
    return this.jobApplicationService
      .getRecentUserApplications(userId, limit)
      .pipe(
        map((applications: JobApplicationWithDetails[]) =>
          applications.map((app) => ({
            id: app.id,
            jobId: app.jobId,
            jobTitle: app.jobTitle,
            company: app.company,
            appliedDate: this.formatDate(app.submittedAt),
            status: app.status,
          }))
        ),
        catchError(() => {
          // Fallback to calculating from jobApplications collection
          return this.getRecentApplications(userId, limit);
        })
      );
  }

  // Company Dashboard Methods
  getCompanyDashboardStats(userId: string): Observable<CompanyDashboardStats> {
    return forkJoin({
      jobs: this.jobService.getAllJobs().pipe(catchError(() => of([]))),
      applications: this.http
        .get<JobApplication[]>(`${this.apiUrl}/jobApplications`)
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ jobs, applications }) => {
        // Filter jobs posted by this company user
        const companyJobs = jobs.filter(
          (job) => job.postedBy === userId || job.companyId === userId
        );
        const activeJobs = companyJobs.filter((job) => job.isActive).length;

        // Filter applications for this company's jobs
        const companyJobIds = companyJobs.map((job) => job.id);
        const companyApplications = applications.filter((app) =>
          companyJobIds.includes(app.jobId)
        );

        const recentApplications = companyApplications.filter((app) => {
          const submittedDate = new Date(app.submittedAt);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return submittedDate >= weekAgo;
        }).length;

        return {
          id: `company-stats-${userId}`,
          userId,
          totalJobs: companyJobs.length,
          activeJobs,
          totalApplications: companyApplications.length,
          newApplications: recentApplications,
          lastUpdated: new Date().toISOString(),
        };
      }),
      catchError(() => of(this.getDefaultCompanyStats(userId)))
    );
  }

  getCompanyRecentJobPostings(
    userId: string,
    limit: number = 3
  ): Observable<RecentJobPosting[]> {
    return this.jobService.getAllJobs().pipe(
      map((jobs) => {
        return jobs
          .filter((job) => job.postedBy === userId || job.companyId === userId)
          .sort(
            (a, b) =>
              new Date(b.postedDate).getTime() -
              new Date(a.postedDate).getTime()
          )
          .slice(0, limit)
          .map((job) => ({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            postedDate: job.postedDate,
            applications: job.applicationCount || 0,
            status: job.isActive ? 'active' : 'inactive',
          }));
      }),
      catchError(() => of([]))
    );
  }

  getCompanyRecentApplications(
    userId: string,
    limit: number = 3
  ): Observable<RecentApplicationForCompany[]> {
    return forkJoin({
      jobs: this.jobService.getAllJobs(),
      applications: this.http.get<JobApplication[]>(
        `${this.apiUrl}/jobApplications`
      ),
    }).pipe(
      switchMap(({ jobs, applications }) => {
        // Get company's job IDs
        const companyJobIds = jobs
          .filter((job) => job.postedBy === userId || job.companyId === userId)
          .map((job) => job.id);

        if (companyJobIds.length === 0) {
          return of([]);
        }

        // Filter applications for company's jobs
        const companyApplications = applications
          .filter((app) => companyJobIds.includes(app.jobId))
          .sort(
            (a, b) =>
              new Date(b.submittedAt).getTime() -
              new Date(a.submittedAt).getTime()
          )
          .slice(0, limit);

        if (companyApplications.length === 0) {
          return of([]);
        }

        const requests = companyApplications.map((app) =>
          forkJoin({
            job: this.jobService.getJobById(app.jobId),
            user: this.http.get<any>(`${this.apiUrl}/users/${app.userId}`),
          }).pipe(
            map(({ job, user }) => ({
              id: app.id,
              applicantName: `${user?.firstName || 'Unknown'} ${
                user?.lastName || 'User'
              }`,
              jobTitle: job?.title || 'Unknown Job',
              appliedDate: this.formatDate(app.submittedAt),
              status: app.status,
              jobId: app.jobId,
              userId: app.userId,
            })),
            catchError(() =>
              of({
                id: app.id,
                applicantName: 'Unknown User',
                jobTitle: 'Unknown Job',
                appliedDate: this.formatDate(app.submittedAt),
                status: app.status,
                jobId: app.jobId,
                userId: app.userId,
              })
            )
          )
        );

        return forkJoin(requests);
      }),
      catchError(() => of([]))
    );
  }

  // Helper Methods
  private calculateMatchScore(
    job: Job,
    userSkills: string[],
    preferredLocations: string[],
    preferredJobTypes: string[]
  ): number {
    let score = 0;

    // Skills match (40% weight)
    if (job.skills && userSkills.length > 0) {
      const matchingSkills = job.skills.filter((skill) =>
        userSkills.some(
          (userSkill) =>
            userSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      score += (matchingSkills.length / job.skills.length) * 40;
    }

    // Location match (30% weight)
    if (preferredLocations.length > 0) {
      const locationMatch = preferredLocations.some(
        (location) =>
          job.location.toLowerCase().includes(location.toLowerCase()) ||
          location.toLowerCase().includes(job.location.toLowerCase())
      );
      if (locationMatch) score += 30;
    }

    // Job type match (20% weight)
    if (preferredJobTypes.length > 0) {
      const typeMatch = preferredJobTypes.includes(job.type);
      if (typeMatch) score += 20;
    }

    // Featured jobs get bonus (10% weight)
    if (job.featured) score += 10;

    return Math.min(Math.round(score), 100);
  }

  private mapJobsToRecommended(
    jobs: Job[],
    userSkills: string[]
  ): RecommendedJob[] {
    return jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      matchScore: job.featured ? 85 : 75, // Default scores for featured/non-featured
      skills: job.skills || [],
    }));
  }

  private getDefaultStats(userId: string): DashboardStats {
    return {
      id: `stats-${userId}`,
      userId,
      savedJobs: 0,
      profileViews: 0,
      interviewsScheduled: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private getDefaultAdminStats(userId: string): AdminDashboardStats {
    return {
      id: `admin-stats-${userId}`,
      userId,
      totalJobs: 0,
      activeJobs: 0,
      totalApplications: 0,
      newApplications: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private getDefaultJobSeekerStats(userId: string): JobSeekerDashboardStats {
    return {
      id: `jobseeker-stats-${userId}`,
      userId,
      totalApplications: 0,
      pendingApplications: 0,
      interviewsScheduled: 0,
      savedJobs: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private getDefaultCompanyStats(userId: string): CompanyDashboardStats {
    return {
      id: `company-stats-${userId}`,
      userId,
      totalJobs: 0,
      activeJobs: 0,
      totalApplications: 0,
      newApplications: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
    } catch (error) {
      return dateString.split('T')[0]; // Fallback to simple split
    }
  }
}
