import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, catchError, tap, switchMap, takeWhile } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'job-seeker' | 'company' | 'admin';
  password?: string;
  createdAt: string;
  isActive: boolean;
  phone?: string;
  location?: string;
  bio?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  // Company-specific fields
  companyName?: string;
  companyDescription?: string;
  companyWebsite?: string;
  companySize?: string;
  industry?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'job-seeker' | 'company'; // Admin accounts are pre-created in database
  // Company-specific fields for registration
  companyName?: string;
  companyDescription?: string;
  companyWebsite?: string;
  companySize?: string;
  industry?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private statusCheckInterval: any;

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(map((user) => !!user));

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredAuth();
    this.startUserStatusMonitoring();
  }

  private loadStoredAuth(): void {
    const token = sessionStorage.getItem('auth_token');
    const user = sessionStorage.getItem('current_user');

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        this.tokenSubject.next(token);
        this.currentUserSubject.next(parsedUser);
      } catch (error) {
        this.clearStoredAuth();
      }
    }
  }

  private storeAuth(user: User, token: string): void {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('current_user', JSON.stringify(user));
    this.tokenSubject.next(token);
    this.currentUserSubject.next(user);
  }

  private clearStoredAuth(): void {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('current_user');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    // Admin registration is prevented by interface type restriction
    const newUser: User = {
      id: this.generateId(),
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      role: request.role,
      createdAt: new Date().toISOString(),
      isActive: true,
      // Add company-specific fields if role is company
      ...(request.role === 'company' && {
        companyName: request.companyName,
        companyDescription: request.companyDescription,
        companyWebsite: request.companyWebsite,
        companySize: request.companySize,
        industry: request.industry,
      }),
    };

    // First check if user already exists
    return this.http
      .get<User[]>(`${this.API_URL}/users?email=${request.email}`)
      .pipe(
        map((users) => {
          if (users.length > 0) {
            throw new Error('User with this email already exists');
          }
          return users;
        }),
        // If no existing user, create new one
        switchMap(() => {
          const userWithPassword = { ...newUser, password: request.password };
          return this.http.post<User>(
            `${this.API_URL}/users`,
            userWithPassword
          );
        }),
        // Execute the create request
        map(() => {
          const token = this.generateToken();
          const response: AuthResponse = { user: newUser, token };
          this.storeAuth(newUser, token);
          return response;
        }),
        catchError((error) => {
          console.error('Registration error:', error);
          throw error;
        })
      );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .get<User[]>(
        `${this.API_URL}/users?email=${request.email}&password=${request.password}`
      )
      .pipe(
        map((users) => {
          if (users.length === 0) {
            throw new Error('Invalid email or password');
          }

          const user = users[0];
          if (!user.isActive) {
            throw new Error('Account is deactivated');
          }

          // Remove password from user object
          const { password, ...userWithoutPassword } = user;
          const token = this.generateToken();
          const response: AuthResponse = { user: userWithoutPassword, token };

          this.storeAuth(userWithoutPassword, token);
          return response;
        }),
        catchError((error) => {
          console.error('Login error:', error);
          throw error;
        })
      );
  }

  logout(): void {
    this.stopUserStatusMonitoring();
    this.clearStoredAuth();
    this.router.navigate(['/auth/signin']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  hasRole(role: 'job-seeker' | 'company' | 'admin'): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  isJobSeeker(): boolean {
    return this.hasRole('job-seeker');
  }

  isCompany(): boolean {
    return this.hasRole('company');
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private generateToken(): string {
    return (
      'jwt_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
    );
  }

  // Update user profile
  updateProfile(updates: Partial<User>): Observable<User> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const updatedUser = { ...currentUser, ...updates };

    return this.http
      .put<User>(`${this.API_URL}/users/${currentUser.id}`, updatedUser)
      .pipe(
        tap((user) => {
          const { password, ...userWithoutPassword } = user;
          this.currentUserSubject.next(userWithoutPassword);
          sessionStorage.setItem(
            'current_user',
            JSON.stringify(userWithoutPassword)
          );
        })
      );
  }

  // Change password
  changePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<boolean> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Verify current password
    return this.http
      .get<User[]>(
        `${this.API_URL}/users?id=${user.id}&password=${currentPassword}`
      )
      .pipe(
        switchMap((users) => {
          if (users.length === 0) {
            throw new Error('Current password is incorrect');
          }

          const userWithNewPassword = { ...users[0], password: newPassword };
          return this.http.put<User>(
            `${this.API_URL}/users/${user.id}`,
            userWithNewPassword
          );
        }),
        map(() => true),
        catchError((error) => {
          console.error('Password change error:', error);
          throw error;
        })
      );
  }

  updateUserProfile(updatedUser: User): void {
    // Update the user in local storage
    this.storeAuth(updatedUser, this.getToken() || '');

    // Update the current user subject
    this.currentUserSubject.next(updatedUser);

    // In a real application, you would also update the user on the server
    // this.http.put<User>(`${this.API_URL}/users/${updatedUser.id}`, updatedUser).subscribe();
  }

  // User status monitoring methods
  private startUserStatusMonitoring(): void {
    // Check user status every 30 seconds if user is logged in
    this.statusCheckInterval = interval(30000)
      .pipe(takeWhile(() => this.isAuthenticated()))
      .subscribe(() => {
        this.checkUserStatus();
      });
  }

  private stopUserStatusMonitoring(): void {
    if (this.statusCheckInterval) {
      this.statusCheckInterval.unsubscribe();
      this.statusCheckInterval = null;
    }
  }

  private checkUserStatus(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    this.http.get<User>(`${this.API_URL}/users/${currentUser.id}`).subscribe({
      next: (user) => {
        if (!user.isActive) {
          console.log('User account has been deactivated. Logging out...');
          this.forceLogout(
            'Your account has been deactivated by an administrator.'
          );
        }
      },
      error: (error) => {
        console.error('Error checking user status:', error);
        // If user not found (deleted), force logout
        if (error.status === 404) {
          this.forceLogout('Your account has been removed.');
        }
      },
    });
  }

  private forceLogout(message: string): void {
    this.stopUserStatusMonitoring();
    this.clearStoredAuth();

    // Show message to user
    alert(message);

    // Navigate to signin page
    this.router.navigate(['/auth/signin']);
  }
}
