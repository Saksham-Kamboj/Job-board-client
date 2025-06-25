import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-my-jobs',
  imports: [CommonModule, RouterModule],
  templateUrl: './my-jobs.component.html',
  styleUrl: './my-jobs.component.css'
})
export class MyJobsComponent {
  myJobs = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      location: 'New York, NY',
      salary: '$80,000 - $120,000',
      postedDate: '2024-01-15',
      status: 'Active',
      applicants: 25
    },
    {
      id: 2,
      title: 'Product Manager',
      location: 'San Francisco, CA',
      salary: '$90,000 - $130,000',
      postedDate: '2024-01-10',
      status: 'Active',
      applicants: 18
    },
    {
      id: 3,
      title: 'UI/UX Designer',
      location: 'Remote',
      salary: '$70,000 - $100,000',
      postedDate: '2024-01-05',
      status: 'Closed',
      applicants: 42
    }
  ];

  editJob(jobId: number) {
    // Navigate to edit job page
    console.log('Edit job:', jobId);
  }

  viewApplicants(jobId: number) {
    // Navigate to applicants page
    console.log('View applicants for job:', jobId);
  }

  toggleJobStatus(jobId: number) {
    const job = this.myJobs.find(j => j.id === jobId);
    if (job) {
      job.status = job.status === 'Active' ? 'Closed' : 'Active';
    }
  }
}
