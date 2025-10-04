import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, Group } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  groups: Group[] = [];
  allGroups: Group[] = [];
  showCreateGroup = false;
  newGroupName = '';
  groupError = '';
  groupSuccess = '';
  
  showBrowseGroups = false;
  browseError = '';
  browseSuccess = '';
  
  showDeleteAccount = false;
  deletePassword = '';
  deleteError = '';

  constructor(
    private auth: AuthService, 
    private api: ApiService, 
    private router: Router
  ) {
    this.user = this.auth.currentUser();
  }

  ngOnInit() {
    this.loadGroups();
    this.loadAllGroups();
  }

  loadGroups() {
    if (this.user) {
      this.api.getUserGroups(this.user.id).subscribe({
        next: (groups) => {
          this.groups = groups;
        },
        error: (error) => {
          console.error('Error loading groups:', error);
        }
      });
    }
  }

  createGroup() {
    if (!this.newGroupName.trim()) {
      this.groupError = 'Group name is required';
      return;
    }

    if (!this.user) {
      this.groupError = 'User not found';
      return;
    }

    this.groupError = '';
    this.api.createGroup(this.newGroupName.trim(), this.user.id).subscribe({
      next: (group) => {
        this.groupSuccess = 'Group created successfully!';
        this.newGroupName = '';
        this.showCreateGroup = false;
        this.loadGroups(); // Reload groups
        setTimeout(() => this.groupSuccess = '', 3000);
      },
      error: (error) => {
        this.groupError = error.error?.msg || 'Failed to create group';
      }
    });
  }

  viewGroup(groupId: string) {
    this.router.navigate(['/group', groupId]);
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  canCreateGroups(): boolean {
    return this.user ? (this.user.roles.includes('super') || this.user.roles.includes('groupAdmin')) : false;
  }

  isSuperAdmin(): boolean {
    return this.user ? this.user.roles.includes('super') : false;
  }

  loadAllGroups() {
    this.api.getAllGroups().subscribe({
      next: (groups) => {
        this.allGroups = groups;
      },
      error: (error) => {
        console.error('Error loading all groups:', error);
      }
    });
  }

  get availableGroups(): Group[] {
    if (!this.user) return [];
    return this.allGroups.filter(group => !group.memberIds.includes(this.user!.id));
  }

  requestToJoinGroup(groupId: string) {
    if (!this.user) return;
    
    this.browseError = '';
    this.api.registerGroupInterest(groupId, this.user.id).subscribe({
      next: (result) => {
        this.browseSuccess = 'Request sent to group admin!';
        setTimeout(() => this.browseSuccess = '', 3000);
      },
      error: (error) => {
        this.browseError = error.error?.msg || 'Failed to send request';
      }
    });
  }

  leaveGroup(groupId: string) {
    if (!this.user) return;
    
    if (confirm('Are you sure you want to leave this group?')) {
      this.api.leaveGroup(this.user.id, groupId).subscribe({
        next: (result) => {
          this.groupSuccess = 'Left group successfully!';
          this.loadGroups(); // Reload groups
          setTimeout(() => this.groupSuccess = '', 3000);
        },
        error: (error) => {
          this.groupError = error.error?.msg || 'Failed to leave group';
        }
      });
    }
  }

  deleteAccount() {
    if (!this.user) return;
    
    if (!this.deletePassword) {
      this.deleteError = 'Password is required';
      return;
    }
    
    if (confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      this.api.deleteUserSelf(this.user.id, this.deletePassword).subscribe({
        next: (result) => {
          alert('Account deleted successfully. You will be logged out.');
          this.auth.logout();
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.deleteError = error.error?.msg || 'Failed to delete account';
        }
      });
    }
  }

  getPrimaryRole(): string {
    if (!this.user || !this.user.roles || this.user.roles.length === 0) {
      return 'User';
    }
    
    // Priority order: super_admin > super > group_admin > groupAdmin > user
    if (this.user.roles.includes('super_admin')) return 'Super Admin';
    if (this.user.roles.includes('super')) return 'Super Admin';
    if (this.user.roles.includes('group_admin')) return 'Group Admin';
    if (this.user.roles.includes('groupAdmin')) return 'Group Admin';
    return 'User';
  }
}