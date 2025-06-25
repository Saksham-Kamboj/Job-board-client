import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  userId: string;
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
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
  };
  professionalInfo: {
    currentTitle: string;
    yearsOfExperience: number;
    summary: string;
    skills: string[];
    preferredJobTypes: string[];
    preferredLocations: string[];
    expectedSalary: {
      min: number;
      max: number;
      currency: string;
    };
    jobAlertFrequency: string;
    profileVisibility?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  };
  education: Array<{
    id?: string;
    institution: string;
    degree: string;
    field?: string; // Legacy field name
    fieldOfStudy: string; // New field name
    startDate: string;
    endDate?: string;
    isCurrentlyStudying?: boolean;
    gpa?: string;
    description?: string;
  }>;
  experience: Array<{
    id?: string;
    company: string;
    position: string;
    startDate: string;
    endDate?: string | null;
    current?: boolean; // Legacy field name
    isCurrentPosition?: boolean; // New field name
    location?: string;
    description?: string;
    achievements?: string[];
  }>;
  resume?: {
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    fileSize: number;
  };
  coverLetter?: {
    content: string;
    lastUpdated: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  id: string;
  userId: string;
  savedJobs?: number;
  profileViews?: number;
  interviewsScheduled?: number;
  totalJobs?: number;
  activeJobs?: number;
  totalApplications?: number;
  newApplications?: number;
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = environment.apiUrl;
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  private dashboardStatsSubject = new BehaviorSubject<DashboardStats | null>(
    null
  );

  public userProfile$ = this.userProfileSubject.asObservable();
  public dashboardStats$ = this.dashboardStatsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Profile Methods
  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http
      .get<UserProfile[]>(`${this.apiUrl}/userProfiles?userId=${userId}`)
      .pipe(
        switchMap((profiles) => {
          if (profiles.length > 0) {
            const profile = profiles[0];
            // Validate and potentially sync profile with user data
            return this.validateAndSyncProfile(profile);
          } else {
            // Create default profile if none exists
            return this.createDefaultUserProfileAsync(userId);
          }
        }),
        tap((profile) => this.userProfileSubject.next(profile)),
        catchError((error) => {
          console.error('Error fetching user profile:', error);
          return throwError(() => error);
        })
      );
  }

  private validateAndSyncProfile(
    profile: UserProfile
  ): Observable<UserProfile> {
    // Check if profile needs to be synced with user data
    return this.http.get<any>(`${this.apiUrl}/users/${profile.userId}`).pipe(
      map((user) => {
        let needsUpdate = false;
        const updatedProfile = { ...profile };

        // Sync basic personal info if it's missing or outdated
        if (
          !profile.personalInfo.firstName ||
          !profile.personalInfo.lastName ||
          !profile.personalInfo.email
        ) {
          updatedProfile.personalInfo = {
            ...profile.personalInfo,
            firstName: user.firstName || profile.personalInfo.firstName,
            lastName: user.lastName || profile.personalInfo.lastName,
            email: user.email || profile.personalInfo.email,
            phone: user.phone || profile.personalInfo.phone,
          };
          needsUpdate = true;
        }

        if (needsUpdate) {
          // Update profile in background
          this.updateUserProfile(updatedProfile).subscribe();
        }

        return updatedProfile;
      }),
      catchError(() => {
        // If user fetch fails, return profile as-is
        return of(profile);
      })
    );
  }

  private createDefaultUserProfileAsync(
    userId: string
  ): Observable<UserProfile> {
    return this.http.get<any>(`${this.apiUrl}/users/${userId}`).pipe(
      switchMap((user) => {
        const profileWithUserData = this.createProfileFromUserData(user);
        return this.http.post<UserProfile>(
          `${this.apiUrl}/userProfiles`,
          profileWithUserData
        );
      }),
      catchError(() => {
        // If user fetch fails, create with empty data
        const defaultProfile = this.createEmptyProfile(userId);
        return this.http.post<UserProfile>(
          `${this.apiUrl}/userProfiles`,
          defaultProfile
        );
      })
    );
  }

  updateUserProfile(profile: Partial<UserProfile>): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    const updatedProfile = {
      ...currentProfile,
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .put<UserProfile>(
        `${this.apiUrl}/userProfiles/${currentProfile.id}`,
        updatedProfile
      )
      .pipe(
        tap((updated) => {
          this.userProfileSubject.next(updated);
          // Sync personal info changes back to users table
          this.syncPersonalInfoToUser(updated);
        }),
        catchError((error) => {
          console.error('Error updating user profile:', error);
          return throwError(() => error);
        })
      );
  }

  // Sync personal info changes back to the users table
  private syncPersonalInfoToUser(profile: UserProfile): void {
    if (profile.personalInfo) {
      const userUpdates = {
        firstName: profile.personalInfo.firstName,
        lastName: profile.personalInfo.lastName,
        email: profile.personalInfo.email,
        phone: profile.personalInfo.phone,
        updatedAt: new Date().toISOString(),
      };

      this.http
        .patch(`${this.apiUrl}/users/${profile.userId}`, userUpdates)
        .subscribe({
          next: () => {
            console.log('User table synced with profile changes');
          },
          error: (error) => {
            console.error('Error syncing user table:', error);
          },
        });
    }
  }

  private createDefaultUserProfile(userId: string): UserProfile {
    // First, try to get user data to populate personal info
    this.http.get<any>(`${this.apiUrl}/users/${userId}`).subscribe({
      next: (user) => {
        const profileWithUserData = this.createProfileFromUserData(user);
        this.http
          .post<UserProfile>(`${this.apiUrl}/userProfiles`, profileWithUserData)
          .subscribe((created) => this.userProfileSubject.next(created));
      },
      error: () => {
        // If user fetch fails, create with empty data
        const defaultProfile = this.createEmptyProfile(userId);
        this.http
          .post<UserProfile>(`${this.apiUrl}/userProfiles`, defaultProfile)
          .subscribe((created) => this.userProfileSubject.next(created));
      },
    });

    // Return empty profile immediately for synchronous return
    return this.createEmptyProfile(userId);
  }

  private createProfileFromUserData(user: any): UserProfile {
    return {
      id:
        user.id === 'demo-job-seeker'
          ? 'demo-job-seeker'
          : `profile-${user.id}`,
      userId: user.id,
      personalInfo: {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States',
        },
        linkedinUrl: user.linkedin || '',
        portfolioUrl: user.website || '',
        githubUrl: user.github || '',
      },
      professionalInfo: {
        currentTitle: '',
        yearsOfExperience: 0,
        summary: '',
        skills: [],
        preferredJobTypes: [],
        preferredLocations: [],
        expectedSalary: {
          min: 0,
          max: 0,
          currency: 'USD',
        },
        jobAlertFrequency: 'weekly',
        profileVisibility: 'public',
        emailNotifications: true,
        smsNotifications: false,
      },
      education: [],
      experience: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private createEmptyProfile(userId: string): UserProfile {
    return {
      id:
        userId === 'demo-job-seeker' ? 'demo-job-seeker' : `profile-${userId}`,
      userId: userId,
      personalInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States',
        },
      },
      professionalInfo: {
        currentTitle: '',
        yearsOfExperience: 0,
        summary: '',
        skills: [],
        preferredJobTypes: [],
        preferredLocations: [],
        expectedSalary: {
          min: 0,
          max: 0,
          currency: 'USD',
        },
        jobAlertFrequency: 'weekly',
        profileVisibility: 'public',
        emailNotifications: true,
        smsNotifications: false,
      },
      education: [],
      experience: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Dashboard Stats Methods
  getDashboardStats(userId: string): Observable<DashboardStats> {
    return this.http
      .get<DashboardStats[]>(`${this.apiUrl}/dashboardStats?userId=${userId}`)
      .pipe(
        map((stats) => {
          if (stats.length > 0) {
            this.dashboardStatsSubject.next(stats[0]);
            return stats[0];
          } else {
            // Create default stats if none exist
            return this.createDefaultDashboardStats(userId);
          }
        }),
        catchError((error) => {
          console.error('Error fetching dashboard stats:', error);
          return throwError(() => error);
        })
      );
  }

  private createDefaultDashboardStats(userId: string): DashboardStats {
    const defaultStats: DashboardStats = {
      id: `stats-${userId}`,
      userId: userId,
      savedJobs: 0,
      profileViews: 0,
      interviewsScheduled: 0,
      lastUpdated: new Date().toISOString(),
    };

    // Create stats in database
    this.http
      .post<DashboardStats>(`${this.apiUrl}/dashboardStats`, defaultStats)
      .subscribe((created) => this.dashboardStatsSubject.next(created));

    return defaultStats;
  }

  // Convenience methods for updating specific sections
  updatePersonalInfo(
    personalInfo: Partial<UserProfile['personalInfo']>
  ): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    return this.updateUserProfile({
      personalInfo: { ...currentProfile.personalInfo, ...personalInfo },
    });
  }

  updateProfessionalInfo(
    professionalInfo: Partial<UserProfile['professionalInfo']>
  ): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    return this.updateUserProfile({
      professionalInfo: {
        ...currentProfile.professionalInfo,
        ...professionalInfo,
      },
    });
  }

  addEducation(
    education: Omit<UserProfile['education'][0], 'id'>
  ): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    const newEducation = {
      ...education,
      id: this.generateId(),
    };

    return this.updateUserProfile({
      education: [...currentProfile.education, newEducation],
    });
  }

  updateEducation(
    educationId: string,
    education: Partial<UserProfile['education'][0]>
  ): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    const updatedEducation = currentProfile.education.map((edu) =>
      edu.id === educationId ? { ...edu, ...education } : edu
    );

    return this.updateUserProfile({
      education: updatedEducation,
    });
  }

  removeEducation(educationId: string): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    const filteredEducation = currentProfile.education.filter(
      (edu) => edu.id !== educationId
    );

    return this.updateUserProfile({
      education: filteredEducation,
    });
  }

  addExperience(
    experience: Omit<UserProfile['experience'][0], 'id'>
  ): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    const newExperience = {
      ...experience,
      id: this.generateId(),
    };

    return this.updateUserProfile({
      experience: [...currentProfile.experience, newExperience],
    });
  }

  updateExperience(
    experienceId: string,
    experience: Partial<UserProfile['experience'][0]>
  ): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    const updatedExperience = currentProfile.experience.map((exp) =>
      exp.id === experienceId ? { ...exp, ...experience } : exp
    );

    return this.updateUserProfile({
      experience: updatedExperience,
    });
  }

  removeExperience(experienceId: string): Observable<UserProfile> {
    const currentProfile = this.userProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No current profile found'));
    }

    const filteredExperience = currentProfile.experience.filter(
      (exp) => exp.id !== experienceId
    );

    return this.updateUserProfile({
      experience: filteredExperience,
    });
  }

  updateResume(resume: UserProfile['resume']): Observable<UserProfile> {
    return this.updateUserProfile({ resume });
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Create new user profile
  createUserProfile(profile: Partial<UserProfile>): Observable<UserProfile> {
    const newProfile = {
      ...profile,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as UserProfile;

    return this.http
      .post<UserProfile>(`${this.apiUrl}/userProfiles`, newProfile)
      .pipe(
        tap((created) => this.userProfileSubject.next(created)),
        catchError((error) => {
          console.error('Error creating user profile:', error);
          return throwError(() => error);
        })
      );
  }

  // Upload resume (mock implementation)
  uploadResume(file: File): Observable<any> {
    // In a real application, this would upload to a file storage service
    const mockResume = {
      fileName: file.name,
      fileUrl: `/uploads/resumes/${file.name}`,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
    };

    // Return the mock resume data
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next(mockResume);
        observer.complete();
      }, 1000); // Simulate upload delay
    });
  }

  // Get current data synchronously
  getCurrentUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  getCurrentDashboardStats(): DashboardStats | null {
    return this.dashboardStatsSubject.value;
  }
}
