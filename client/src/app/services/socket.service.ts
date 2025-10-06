import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

export interface ChatMessage {
  messageId?: string;
  channelId: string;
  userId: string;
  username: string;
  text: string;
  imagePath: string | null;
  createdAt: string;
}

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
      console.log('✓ Connected to Socket.IO server:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Disconnected from Socket.IO server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  /**
   * Join a channel room
   */
  joinChannel(channelId: string, userId: string, username: string): void {
    this.socket.emit('join', { channelId, userId, username });
    console.log(`Joining channel: ${channelId}`);
  }

  /**
   * Leave a channel room
   */
  leaveChannel(channelId: string, username: string): void {
    this.socket.emit('leave', { channelId, username });
    console.log(`Leaving channel: ${channelId}`);
  }

  /**
   * Send a text message
   */
  sendMessage(channelId: string, userId: string, username: string, text: string): void {
    this.socket.emit('message', {
      channelId,
      userId,
      username,
      text,
      imagePath: null
    });
  }

  /**
   * Send an image message
   */
  sendImageMessage(channelId: string, userId: string, username: string, imagePath: string): void {
    this.socket.emit('message', {
      channelId,
      userId,
      username,
      text: '',
      imagePath
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(channelId: string, username: string): void {
    this.socket.emit('typing', { channelId, username });
  }

  /**
   * Observable for incoming messages
   */
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

  /**
   * Observable for chat history
   */
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

  /**
   * Observable for user joined events
   */
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

  /**
   * Observable for user left events
   */
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

  /**
   * Observable for typing indicator
   */
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

  /**
   * Observable for errors
   */
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

  /**
   * Join a group room for notifications
   */
  joinGroup(groupId: string, userId: string, username: string): void {
    this.socket.emit('join-group', { groupId, userId, username });
    console.log(`Joined group room: ${groupId}`);
  }

  /**
   * Leave a group room
   */
  leaveGroup(groupId: string, username: string): void {
    this.socket.emit('leave-group', { groupId, username });
    console.log(`Left group room: ${groupId}`);
  }

  /**
   * Observable for group notifications
   */
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

  /**
   * Join a video room
   */
  joinVideoRoom(roomId: string, peerId: string, userId: string, username: string): void {
    this.socket.emit('join-video-room', { roomId, peerId, userId, username });
    console.log(`Joined video room: ${roomId}`);
  }

  /**
   * Leave a video room
   */
  leaveVideoRoom(roomId: string, peerId: string, username: string): void {
    this.socket.emit('leave-video-room', { roomId, peerId, username });
    console.log(`Left video room: ${roomId}`);
  }

  /**
   * Observable for when a user connects to video room
   */
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

  /**
   * Observable for when a user disconnects from video room
   */
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

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
