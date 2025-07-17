import { Component, OnInit, OnDestroy } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import Peer from 'simple-peer';

@Component({
  selector: 'app-voice-chat',
  templateUrl: './voice-chat.component.html',
  styleUrls: ['./voice-chat.component.css']
})
export class VoiceChatComponent implements OnInit, OnDestroy {
  peers = {};
  stream: MediaStream;

  constructor(private socket: Socket) { }

  ngOnInit(): void {
    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      .then(stream => {
        this.stream = stream;
        this.socket.fromEvent('match-found').subscribe((data: any) => {
          const peer = new Peer({ initiator: true, trickle: false, stream });
          peer.on('signal', signal => {
            this.socket.emit('voice-signal', { to: data.opponent.socketId, signal });
          });
          this.peers[data.opponent.socketId] = peer;
        });

        this.socket.fromEvent('voice-signal').subscribe((data: any) => {
          const peer = this.peers[data.from];
          if (peer) {
            peer.signal(data.signal);
          } else {
            const newPeer = new Peer({ initiator: false, trickle: false, stream });
            newPeer.on('signal', signal => {
              this.socket.emit('voice-signal', { to: data.from, signal });
            });
            newPeer.signal(data.signal);
            this.peers[data.from] = newPeer;
          }
        });
      });
  }

  ngOnDestroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
