// Fix for PeerJS TypeScript compatibility issue
declare module 'peerjs' {
  interface Peer {
    on(event: 'open', callback: (id: string) => void): void;
    on(event: 'call', callback: (call: any) => void): void;
    on(event: 'error', callback: (error: any) => void): void;
    call(peerId: string, stream: MediaStream): any;
    destroy(): void;
  }
}
