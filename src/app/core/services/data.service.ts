import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface JobCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
  description: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
  rating: number;
  location: string;
  joinedDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all job categories
   */
  getJobCategories(): Observable<JobCategory[]> {
    return this.http.get<JobCategory[]>(`${this.apiUrl}/jobCategories`);
  }

  /**
   * Get all testimonials
   */
  getTestimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(`${this.apiUrl}/testimonials`);
  }

  /**
   * Get a specific job category by ID
   */
  getJobCategoryById(id: string): Observable<JobCategory> {
    return this.http.get<JobCategory>(`${this.apiUrl}/jobCategories/${id}`);
  }

  /**
   * Get a specific testimonial by ID
   */
  getTestimonialById(id: string): Observable<Testimonial> {
    return this.http.get<Testimonial>(`${this.apiUrl}/testimonials/${id}`);
  }

  /**
   * Update job category count
   */
  updateJobCategoryCount(id: string, count: number): Observable<JobCategory> {
    return this.http.patch<JobCategory>(`${this.apiUrl}/jobCategories/${id}`, { count });
  }
}
