/**
 * PeerService
 * -----------
 * - Creates a PeerJS peer (WebRTC wrapper).
 * - Obtains local media (camera/mic).
 * - Answers incoming calls with our local stream.
 * - Initiates calls to other peers (by peerId) when notified via SocketService.
 *
 * NOTE:
 *   - When running locally, PeerJS server is at: https://localhost:3001 (path '/')
 *   - On ELF, update host to your ELF hostname, set secure: true, port: 3001.
 */
import { Injectable } from '@angular/core';
// @ts-ignore - PeerJS has TypeScript compatibility issues
import Peer from 'peerjs';

@Injectable({
  providedIn: 'root'
})
export class PeerService {
  private peer: Peer | null = null;
  private _id: string | null = null;
  private localStream: MediaStream | null = null;

  get id(): string | null {
    return this._id;
  }

  async initPeer(): Promise<string> {
    // IMPORTANT: secure must be true when serving over HTTPS
    this.peer = new Peer('', {
      host: 'localhost', // change to 'sXXXXXX.elf.ict.griffith.edu.au' on ELF
      port: 3001,
      path: '/',
      secure: true,
    });

    // Wait until the server assigns us an ID
    this._id = await new Promise<string>((resolve) => {
      this.peer!.on('open', (id: string) => resolve(id));
    });

    // Handle incoming calls (we will answer with our local stream)
    this.peer.on('call', (call: any) => {
      if (!this.localStream) return; // Should be set by getLocalStream() before
      call.answer(this.localStream);
      // The component will attach 'stream' event listener on the returned call
    });

    return this._id;
  }

  async getLocalStream(): Promise<MediaStream> {
    // Ask for camera and microphone
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    return this.localStream;
  }

  call(peerId: string): any {
    if (!this.localStream || !this.peer) return null;
    const call = this.peer.call(peerId, this.localStream);
    return call || null;
  }

  /**
   * Get the peer instance for direct event handling
   */
  getPeer(): Peer | null {
    return this.peer;
  }

  /**
   * Get the local stream
   */
  getLocalStreamSync(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this._id = null;
  }
}
