import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, Group, Channel } from '../../services/api.service';
import { SocketService, ChatMessage } from '../../services/socket.service';
import { ImageUploadService } from '../../services/image-upload.service';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.css']
})
export class GroupDetailComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef; //reference to the messagesContainer element used for scrolling sourced from group-detail.component.html
  @ViewChild('fileInput') fileInput!: ElementRef; //triggers file selection and references it

  groupId = '';
  group: Group | null = null;
  channels: Channel[] = [];
  groupMembers: any[] = [];
  private userIdToAvatar: Record<string, string> = {};
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

  // Chat-related properties
  messages: ChatMessage[] = [];
  messageText: string = '';
  typingUser: string = '';
  typingTimeout: any;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isUploading: boolean = false;
  private subscriptions: Subscription[] = [];
  notificationMessage: string = '';
  showNotification: boolean = false;
  videoInProgress: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private api: ApiService,
    private socketService: SocketService,
    private imageUploadService: ImageUploadService
  ) {
    this.currentUser = this.auth.currentUser();
  }


  ngOnInit() {
    // React to user avatar changes instantly
    const userChangeSub = this.auth.onUserChange().subscribe(u => { //listener allows for live updates to profiel pictur eupdates
      if (u) {
        // Update avatar map entry with cache-busting
        const path = u.avatarPath ? (u.avatarPath.startsWith('http') ? u.avatarPath : `https://localhost:3000${u.avatarPath}`) : 'assets/images/a2-logo.png';
        this.userIdToAvatar[u.id] = path;
      }
    });
    this.subscriptions.push(userChangeSub);
    this.groupId = this.route.snapshot.paramMap.get('gid') ?? '';
    if (this.groupId) {
      this.loadGroupData();
      this.initializeSocketListeners();
      
      // Join group room for real-time notifications
      if (this.currentUser) {
        this.socketService.joinGroup(this.groupId, this.currentUser.id, this.currentUser.username);
      }
    }
  }

  /**
   * Initialize Socket.IO listeners
   */
  initializeSocketListeners(): void {
    // Subscribe to chat history
    const historySubscription = this.socketService.onHistory().subscribe(
      (history: ChatMessage[]) => {
        history.forEach(msg => {
          if (msg.imagePath) {
            // Image path available
          }
        });
        this.messages = history;
        setTimeout(() => this.scrollToBottom(), 100);
      }
    );
    this.subscriptions.push(historySubscription);

    // Subscribe to new messages
    const messageSubscription = this.socketService.onMessage().subscribe(
      (message: ChatMessage) => {
        if (message.imagePath) {
          // Image message received
        }
        this.messages.push(message);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    );
    this.subscriptions.push(messageSubscription);
    // Subscribe to reaction updates
    const reactSub = this.socketService.onReactions().subscribe(({ messageId, reactions }) => {
      const idx = this.messages.findIndex(m => m.messageId === messageId);
      if (idx >= 0) {
        this.messages[idx] = { ...this.messages[idx], reactions } as any;
      }
    });
    this.subscriptions.push(reactSub);

    // Subscribe to user joined events
    const joinedSubscription = this.socketService.onUserJoined().subscribe(
      (event) => {
        // Add join notification as a system message
        const systemMessage: ChatMessage = {
          messageId: `system-join-${Date.now()}-${Math.random()}`,
          channelId: this.selectedChannel?.id || '',
          userId: 'system',
          username: 'System',
          text: `👋 ${event.username} joined the channel`,
          timestamp: new Date().toISOString(),
          reactions: {},
          isSystemMessage: true
        };
        this.messages.push(systemMessage);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    );
    this.subscriptions.push(joinedSubscription);

    // Subscribe to user left events
    const leftSubscription = this.socketService.onUserLeft().subscribe(
      (event) => {
        // Add leave notification as a system message
        const systemMessage: ChatMessage = {
          messageId: `system-left-${Date.now()}-${Math.random()}`,
          channelId: this.selectedChannel?.id || '',
          userId: 'system',
          username: 'System',
          text: `👋 ${event.username} left the channel`,
          timestamp: new Date().toISOString(),
          reactions: {},
          isSystemMessage: true
        };
        this.messages.push(systemMessage);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    );
    this.subscriptions.push(leftSubscription);

    // Subscribe to typing indicator
    const typingSubscription = this.socketService.onUserTyping().subscribe(
      (data) => {
        if (data.username !== this.currentUser?.username) {
          this.typingUser = data.username;
          clearTimeout(this.typingTimeout);
          this.typingTimeout = setTimeout(() => {
            this.typingUser = '';
          }, 2000);
        }
      }
    );
    this.subscriptions.push(typingSubscription);

    // Subscribe to errors
    const errorSubscription = this.socketService.onError().subscribe(
      (error) => {
        console.error('Socket error:', error);
        alert(error.message);
      }
    );
    this.subscriptions.push(errorSubscription);
    
    // Subscribe to video status for this channel
    const videoStatusSub = this.socketService.onVideoStatus().subscribe((data) => {
      if (this.selectedChannel && data.roomId === this.selectedChannel.id) {
        this.videoInProgress = data.inProgress;
      }
    });
    this.subscriptions.push(videoStatusSub);
    
    // Subscribe to group notifications
    const groupNotificationSubscription = this.socketService.onGroupNotification().subscribe(
      (notification: any) => {
        if (notification.type === 'new_interest') {
          this.notificationMessage = `📢 ${notification.username} wants to join this group!`;
          this.showNotification = true;
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
            this.showNotification = false;
          }, 5000);
          
          // Reload interests to show the new request
          this.loadInterests();
        }
      }
    );
    this.subscriptions.push(groupNotificationSubscription);

    // Listen for avatar updates and refresh member avatars map
    const avatarSub = this.socketService.onAvatarUpdated?.().subscribe((payload: { userId: string; avatarPath: string }) => {
      if (payload && payload.userId && payload.avatarPath) {
        this.userIdToAvatar[payload.userId] = payload.avatarPath.startsWith('http') ? payload.avatarPath : `https://localhost:3000${payload.avatarPath}`;
      }
    });
    if (avatarSub) this.subscriptions.push(avatarSub);
  }

  /**
   * Load group, channels, members, and interests for current user.
   */
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

  /**
   * Fetch channels visible to the current user in the active group.
   */
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

  /**
   * Fetch group members and rebuild the avatar map for quick lookups.
   */
  loadGroupMembers() {
    if (!this.group) return;
    this.api.getGroupMembers(this.group.id).subscribe({
      next: (members) => {
        this.groupMembers = members;
        // Build avatar map
        this.userIdToAvatar = {};
        members.forEach(m => {
          const avatar = m.avatarPath ? `https://localhost:3000${m.avatarPath}` : 'assets/images/a2-logo.png';
          this.userIdToAvatar[m.id] = avatar;
        });
      },
      error: (error) => {
        console.error('Error loading members:', error);
      }
    });
  }

  /**
   * Fetch current group join-interest requests for admins to manage.
   */
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

  /**
   * Create a new channel in the current group.
   */
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

  /**
   * Select a channel and join its Socket.IO room
   */
  selectChannel(channel: Channel) {
    if (!this.isBannedFromChannel(channel) && this.currentUser) {
      // Leave previous channel if there was one
      if (this.selectedChannel) {
        this.socketService.leaveChannel(this.selectedChannel.id, this.currentUser.username);
      }

      // Select new channel
      this.selectedChannel = channel;
      this.messages = []; // Clear messages

      // Join Socket.IO room
      this.socketService.joinChannel(
        channel.id,
        this.currentUser.id,
        this.currentUser.username
      );
    }
  }

  /**
   * Send text message via Socket.IO
   */
  sendMessage(): void {
    if (this.messageText.trim() && this.selectedChannel && this.currentUser) {
      this.socketService.sendMessage(
        this.selectedChannel.id,
        this.currentUser.id,
        this.currentUser.username,
        this.messageText.trim()
      );
      this.messageText = '';
    }
  }

  /**
   * Toggle a reaction on a specific message (cannot react to own messages).
   * @param msg Chat message to react to
   * @param emoji Emoji string (e.g., "👍")
   */
  toggleReaction(msg: ChatMessage, emoji: string) {
    if (!this.selectedChannel || !this.currentUser || !msg.messageId) return;
    if (this.isOwnMessage(msg)) return;
    this.socketService.toggleReaction(this.selectedChannel.id, msg.messageId, this.currentUser.id, emoji);
  }


  /**
   * Handle typing event
   */
  onTyping(): void {
    if (this.selectedChannel && this.currentUser) {
      this.socketService.sendTyping(this.selectedChannel.id, this.currentUser.username);
    }
  }

  /**
   * Handle file selection for image upload
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  /**
   * Upload and send image
   */
  uploadImage(): void {
    if (!this.selectedFile || !this.selectedChannel || !this.currentUser) return;

    this.isUploading = true;

    this.imageUploadService.uploadImage(this.selectedFile).subscribe({
      next: (response) => {
        // Send image message via Socket.IO
        this.socketService.sendImageMessage(
          this.selectedChannel!.id,
          this.currentUser!.id,
          this.currentUser!.username,
          response.data.path
        );

        // Reset
        this.selectedFile = null;
        this.imagePreview = null;
        this.isUploading = false;
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        alert('Failed to upload image');
        this.isUploading = false;
      }
    });
  }

  /**
   * Cancel image selection
   */
  cancelImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Trigger file input click
   */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  /**
   * Upload and set the current user's avatar, then refresh UI mappings.
   */
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.currentUser) return;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.imageUploadService.uploadAvatar(this.currentUser.id, file).subscribe({
        next: (res) => {
          const path = res.avatarPath.startsWith('http') ? res.avatarPath : `https://localhost:3000${res.avatarPath}`;
          // Update local map and current user session
          this.userIdToAvatar[this.currentUser!.id] = path;
          const updated = { ...this.currentUser!, avatarPath: res.avatarPath } as User;
          this.auth.storeUser(updated);
          this.currentUser = updated;
          // Refresh members list so UI reflects changes
          this.loadGroupMembers();
          alert('Avatar updated');
        },
        error: (err) => {
          console.error('Avatar upload failed', err);
          alert('Failed to update avatar');
        }
      });
    }
  }

  /**
   * Scroll chat to bottom
   */
  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message: ChatMessage): boolean {
    return message.userId === this.currentUser?.id;
  }

  /**
   * Format timestamp
   */
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Open the ban user form for a specific channel.
   */
  openBanForm(channel: Channel) {
    this.selectedChannel = channel;
    this.showBanForm = true;
  }

  /**
   * Ban the selected user from the selected channel.
   */
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

  /**
   * Close the ban form and reset state.
   */
  cancelBan() {
    this.showBanForm = false;
    this.selectedChannel = null;
    this.selectedUserId = '';
    this.banError = '';
  }

  /**
   * Navigate back to the dashboard/home.
   */
  goBack() {
    this.router.navigate(['/']);
  }

  /**
   * Compute the current user's role label within the group context.
   */
  getUserRole(): string {
    if (!this.group || !this.currentUser) return 'Unknown';
    if (this.group.adminIds.includes(this.currentUser.id)) return 'Group Admin';
    return 'Member';
  }


  /**
   * Whether the user can create channels in this group.
   */
  canCreateChannels(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  /**
   * Whether the user can ban users in a given channel.
   */
  canBanUsers(channel: Channel): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  /**
   * Whether the given user is a group admin.
   */
  isGroupAdmin(userId: string): boolean {
    return this.group?.adminIds.includes(userId) || false;
  }

  /**
   * Whether the current user is banned from a given channel.
   */
  isBannedFromChannel(channel: Channel): boolean {
    if (!this.currentUser) return false;
    return channel.bannedUserIds.includes(this.currentUser.id);
  }

  /**
   * Whether the current user can delete the group.
   */
  canDeleteGroup(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.creatorId === this.currentUser.id;
  }

  /**
   * Whether the current user can delete channels.
   */
  canDeleteChannels(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  /**
   * Whether the current user can remove other users from the group.
   */
  canRemoveUsers(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  /**
   * Whether the current user can manage join requests for the group.
   */
  canManageRequests(): boolean {
    if (!this.group || !this.currentUser) return false;
    return this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id);
  }

  /**
   * Approve a pending interest request and add the user to the group.
   */
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

  /**
   * Reject a pending interest request.
   */
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

  /**
   * Whether a member has super-admin privileges.
   */
  isSuperUser(member: any): boolean {
    return Array.isArray(member?.roles) && (member.roles.includes('super') || member.roles.includes('super_admin'));
  }

  /**
   * Resolve the avatar URL for a given user ID.
   */
  getAvatarForUser(userId: string): string {
    return this.userIdToAvatar[userId] || 'assets/images/a2-logo.png';
  }

  /**
   * Whether the current user is a super admin.
   */
  isSuperAdmin(): boolean {
    return this.currentUser ? (this.currentUser.roles.includes('super') || this.currentUser.roles.includes('super_admin' as any)) : false;
  }

  /**
   * Whether the current user can report the specified member.
   */
  canReportUser(member: any): boolean {
    if (!this.currentUser || !this.group) return false;
    // Only group admins can report users
    const isGroupAdmin = this.group.adminIds.includes(this.currentUser.id);
    // Can only report regular users (not group admins or super admins)
    const isRegularUser = !this.isGroupAdmin(member.id) && !this.isSuperUser(member);
    return isGroupAdmin && isRegularUser;
  }

  /**
   * Create a report targeting a specific user (by a group admin).
   */
  reportUser(userId: string) {
    if (!this.currentUser) return;
    
    const member = this.groupMembers.find(m => m.id === userId);
    if (!member) return;
    
    this.api.createReport(
      this.currentUser.id,
      `Report: ${member.username}`,
      `User ${member.username} reported by group admin`,
      'user_report'
    ).subscribe({
      next: () => {
        alert(`User ${member.username} reported to super admins`);
      },
      error: (error) => {
        console.error('Report creation failed:', error);
        alert(error.error?.msg || 'Failed to report user');
      }
    });
  }

  /**
   * Delete the current group after confirmation.
   */
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

  /**
   * Delete a specific channel after confirmation and refresh state.
   */
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
            if (this.currentUser) {
              this.socketService.leaveChannel(channelId, this.currentUser.username);
            }
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

  /**
   * Remove a user from the group after confirmation.
   */
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

  /**
   * Promote a member to group admin after confirmation.
   */
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

  /**
   * Whether the specified user can be promoted to group admin by current user.
   */
  canPromoteToGroupAdmin(userId: string): boolean {
    if (!this.group || !this.currentUser) return false;
    // Only super admins or group admins can promote, and only if the user is not already a group admin
    return (this.currentUser.roles.includes('super') || this.group.adminIds.includes(this.currentUser.id)) && 
           !this.isGroupAdmin(userId);
  }

  /**
   * Open the video chat for the selected channel in a new window.
   */
  startVideoChat() {
    if (this.selectedChannel && this.currentUser) {
      // Navigate to video chat or open in modal
      const videoChatUrl = `/video-chat/${this.selectedChannel.id}`;
      window.open(videoChatUrl, '_blank', 'width=1200,height=800');
    }
  }

  /**
   * Lifecycle: clean up subscriptions and leave joined rooms.
   */
  ngOnDestroy(): void {
    // Leave current channel if any
    if (this.selectedChannel && this.currentUser) {
      this.socketService.leaveChannel(this.selectedChannel.id, this.currentUser.username);
    }
    
    // Leave group room
    if (this.groupId && this.currentUser) {
      this.socketService.leaveGroup(this.groupId, this.currentUser.username);
    }
    
    // Unsubscribe from all observables
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
