import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ScrollToTopComponent } from './shared/components/scroll-to-top/scroll-to-top.component';
import { ThemeService } from './core/services/theme.service';
import { ScrollService } from './core/services/scroll.service';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './core/services/settings.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    ScrollToTopComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'job-board';
  private subscriptions = new Subscription();

  constructor(
    private themeService: ThemeService,
    private scrollService: ScrollService,
    private authService: AuthService,
    private settingsService: SettingsService
  ) {}

  ngOnInit() {
    // Initialize theme service to ensure theme is applied on app startup
    // The theme service will automatically load the saved theme from sessionStorage

    // Subscribe to authentication changes to sync theme with user settings
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user) => {
        if (user) {
          // Load user settings and sync theme when user is authenticated
          this.settingsService.getUserSettings(user.id).subscribe({
            next: (settings) => {
              // Sync theme from user settings if available
              if (
                settings.appearance.theme &&
                (settings.appearance.theme === 'light' ||
                  settings.appearance.theme === 'dark')
              ) {
                this.themeService.syncThemeFromSettings(
                  settings.appearance.theme as 'light' | 'dark'
                );
              }
            },
            error: () => {
              console.log('No user settings found, using current theme');
            },
          });
        } else {
          // When user logs out, restore theme from sessionStorage
          this.themeService.restoreThemeFromStorage();
        }
      })
    );

    // Initialize scroll service to handle intelligent scroll restoration
    // The scroll service will automatically:
    // - Scroll to top for new page navigation
    // - Restore scroll position when using back button
    // - Store scroll positions for each route
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
