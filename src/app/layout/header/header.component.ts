import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../core/services/auth.service';
import { SearchService } from '../../core/services/search.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit, OnDestroy {
  isMenuOpen = false;
  searchQuery = '';
  isSearchOpen = false;
  isLoggedIn = false;
  currentUser: User | null = null;
  isScrolled = false;
  private authSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private searchService: SearchService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    // Subscribe to authentication state
    this.authSubscription.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
        this.isLoggedIn = !!user;
      })
    );

    // Setup fixed header scroll detection
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }

  private setupIntersectionObserver() {
    // Create a sentinel element at the top of the page to detect scroll
    const sentinel = document.createElement('div');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '0';
    sentinel.style.height = '10px';
    sentinel.style.width = '100%';
    sentinel.style.pointerEvents = 'none';
    sentinel.style.visibility = 'hidden';
    document.body.insertBefore(sentinel, document.body.firstChild);

    // Create intersection observer to detect when we scroll past the top
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When sentinel is not visible, we've scrolled past the threshold
          const newScrolled = !entry.isIntersecting;

          if (newScrolled !== this.isScrolled) {
            this.isScrolled = newScrolled;
          }
        });
      },
      {
        threshold: 0,
        rootMargin: '0px',
      }
    );

    observer.observe(sentinel);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleSearch() {
    this.isSearchOpen = !this.isSearchOpen;
    if (this.isSearchOpen) {
      // Focus the search input after the popup opens
      setTimeout(() => {
        const searchInput = document.querySelector(
          '.mobile-search-input'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  }

  closeSearch() {
    this.isSearchOpen = false;
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      // Update search service with query
      this.searchService.updateFilters({
        query: this.searchQuery.trim(),
      });

      // Navigate to jobs page with search query
      this.router.navigate(['/jobs'], {
        queryParams: { q: this.searchQuery.trim() },
      });

      // Close mobile search popup
      this.closeSearch();

      // Clear search query after navigation
      this.searchQuery = '';
    }
  }

  onSignin() {
    // Navigate to signin page using Angular router
    // This will trigger the scroll-to-top behavior
    window.location.href = '/auth/signin';
  }

  onSignup() {
    // Navigate to signup page using Angular router
    // This will trigger the scroll-to-top behavior
    window.location.href = '/auth/signup';
  }

  onLogout() {
    this.authService.logout();
  }
}
