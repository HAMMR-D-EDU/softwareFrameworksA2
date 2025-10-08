import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

//dec
export interface ChatMessage {
  messageId?: string;
  channelId: string;
  userId: string;
  username: string;
  text: string;
  imagePath?: string | null;
  replyTo?: string | null;
  reactions?: { [emoji: string]: string[] };
  createdAt?: string;
  timestamp?: string;
  isSystemMessage?: boolean;
}

//for join/leave notifs
export interface UserEvent {
  userId?: string;
  username: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private serverUrl = 'https://localhost:3000';

//initialises the socket io connection follwoed form lecture toturial
  constructor() {
    // Initialize Socket.IO connection
    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection event listeners
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

//joining user room
  joinUserRoom(userId: string): void {
    if (!userId) return;
    this.socket.emit('join-user', { userId });
  }

//on membership approved
  onMembershipApproved(): Observable<{ groupId: string }> {
    return new Observable(observer => {
      this.socket.on('group:membership-approved', (payload) => observer.next(payload));
      return () => this.socket.off('group:membership-approved');
    });
  }

  joinChannel(channelId: string, userId: string, username: string): void {
    this.socket.emit('join', { channelId, userId, username });
    console.log(`Joining channel: ${channelId}`);
  }

  leaveChannel(channelId: string, username: string): void {
    this.socket.emit('leave', { channelId, username });
    console.log(`Leaving channel: ${channelId}`);
  }

  sendMessage(channelId: string, userId: string, username: string, text: string): void {
    this.socket.emit('message', {
      channelId,
      userId,
      username,
      text,
      imagePath: null
    });
  }

  sendImageMessage(channelId: string, userId: string, username: string, imagePath: string): void {
    this.socket.emit('message', {
      channelId,
      userId,
      username,
      text: '',
      imagePath
    });
  }

//sends typing indicator
  sendTyping(channelId: string, username: string): void {
    this.socket.emit('typing', { channelId, username });
  }

//observes incoming messages
  onMessage(): Observable<ChatMessage> {
    return new Observable(observer => {
      this.socket.on('message', (message: ChatMessage) => {
        observer.next(message);
      });

      return () => {
        this.socket.off('message');
      };
    });
  }

//
  toggleReaction(channelId: string, messageId: string, userId: string, emoji: string): void {
    this.socket.emit('message:reaction', { channelId, messageId, userId, emoji });
  }

//observes reaction updates
  onReactions(): Observable<{ messageId: string; reactions: { [emoji: string]: string[] } }> {
    return new Observable(observer => {
      this.socket.on('message:reactions', (payload) => observer.next(payload));
      return () => this.socket.off('message:reactions');
    });
  }

//observes chat history
  onHistory(): Observable<ChatMessage[]> {
    return new Observable(observer => {
      this.socket.on('history', (messages: ChatMessage[]) => {
        observer.next(messages);
      });

      return () => {
        this.socket.off('history');
      };
    });
  }

//observes when other users join the current channel
  onUserJoined(): Observable<UserEvent> {
    return new Observable(observer => {
      this.socket.on('user-joined', (event: UserEvent) => {
        observer.next(event);
      });

      return () => {
        this.socket.off('user-joined');
      };
    });
  }

//observes when other users leave the current channel
  onUserLeft(): Observable<UserEvent> {
    return new Observable(observer => {
      this.socket.on('user-left', (event: UserEvent) => {
        observer.next(event);
      });

      return () => {
        this.socket.off('user-left');
      };
    });
  }

//observes typing indicators from other users
  onUserTyping(): Observable<{ username: string }> {
    return new Observable(observer => {
      this.socket.on('user-typing', (data) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('user-typing');
      };
    });
  }

//observes error events from the server socket
  onError(): Observable<{ message: string }> {
    return new Observable(observer => {
      this.socket.on('error', (error) => {
        observer.next(error);
      });

      return () => {
        this.socket.off('error');
      };
    });
  }

//joins group room
  joinGroup(groupId: string, userId: string, username: string): void {
    this.socket.emit('join-group', { groupId, userId, username });
    console.log(`Joined group room: ${groupId}`);
  }

//leaves group room
  leaveGroup(groupId: string, username: string): void {
    this.socket.emit('leave-group', { groupId, username });
    console.log(`Left group room: ${groupId}`);
  }

//observes group notifications
  onGroupNotification(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('group-notification', (notification) => {
        observer.next(notification);
      });

      return () => {
        this.socket.off('group-notification');
      };
    });
  }

//observes avatar updates
  onAvatarUpdated(): Observable<{ userId: string; avatarPath: string }> {
    return new Observable(observer => {
      this.socket.on('user:avatar-updated', (payload) => observer.next(payload));
      return () => this.socket.off('user:avatar-updated');
    });
  }

//joins video room  
  joinVideoRoom(roomId: string, peerId: string, userId: string, username: string): void {
    this.socket.emit('join-video-room', { roomId, peerId, userId, username });
    console.log(`Joined video room: ${roomId}`);
  }

//
  leaveVideoRoom(roomId: string, peerId: string, username: string): void {
    this.socket.emit('leave-video-room', { roomId, peerId, username });
    console.log(`Left video room: ${roomId}`);
  }

//
  onUserConnected(): Observable<{ peerId: string; userId: string; username: string }> {
    return new Observable(observer => {
      this.socket.on('user-connected', (data) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('user-connected');
      };
    });
  }

//
  onUserDisconnected(): Observable<{ peerId: string; username: string }> {
    return new Observable(observer => {
      this.socket.on('user-disconnected', (data) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('user-disconnected');
      };
    });
  }

//
  onVideoStatus(): Observable<{ roomId: string; inProgress: boolean }> {
    return new Observable(observer => {
      this.socket.on('video-status', (data: { roomId: string; inProgress: boolean }) => {
        observer.next(data);
      });
      return () => this.socket.off('video-status');
    });
  }

//
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
