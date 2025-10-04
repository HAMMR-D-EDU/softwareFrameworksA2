import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, Group, Channel } from '../../services/api.service';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css']
})
export class GroupDetailComponent implements OnInit {
  groupId = '';
  group: Group | null = null;
  channels: Channel[] = [];
  groupMembers: any[] = [];
  currentUser: User | null = null;
  interests: any[] = [];
  
  showCreateChannelModal = false;
  showMembersModal = false;
  newChannelName = '';
  channelError = '';
  channelSuccess = '';
  
  showBanForm = false;
  selectedChannel: Channel | null = null;
  selectedUserId = '';
  banError = '';
  banSuccess = '';
  requestError = '';
  requestSuccess = '';


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private api: ApiService
  ) {
    this.currentUser = this.auth.currentUser();
  }

  ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('gid') ?? '';
    if (this.groupId) {
      this.loadGroupData();
    }
  }

  loadGroupData() {
    // Load group information
    this.api.getUserGroups(this.currentUser?.id || '').subscribe({
      next: (groups) => {
        this.group = groups.find(g => g.id === this.groupId) || null;
        if (this.group) {
          this.loadChannels();
          this.loadGroupMembers();
          this.loadInterests();
        }
      },
      error: (error) => {
        console.error('Error loading group:', error);
      }
    });
  }

  loadChannels() {
    if (this.group) {
      const uid = this.currentUser?.id || '';
      this.api.getGroupChannelsForUser(this.group.id, uid).subscribe({
        next: (channels) => {
          this.channels = channels;
        },
        error: (error) => {
          console.error('Error loading channels:', error);
        }
      });
    }
  }

  loadGroupMembers() {
    if (!this.group) return;
    this.api.getGroupMembers(this.group.id).subscribe({
      next: (members) => {
        this.groupMembers = members;
      },
      error: (error) => {
        console.error('Error loading members:', error);
      }
    });
  }

  loadInterests() {
    if (!this.group) return;
    this.api.getGroupInterests(this.group.id).subscribe({
      next: (interests) => {
        this.interests = interests;
      },
      error: (error) => {
        console.error('Error loading interests:', error);
      }
    });
  }

  createChannel() {
    if (!this.newChannelName.trim()) {
      this.channelError = 'Channel name is required';
      return;
    }

    if (!this.currentUser || !this.group) {
      this.channelError = 'User or group not found';
      return;
    }

    this.channelError = '';
    this.api.createChannel(this.group.id, this.newChannelName.trim(), this.currentUser.id).subscribe({
      next: (channel) => {
        this.channelSuccess = 'Channel created successfully!';
        this.newChannelName = '';
        this.showCreateChannelModal = false;
        this.loadChannels(); // Reload channels
        setTimeout(() => {
          this.channelSuccess = '';
        }, 3000);
      },
      error: (error) => {
        this.channelError = error.error?.msg || 'Failed to create channel';
      }
    });
  }

  selectChannel(channel: Channel) {
    if (!this.isBannedFromChannel(channel)) {
      this.selectedChannel = channel;
    }
  }

  openBanForm(channel: Channel) {
    this.selectedChannel = channel;
    this.showBanForm = true;
  }

  banUser() {
    if (!this.selectedUserId || !this.selectedChannel || !this.currentUser) {
      this.banError = 'Please select a user to ban';
      return;
    }

    this.banError = '';
    this.api.banUserFromChannel(this.selectedChannel.id, this.selectedUserId, this.currentUser.id).subscribe({
      next: (result) => {
        this.banSuccess = 'User banned successfully!';
        this.selectedUserId = '';
        this.showBanForm = false;
        this.loadChannels(); // Reload channels
        setTimeout(() => this.banSuccess = '', 3000);
      },
      error: (error) => {
        this.banError = error.error?.msg || 'Failed to ban user';
      }
    });
  }

  cancelBan() {
    this.showBanForm = false;
    this.selectedChannel = null;
    this.selectedUserId = '';
    this.banError = '';
  }

  goBack() {
    this.router.navigate(['/']);
  }

  getUserRole(): string {
    if (!this.group || !this.currentUser) return 'Unknown';
    if (this.group.adminIds.includes(this.currentUser.id)) return 'Group Admin';
    return 'Member';
  }

  canCreateChannels(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.group.adminIds.includes(this.currentUser.id);
  }

  canBanUsers(channel: Channel): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.group.adminIds.includes(this.currentUser.id);
  }

  isGroupAdmin(userId: string): boolean {
    return this.group?.adminIds.includes(userId) || false;
  }

  isBannedFromChannel(channel: Channel): boolean {
    if (!this.currentUser) return false;
    return channel.bannedUserIds.includes(this.currentUser.id);
  }

  canDeleteGroup(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.creatorId === this.currentUser.id;
  }

  canDeleteChannels(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  canRemoveUsers(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  canManageRequests(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  approveInterest(interestId: string) {
    if (!this.group || !this.currentUser) return;
    this.requestError = '';
    this.api.approveGroupInterest(this.group.id, interestId, this.currentUser.id).subscribe({
      next: () => {
        this.requestSuccess = 'Request approved and user added!';
        this.loadGroupData();
        setTimeout(() => this.requestSuccess = '', 3000);
      },
      error: (error) => {
        this.requestError = error.error?.msg || 'Failed to approve request';
      }
    });
  }

  rejectInterest(interestId: string) {
    if (!this.group || !this.currentUser) return;
    this.requestError = '';
    this.api.rejectGroupInterest(this.group.id, interestId, this.currentUser.id).subscribe({
      next: () => {
        this.requestSuccess = 'Request rejected';
        this.loadInterests();
        setTimeout(() => this.requestSuccess = '', 3000);
      },
      error: (error) => {
        this.requestError = error.error?.msg || 'Failed to reject request';
      }
    });
  }

  isSuperUser(member: any): boolean {
    return Array.isArray(member?.roles) && (member.roles.includes('super') || member.roles.includes('super_admin'));
  }

  isSuperAdmin(): boolean {
    return this.currentUser ? (this.currentUser.roles.includes('super') || this.currentUser.roles.includes('super_admin' as any)) : false;
  }

  canReportUser(member: any): boolean {
    if (!this.currentUser || !this.group) return false;
    // Only group admins can report users
    const isGroupAdmin = this.group.adminIds.includes(this.currentUser.id);
    // Can only report regular users (not group admins or super admins)
    const isRegularUser = !this.isGroupAdmin(member.id) && !this.isSuperUser(member);
    return isGroupAdmin && isRegularUser;
  }

  reportUser(userId: string) {
    if (!this.currentUser) return;
    
    const member = this.groupMembers.find(m => m.id === userId);
    if (!member) return;
    
    console.log('Reporting user:', member.username, 'by:', this.currentUser.username);
    
    this.api.createReport(
      this.currentUser.id,
      `Report: ${member.username}`,
      `User ${member.username} reported by group admin`,
      'user_report'
    ).subscribe({
      next: () => {
        console.log('Report created successfully');
        alert(`User ${member.username} reported to super admins`);
      },
      error: (error) => {
        console.error('Report creation failed:', error);
        alert(error.error?.msg || 'Failed to report user');
      }
    });
  }



  deleteGroup() {
    if (!this.group || !this.currentUser) return;
    
    if (confirm(`Are you sure you want to delete the group "${this.group.name}"? This will also delete all channels and cannot be undone.`)) {
      this.api.removeGroup(this.group.id, this.currentUser.id).subscribe({
        next: (result) => {
          alert('Group deleted successfully!');
          this.router.navigate(['/']);
        },
        error: (error) => {
          alert(error.error?.msg || 'Failed to delete group');
        }
      });
    }
  }

  deleteChannel(channelId: string) {
    if (!this.currentUser || !this.group) {
      this.channelError = 'User or group not found';
      return;
    }
    
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) {
      this.channelError = 'Channel not found';
      return;
    }
    
    if (confirm(`Are you sure you want to delete the channel "${channel.name}"? This action cannot be undone.`)) {
      this.api.removeChannel(channelId, this.currentUser.id, this.group.id).subscribe({
        next: (result) => {
          this.channelSuccess = 'Channel deleted successfully!';
          // Clear selected channel if it was the one deleted
          if (this.selectedChannel?.id === channelId) {
            this.selectedChannel = null;
          }
          this.loadChannels(); // Reload channels
          setTimeout(() => {
            this.channelSuccess = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Delete channel error:', error);
          this.channelError = error.error?.msg || 'Failed to delete channel';
          setTimeout(() => {
            this.channelError = '';
          }, 5000);
        }
      });
    }
  }

  removeUserFromGroup(userId: string) {
    if (!this.group || !this.currentUser) return;
    
    const member = this.groupMembers.find(m => m.id === userId);
    if (!member) return;
    
    if (confirm(`Are you sure you want to remove "${member.username}" from this group?`)) {
      this.api.removeUserFromGroup(this.group.id, userId, this.currentUser.id).subscribe({
        next: (result) => {
          this.channelSuccess = 'User removed from group successfully!';
          this.loadGroupData(); // Reload group data
          setTimeout(() => this.channelSuccess = '', 3000);
        },
        error: (error) => {
          this.channelError = error.error?.msg || 'Failed to remove user from group';
        }
      });
    }
  }

  promoteToGroupAdmin(userId: string) {
    if (!this.group || !this.currentUser) return;

    const member = this.groupMembers.find(m => m.id === userId);
    if (!member) return;

    if (confirm(`Are you sure you want to promote "${member.username}" to Group Admin of "${this.group.name}"?`)) {
      this.api.promoteUserToGroupAdmin(this.group.id, userId, this.currentUser.id).subscribe({
        next: (result) => {
          this.channelSuccess = 'User promoted to Group Admin successfully!';
          this.loadGroupData(); // Reload group data
          setTimeout(() => this.channelSuccess = '', 3000);
        },
        error: (error) => {
          this.channelError = error.error?.msg || 'Failed to promote user to Group Admin';
        }
      });
    }
  }

  canPromoteToGroupAdmin(userId: string): boolean {
    if (!this.group || !this.currentUser) return false;
    // Only super admins or group admins can promote, and only if the user is not already a group admin
    return (this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id)) && 
           !this.isGroupAdmin(userId);
  }
}