import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, Group } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';

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
    private router: Router,
    private socketService: SocketService
  ) {
    this.user = this.auth.currentUser();
  }

  /**
   * Lifecycle: load data and wire up membership approval notifications.
   */
  ngOnInit() {
    this.loadGroups();
    this.loadAllGroups();
    // Join personal user room and listen for membership approvals
    if (this.user) {
      this.socketService.joinUserRoom(this.user.id);
      this.socketService.onMembershipApproved().subscribe(() => {
        this.loadGroups();
        this.loadAllGroups();
      });
    }
  }

  /**
   * Load groups the current user belongs to.
   */
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

  /**
   * Create a new group owned by the current user.
   */
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

  /**
   * Navigate to a group's detail page.
   */
  viewGroup(groupId: string) {
    this.router.navigate(['/group', groupId]);
  }

  /**
   * Navigate to the admin panel.
   */
  goToAdmin() {
    this.router.navigate(['/admin']);
  }

  /**
   * Log out and navigate to login.
   */
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Whether the current user can create groups.
   */
  canCreateGroups(): boolean {
    return this.user ? (this.user.roles.includes('super') || this.user.roles.includes('groupAdmin')) : false;
  }

  /**
   * Whether the current user is super admin.
   */
  isSuperAdmin(): boolean {
    return this.user ? this.user.roles.includes('super') : false;
  }

  /**
   * Load all groups (for browsing).
   */
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

  /**
   * Compute groups user can request to join.
   */
  get availableGroups(): Group[] {
    if (!this.user) return [];
    return this.allGroups.filter(group => !group.memberIds.includes(this.user!.id));
  }

  /**
   * Request to join a group; notifies group admins.
   */
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

  /**
   * Leave a group after confirmation.
   */
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

  /**
   * Permanently delete the current user's account after confirmation.
   */
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

  /**
   * Derive the primary role label for the current user.
   */
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