/**
 * VideoChatComponent
 * ------------------
 * - Joins a logical "room" (e.g., your selected channel).
 * - Renders local video immediately.
 * - When someone else joins the same room, start a WebRTC call to them.
 * - Also answers incoming calls (handled by PeerService; we attach stream handler).
 *
 * To test quickly: hard-code roomId (e.g., 'demo-room-1'), open two tabs.
 * In a real app, pass group/channel id from route or parent component.
 */
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { PeerService } from '../../services/peer.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-video-chat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.css'],
})
export class VideoChatComponent implements OnInit, OnDestroy {
  @ViewChild('myVideo', { static: true }) myVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideos', { static: true }) remoteVideos!: ElementRef<HTMLDivElement>;

  roomId: string = '';
  userId: string = '';
  username: string = '';

  // Track active remote streams so Angular can render them
  remoteStreams: MediaStream[] = [];
  // Track open PeerJS calls to manage cleanup
  private calls: any[] = [];
  private subscriptions: Subscription[] = [];
  private peerId: string = '';
  private isConnected: boolean = false;

  // Video/Audio controls
  isVideoEnabled: boolean = true;
  isAudioEnabled: boolean = true;

  constructor(
    private socketService: SocketService,
    private peerService: PeerService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Get channel ID from route
      this.roomId = this.route.snapshot.paramMap.get('channelId') || 'demo-room-1';
      
      // Get current user info
      const currentUser = this.authService.currentUser();
      if (currentUser) {
        this.userId = currentUser.id;
        this.username = currentUser.username;
      } else {
        console.error('No current user found');
        return;
      }

      // 1) Obtain local media and preview it
      const localStream = await this.peerService.getLocalStream();
      this.attachStream(this.myVideo.nativeElement, localStream, { mute: true });

      // 2) Initialize PeerJS (gets us a peerId from the PeerServer)
      this.peerId = await this.peerService.initPeer();

      // 3) Join Socket.IO room (announces our peerId to others in the room)
      this.socketService.joinVideoRoom(this.roomId, this.peerId, this.userId, this.username);
      this.isConnected = true;

      // 4) If someone connects to the room after us, call them
      const userConnectedSub = this.socketService.onUserConnected().subscribe((data) => {
        this.handleUserConnected(data);
      });
      this.subscriptions.push(userConnectedSub);

      // 5) Answer incoming calls (peerService already answers with local stream)
      // Here we only need to subscribe to 'call' streams as they arrive.
      this.peerService.getPeer()?.on('call', (incomingCall: any) => {
        incomingCall.on('stream', (remoteStream: MediaStream) => {
          this.addRemoteStream(remoteStream);
        });
        incomingCall.on('close', () => this.removeRemoteStreamByTrack(remoteStreamTracks(incomingCall)));
        this.calls.push(incomingCall);
      });

      // 6) Handle presence updates (other user leaves)
      const userDisconnectedSub = this.socketService.onUserDisconnected().subscribe((data) => {
        this.handleUserDisconnected(data);
      });
      this.subscriptions.push(userDisconnectedSub);

    } catch (error) {
      console.error('Error initializing video chat:', error);
    }
  }

  ngOnDestroy(): void {
    try {
      if (this.isConnected) {
        this.socketService.leaveVideoRoom(this.roomId, this.peerId, this.username);
      }
    } catch {}
    
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Close all PeerJS calls and clear streams
    this.calls.forEach((c) => c.close());
    this.calls = [];
    this.remoteStreams = [];
    
    // Disconnect peer service
    this.peerService.disconnect();
  }

  private handleUserConnected(data: { peerId: string; userId: string; username: string }) {
    console.log('User connected:', data);
    
    // Initiate outbound call to the new peer
    const call = this.peerService.call(data.peerId);
    if (!call) return;

    // When their remote stream arrives, render it
    call.on('stream', (remoteStream: MediaStream) => this.addRemoteStream(remoteStream));
    call.on('close', () => this.removeRemoteStreamByTrack(remoteStreamTracks(call)));
    this.calls.push(call);
  }

  private handleUserDisconnected(data: { peerId: string; username: string }) {
    console.log('User disconnected:', data);
    
    // Close any calls with this peer
    this.calls = this.calls.filter(call => {
      if (call.peer === data.peerId) {
        call.close();
        return false;
      }
      return true;
    });
    
    // Remove their video stream
    this.removeRemoteStreamByPeerId(data.peerId);
  }

  private attachStream(videoEl: HTMLVideoElement, stream: MediaStream, opts?: { mute?: boolean }) {
    videoEl.srcObject = stream;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    if (opts?.mute) videoEl.muted = true; // Avoid audio feedback loop for local video
  }

  private addRemoteStream(stream: MediaStream) {
    // Prevent duplicates: check by first video track ID
    const id = stream.getVideoTracks()[0]?.id || '';
    const already = this.remoteStreams.some(
      (s) => (s.getVideoTracks()[0]?.id || '') === id
    );
    if (!already) {
      this.remoteStreams = [...this.remoteStreams, stream];
    }
  }

  private removeRemoteStreamByTrack(trackIds: string[]) {
    this.remoteStreams = this.remoteStreams.filter((s) => {
      const vidId = s.getVideoTracks()[0]?.id || '';
      return !trackIds.includes(vidId);
    });
  }

  private removeRemoteStreamByPeerId(peerId: string) {
    // This is a simplified approach - in practice you'd track peerId with streams
    this.remoteStreams = [];
  }

  private pruneClosedCalls() {
    this.calls = this.calls.filter((c) => c.open);
  }

  // Video/Audio control methods
  toggleVideo() {
    const localStream = this.peerService.getLocalStreamSync();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isVideoEnabled = videoTrack.enabled;
      }
    }
  }

  toggleAudio() {
    const localStream = this.peerService.getLocalStreamSync();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isAudioEnabled = audioTrack.enabled;
      }
    }
  }

  endCall() {
    this.ngOnDestroy();
  }
}

/** Helper to read the remote video track IDs from a PeerJS call (best-effort). */
function remoteStreamTracks(call: any): string[] {
  // @ts-ignore: PeerJS types can vary; best-effort track access
  const streams: MediaStream[] = (call as any).remoteStreams || [];
  const ids: string[] = [];
  streams.forEach((s) => {
    s.getVideoTracks().forEach((t) => ids.push(t.id));
  });
  return ids;
}