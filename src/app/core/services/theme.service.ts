import { Injectable, Renderer2, RendererFactory2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private renderer: Renderer2;
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  private isInitialized = false;

  public isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.initializeTheme();
  }

  private initializeTheme(): void {
    // Check for saved theme preference in sessionStorage first
    const savedTheme = sessionStorage.getItem('theme');

    // Check system preference as fallback
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    // Determine initial theme
    let isDark = false;
    if (savedTheme) {
      isDark = savedTheme === 'dark';
    } else {
      // If no saved theme, use system preference
      isDark = prefersDark;
      // Save the initial preference to sessionStorage
      sessionStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Set the initial theme state
    this.isDarkModeSubject.next(isDark);

    // Apply theme immediately to avoid flash
    this.applyThemeToDOM(isDark);

    this.isInitialized = true;
  }

  private applyThemeToDOM(isDark: boolean): void {
    if (isDark) {
      this.renderer.addClass(this.document.documentElement, 'dark');
    } else {
      this.renderer.removeClass(this.document.documentElement, 'dark');
    }
  }

  setTheme(isDark: boolean): void {
    this.isDarkModeSubject.next(isDark);
    this.applyThemeToDOM(isDark);
    sessionStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  toggleTheme(): void {
    const currentTheme = this.isDarkModeSubject.value;
    this.setTheme(!currentTheme);
  }

  getCurrentTheme(): boolean {
    return this.isDarkModeSubject.value;
  }

  // Method to sync theme from user settings (called by settings service)
  syncThemeFromSettings(themeFromSettings: 'light' | 'dark'): void {
    const isDark = themeFromSettings === 'dark';
    const currentTheme = this.isDarkModeSubject.value;

    // Only update if different from current theme
    if (isDark !== currentTheme) {
      this.setTheme(isDark);
    }
  }

  // Method to restore theme from sessionStorage (useful for page refresh)
  restoreThemeFromStorage(): void {
    if (!this.isInitialized) {
      this.initializeTheme();
    } else {
      // Re-check sessionStorage in case it was cleared
      const savedTheme = sessionStorage.getItem('theme');
      if (!savedTheme) {
        // If sessionStorage was cleared, save current theme
        sessionStorage.setItem('theme', this.getThemeString());
      }
    }
  }

  // Method to get theme as string for settings
  getThemeString(): 'light' | 'dark' {
    return this.isDarkModeSubject.value ? 'dark' : 'light';
  }
}
