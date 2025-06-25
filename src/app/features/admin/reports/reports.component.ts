import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports',
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent {
  stats = {
    totalUsers: 1250,
    totalJobs: 485,
    totalApplications: 3420,
    activeJobs: 342,
    newUsersThisMonth: 89,
    newJobsThisMonth: 45
  };

  userGrowth = [
    { month: 'Jan', users: 950 },
    { month: 'Feb', users: 1020 },
    { month: 'Mar', users: 1100 },
    { month: 'Apr', users: 1180 },
    { month: 'May', users: 1250 }
  ];

  jobCategories = [
    { category: 'Technology', count: 145, percentage: 30 },
    { category: 'Marketing', count: 97, percentage: 20 },
    { category: 'Sales', count: 73, percentage: 15 },
    { category: 'Design', count: 68, percentage: 14 },
    { category: 'Finance', count: 58, percentage: 12 },
    { category: 'Others', count: 44, percentage: 9 }
  ];

  recentActivity = [
    { type: 'user_registered', message: 'New user John Doe registered', time: '2 hours ago' },
    { type: 'job_posted', message: 'New job "Frontend Developer" posted by TechCorp', time: '4 hours ago' },
    { type: 'application_submitted', message: '5 new applications received', time: '6 hours ago' },
    { type: 'user_registered', message: 'New company "StartupXYZ" registered', time: '8 hours ago' },
    { type: 'job_posted', message: 'New job "Product Manager" posted by InnovateCo', time: '1 day ago' }
  ];

  exportReport(type: string) {
    console.log('Exporting report:', type);
    // Implement report export logic
    alert(`Exporting ${type} report...`);
  }
}
