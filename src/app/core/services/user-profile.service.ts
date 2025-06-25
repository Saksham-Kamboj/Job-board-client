import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
  dateOfBirth?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
}

export interface ProfessionalInfo {
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
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  description?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  location: string;
  description: string;
  achievements: string[];
}

export interface Resume {
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  fileSize: number;
}

export interface DashboardData {
  savedJobs: {
    jobId: string;
    savedDate: string;
    jobTitle: string;
    company: string;
    location: string;
  }[];
  interviews: {
    jobId: string;
    applicationId: string;
    interviewDate: string;
    interviewType: string;
    status: string;
    jobTitle: string;
    company: string;
    location: string;
    interviewMode: string;
    notes: string;
  }[];
}

export interface UserProfile {
  id: string;
  userId: string;
  personalInfo: PersonalInfo;
  professionalInfo: ProfessionalInfo;
  education: Education[];
  experience: Experience[];
  resume?: Resume;
  dashboardData?: DashboardData;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private apiUrl = environment.apiUrl + '/userProfiles';
  private currentProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentProfile$ = this.currentProfileSubject.asObservable();

  constructor(private http: HttpClient) {}

  getUserProfile(userId: string): Observable<UserProfile | null> {
    return this.http.get<UserProfile[]>(`${this.apiUrl}?userId=${userId}`).pipe(
      map((profiles) => (profiles.length > 0 ? profiles[0] : null)),
      tap((profile) => this.currentProfileSubject.next(profile))
    );
  }

  createUserProfile(
    profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Observable<UserProfile> {
    const newProfile = {
      ...profile,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .post<UserProfile>(this.apiUrl, newProfile)
      .pipe(tap((profile) => this.currentProfileSubject.next(profile)));
  }

  updateUserProfile(
    profileId: string,
    updates: Partial<UserProfile>
  ): Observable<UserProfile> {
    const updatedProfile = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return this.http
      .patch<UserProfile>(`${this.apiUrl}/${profileId}`, updatedProfile)
      .pipe(tap((profile) => this.currentProfileSubject.next(profile)));
  }

  uploadResume(file: File): Observable<Resume> {
    // In a real application, this would upload to a file storage service
    // For demo purposes, we'll simulate the upload
    const resume: Resume = {
      fileName: file.name,
      fileUrl: `/uploads/resumes/${file.name}`,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
    };

    return new Observable((observer) => {
      setTimeout(() => {
        observer.next(resume);
        observer.complete();
      }, 1000);
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getCurrentProfile(): UserProfile | null {
    return this.currentProfileSubject.value;
  }

  clearCurrentProfile(): void {
    this.currentProfileSubject.next(null);
  }
}
