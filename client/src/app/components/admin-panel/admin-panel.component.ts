import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, ApiUser } from '../../services/api.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
  users: ApiUser[] = []; 
  reports: any[] = [];
  currentUser: User | null = null;
  adminError = '';
  adminSuccess = '';
  targetGroupId = '';
  newUsername = '';
  newEmail = '';
  newPassword = '';

  constructor(
    private auth: AuthService,
    private api: ApiService
  ) {
    this.currentUser = this.auth.currentUser(); //user form local (import from auth.service.ts)
  }
//load all users + reports on init
  ngOnInit() {
    this.loadUsers();
    this.loadReports();
  }

//loading users
  loadUsers() {
    if (this.currentUser) {
      this.api.adminGetUsers(this.currentUser.id).subscribe({
        next: (users) => {
          this.users = users;
        },
        error: () => {
          // Fallback to non-admin endpoint if needed oaky becasue user msut have admin access to see this page
          this.api.getUsers().subscribe({ next: (u) => this.users = u });
        }
      });
    }
  }

//creat euser 
  createUser() {
    this.adminError = '';
    this.adminSuccess = '';
    if (!this.currentUser) return; //auth check
    const username = this.newUsername.trim();
    const email = this.newEmail.trim();
    const password = this.newPassword.trim() || undefined; //maybe update for security reasons
    if (!username) {
      this.adminError = 'Username is required';
      return;
    }
    if (!email) {
      this.adminError = 'Email is required';
      return;
    }
    this.api.adminCreateUser(this.currentUser.id, username, email || undefined, password).subscribe({
      next: (r) => {
        if (r.ok) {
          this.adminSuccess = `User ${username} created`;
          this.newUsername = '';
          this.newEmail = '';
          this.newPassword = '';
          this.loadUsers();
          setTimeout(() => this.adminSuccess = '', 3000);
        } else {
          this.adminError = r.msg || 'Failed to create user';
        }
      },
      error: (e) => {
        this.adminError = e.error?.msg || 'Failed to create user';
      }
    });
  }

//rmeove  auser after confirmation and refresh the list
  removeUser(userId: string) {
    if (confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      if (!this.currentUser) return;
      
      this.api.removeUser(userId, this.currentUser.id).subscribe({
        next: (result) => {
          this.adminSuccess = 'User removed successfully!';
          this.loadUsers(); // Reload users
          setTimeout(() => this.adminSuccess = '', 3000);
        },
        error: (error) => {
          this.adminError = error.error?.msg || 'Failed to remove user';
        }
      });
    }
  }

//promote a user to Super Admin after confirmation
  promoteToSuperAdmin(userId: string) {
    if (confirm('Are you sure you want to promote this user to Super Admin?')) {
      if (!this.currentUser) return;
      
      this.api.promoteToSuperAdmin(userId, this.currentUser.id).subscribe({
        next: (result) => {
          this.adminSuccess = 'User promoted to Super Admin successfully!';
          this.loadUsers(); // Reload users
          setTimeout(() => this.adminSuccess = '', 3000);
        },
        error: (error) => {
          this.adminError = error.error?.msg || 'Failed to promote user to Super Admin';
        }
      });
    }
  }

//navigate back to previous page
  goBack() {
    // Navigate back to dashboard
    window.history.back();
  }

//checks for usper admin
  isSuperAdmin(): boolean {
    return this.currentUser ? this.currentUser.roles.includes('super') : false;
  }

//whether target user has super admin role
  isTargetSuper(user: ApiUser): boolean {
    return user.roles.includes('super') || user.roles.includes('super_admin');
  }

//whether target user has any group admin role
  hasGroupAdmin(user: ApiUser): boolean {
    return user.roles.includes('group_admin') || user.roles.includes('groupAdmin');
  }

//promote/demote group admin role for a user
  toggleGroupAdmin(userId: string, promote: boolean) {
    if (!this.currentUser) return;
    this.adminError = '';
    this.api.adminToggleGroupAdmin(userId, this.currentUser.id, promote).subscribe({
      next: (r) => {
        this.adminSuccess = r.msg || (promote ? 'Promoted' : 'Demoted');
        this.loadUsers();
        setTimeout(() => this.adminSuccess = '', 3000);
      },
      error: (e) => {
        this.adminError = e.error?.msg || 'Failed to toggle role';
      }
    });
  }

//load admin-visible reports when super admin
  loadReports() {
    if (this.currentUser && this.isSuperAdmin()) {
      console.log('Loading reports for user:', this.currentUser.id);
      this.api.getReports(this.currentUser.id).subscribe({
        next: (reports) => {
          console.log('Reports loaded:', reports);
          this.reports = reports;
        },
        error: (error) => {
          console.error('Error loading reports:', error);
        }
      });
    }
  }
}