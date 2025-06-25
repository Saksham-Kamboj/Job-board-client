import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-job-applicants',
  imports: [CommonModule],
  templateUrl: './job-applicants.component.html',
  styleUrl: './job-applicants.component.css'
})
export class JobApplicantsComponent implements OnInit {
  jobId: string | null = null;
  jobTitle = 'Senior Frontend Developer';
  
  applicants = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+1 (555) 123-4567',
      appliedDate: '2024-01-20',
      status: 'Under Review',
      experience: '5 years',
      skills: ['React', 'TypeScript', 'Node.js']
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      phone: '+1 (555) 987-6543',
      appliedDate: '2024-01-18',
      status: 'Interview Scheduled',
      experience: '3 years',
      skills: ['Angular', 'JavaScript', 'CSS']
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike.johnson@email.com',
      phone: '+1 (555) 456-7890',
      appliedDate: '2024-01-15',
      status: 'Rejected',
      experience: '2 years',
      skills: ['Vue.js', 'HTML', 'SCSS']
    }
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.jobId = this.route.snapshot.paramMap.get('jobId');
  }

  updateStatus(applicantId: number, newStatus: string) {
    const applicant = this.applicants.find(a => a.id === applicantId);
    if (applicant) {
      applicant.status = newStatus;
    }
  }

  downloadResume(applicantId: number) {
    console.log('Download resume for applicant:', applicantId);
    // Implement resume download logic
  }

  contactApplicant(applicantId: number) {
    const applicant = this.applicants.find(a => a.id === applicantId);
    if (applicant) {
      window.location.href = `mailto:${applicant.email}`;
    }
  }
}
