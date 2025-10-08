//files main purpose is facilitating the video call using peer js
import { Injectable } from '@angular/core';
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

  //initalisation to the peer js server and creates unique id
  async initPeer(): Promise<string> { //stirng is peerID (for the server to identify the user)
    // IMPORTANT: secure must be true when serving over HTTPS will need to do this manually in broswee
    this.peer = new Peer('', {
      host: 'localhost', // change to 'sXXXXXX.elf.ict.griffith.edu.au' on ELF if oyu cna figure it out
      port: 3001,
      path: '/',
      secure: true,
    });

    // Wait until the server assigns us an ID
    this._id = await new Promise<string>((resolve) => {
      this.peer!.on('open', (id: string) => resolve(id));//lsiten for open event on peerjs, when open is triggered, resolve the promise with the id
    });

    // Handle incoming calls (we will answer with our local stream)
    this.peer.on('call', (call: any) => { //listen for call event on peerjs, when call is triggered, answer the call with the local stream
      if (!this.localStream) return;
      call.answer(this.localStream);
      // The component will attach 'stream' event listener on the returned call
    });

    return this._id;
  }

  //access to camera and microphone and creates stream
  async getLocalStream(): Promise<MediaStream> { //gets the local stream
    // Ask for camera and microphone
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    return this.localStream;
  }

//calls the peer with the local stream | intiates call
  call(peerId: string): any {
    if (!this.localStream || !this.peer) return null;
    const call = this.peer.call(peerId, this.localStream);
    return call || null;
  }

//gets the peer instance
  getPeer(): Peer | null {
    return this.peer;
  }

//gets the local stream
  getLocalStreamSync(): MediaStream | null {
    return this.localStream;
  }

//`disconects from peerjs and stops the local stream
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
