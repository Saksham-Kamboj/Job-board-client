import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollService } from '../../../core/services/scroll.service';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scroll-to-top.component.html',
  styleUrl: './scroll-to-top.component.css',
})
export class ScrollToTopComponent implements OnInit, OnDestroy {
  isVisible = false;
  isScrolling = false;
  scrollDirection: 'up' | 'down' = 'down'; // Made public for template access
  private scrollThreshold = 200; // Show button after scrolling 200px (reduced for better UX)
  private scrollTimer: any;
  private scrollEventTimer: any;
  private lastScrollTop = 0;

  constructor(private scrollService: ScrollService) {}

  ngOnInit(): void {
    this.checkScrollPosition();
  }

  ngOnDestroy(): void {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    if (this.scrollEventTimer) {
      cancelAnimationFrame(this.scrollEventTimer);
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    // Throttle scroll events to improve performance
    if (this.scrollEventTimer) {
      return;
    }

    this.scrollEventTimer = requestAnimationFrame(() => {
      this.checkScrollPosition();
      this.detectScrollDirection();
      this.handleScrolling();
      this.scrollEventTimer = null;
    });
  }

  private checkScrollPosition(): void {
    const currentScroll = window.scrollY;
    const shouldShow = currentScroll > this.scrollThreshold;

    // Only show if scrolling up or if we're far enough down
    this.isVisible =
      shouldShow &&
      (this.scrollDirection === 'up' ||
        currentScroll > this.scrollThreshold * 2);
  }

  private detectScrollDirection(): void {
    const currentScrollTop = window.scrollY;

    // Only update direction if there's a significant change to reduce jitter
    const scrollDiff = Math.abs(currentScrollTop - this.lastScrollTop);
    if (scrollDiff > 5) {
      if (currentScrollTop > this.lastScrollTop) {
        this.scrollDirection = 'down';
      } else if (currentScrollTop < this.lastScrollTop) {
        this.scrollDirection = 'up';
      }
      this.lastScrollTop = currentScrollTop;
    }
  }

  private handleScrolling(): void {
    this.isScrolling = true;

    // Clear existing timer
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }

    // Set timer to detect when scrolling stops
    this.scrollTimer = setTimeout(() => {
      this.isScrolling = false;
    }, 150);
  }

  scrollToTop(): void {
    // Immediately hide button to prevent multiple clicks
    this.isVisible = false;

    // Use direct scroll to avoid conflicts with other scroll logic
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });

    // Reset visibility after scroll completes
    setTimeout(() => {
      this.checkScrollPosition();
    }, 800);
  }
}
