import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css'
})
export class ManageUsersComponent {
  searchQuery = '';
  selectedRole = 'all';
  
  users = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@email.com',
      role: 'job-seeker',
      status: 'active',
      joinDate: '2024-01-15',
      lastLogin: '2024-01-20'
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      role: 'company',
      status: 'active',
      joinDate: '2024-01-10',
      lastLogin: '2024-01-19'
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike.johnson@email.com',
      role: 'job-seeker',
      status: 'inactive',
      joinDate: '2024-01-05',
      lastLogin: '2024-01-18'
    },
    {
      id: 4,
      name: 'Admin User',
      email: 'admin@jobboard.com',
      role: 'admin',
      status: 'active',
      joinDate: '2023-12-01',
      lastLogin: '2024-01-21'
    }
  ];

  get filteredUsers() {
    return this.users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesRole = this.selectedRole === 'all' || user.role === this.selectedRole;
      return matchesSearch && matchesRole;
    });
  }

  toggleUserStatus(userId: number) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.status = user.status === 'active' ? 'inactive' : 'active';
    }
  }

  deleteUser(userId: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.users = this.users.filter(u => u.id !== userId);
    }
  }

  viewUserDetails(userId: number) {
    console.log('View user details:', userId);
    // Implement user details view
  }
}
