import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-not-found',
  imports: [CommonModule, RouterModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  currentUser: User | null = null;
  private authSubscription: Subscription = new Subscription();

  constructor(private location: Location, private authService: AuthService) {}

  // Expose observables for template use
  get currentUser$() {
    return this.authService.currentUser$;
  }

  get isAuthenticated$() {
    return this.authService.isAuthenticated$;
  }

  ngOnInit(): void {
    // Check current state immediately
    const currentUser = this.authService.getCurrentUser();
    this.currentUser = currentUser;
    this.isLoggedIn = !!currentUser;

    // Subscribe to authentication state changes
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
    });
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }

  goBack(): void {
    this.location.back();
  }

  get userRole(): string {
    return this.currentUser?.role || 'guest';
  }

  get isJobSeeker(): boolean {
    return this.currentUser?.role === 'job-seeker';
  }

  get isCompany(): boolean {
    return this.currentUser?.role === 'company';
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }
}
