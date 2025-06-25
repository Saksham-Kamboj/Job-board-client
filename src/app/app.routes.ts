import { Routes } from '@angular/router';
import { AuthGuard, RoleGuard, GuestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Home page
  {
    path: '',
    loadComponent: () =>
      import('./public/home/home.component').then((m) => m.HomeComponent),
  },

  // Job posting route (for admin and company roles) - MUST come before jobs/:id
  {
    path: 'post-job',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () =>
      import('./features/company/jobs/job-post/job-post.component').then(
        (m) => m.JobPostComponent
      ),
  },

  // Public routes
  {
    path: 'jobs',
    loadComponent: () =>
      import('./public/jobs/job-list/job-list.component').then(
        (m) => m.JobListComponent
      ),
  },
  // Redirect old job creation route to new one
  {
    path: 'jobs/create',
    redirectTo: '/post-job',
    pathMatch: 'full',
  },
  {
    path: 'jobs/:id/edit',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () =>
      import('./features/jobs/job-edit/job-edit.component').then(
        (m) => m.JobEditComponent
      ),
  },
  {
    path: 'jobs/:id/apply',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['job-seeker'] },
    loadComponent: () =>
      import('./features/job-seeker/jobs/job-apply/job-apply.component').then(
        (m) => m.JobApplyComponent
      ),
  },
  {
    path: 'jobs/:id',
    loadComponent: () =>
      import('./public/jobs/job-detail/job-detail.component').then(
        (m) => m.JobDetailComponent
      ),
  },

  // Public routes
  {
    path: 'about',
    loadComponent: () =>
      import('./public/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./public/contact/contact.component').then(
        (m) => m.ContactComponent
      ),
  },

  // Authentication routes (only for guests)
  {
    path: 'login',
    canActivate: [GuestGuard],
    loadComponent: () =>
      import('./auth/signin/signin.component').then((m) => m.SigninComponent),
  },
  {
    path: 'register',
    canActivate: [GuestGuard],
    loadComponent: () =>
      import('./auth/signup/signup.component').then((m) => m.SignupComponent),
  },
  // Keep old auth routes for backward compatibility
  {
    path: 'auth',
    canActivate: [GuestGuard],
    children: [
      {
        path: 'signin',
        loadComponent: () =>
          import('./auth/signin/signin.component').then(
            (m) => m.SigninComponent
          ),
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./auth/signup/signup.component').then(
            (m) => m.SignupComponent
          ),
      },
      {
        path: '',
        redirectTo: 'signin',
        pathMatch: 'full',
      },
    ],
  },

  // Job-Seeker Routes
  {
    path: 'jobseeker',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'job-seeker' },
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./public/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./public/jobs/job-list/job-list.component').then(
            (m) => m.JobListComponent
          ),
      },
      {
        path: 'applied',
        loadComponent: () =>
          import(
            './features/job-seeker/jobs/applied-jobs/applied-jobs.component'
          ).then((m) => m.AppliedJobsComponent),
      },
      {
        path: 'saved',
        loadComponent: () =>
          import(
            './features/job-seeker/jobs/saved-jobs/saved-jobs.component'
          ).then((m) => m.SavedJobsComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/job-seeker/dashboard/job-seeker-dashboard.component'
          ).then((m) => m.JobSeekerDashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import(
            './features/job-seeker/profile/job-seeker-profile.component'
          ).then((m) => m.JobSeekerProfileComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import(
            './features/job-seeker/settings/job-seeker-settings.component'
          ).then((m) => m.JobSeekerSettingsComponent),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },

  // Company Routes
  {
    path: 'company',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'company' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/company/dashboard/company-dashboard.component'
          ).then((m) => m.CompanyDashboardComponent),
      },
      {
        path: 'post-job',
        loadComponent: () =>
          import('./features/company/jobs/job-post/job-post.component').then(
            (m) => m.JobPostComponent
          ),
      },
      {
        path: 'my-jobs',
        loadComponent: () =>
          import('./features/jobs/my-jobs/my-jobs.component').then(
            (m) => m.MyJobsComponent
          ),
      },
      {
        path: 'applicants/:jobId',
        loadComponent: () =>
          import(
            './features/jobs/job-applicants/job-applicants.component'
          ).then((m) => m.JobApplicantsComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/company/profile/company-profile.component').then(
            (m) => m.CompanyProfileComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/company/settings/company-settings.component').then(
            (m) => m.CompanySettingsComponent
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Admin Routes
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'admin' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'manage-users',
        loadComponent: () =>
          import('./features/admin/manage-users/manage-users.component').then(
            (m) => m.ManageUsersComponent
          ),
      },
      {
        path: 'manage-jobs',
        loadComponent: () =>
          import(
            './features/jobs/job-management/job-management.component'
          ).then((m) => m.JobManagementComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/reports/reports.component').then(
            (m) => m.ReportsComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/admin/profile/admin-profile.component').then(
            (m) => m.AdminProfileComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/admin/settings/admin-settings.component').then(
            (m) => m.AdminSettingsComponent
          ),
      },
      // Keep old routes for backward compatibility
      {
        path: 'jobs',
        redirectTo: 'manage-jobs',
        pathMatch: 'full',
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Wildcard route - must be last
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];
