// SPDX-License-Identifier: GPL-2.0-or-later
import {wordBits} from './rope-trace.mjs';
export function scoreWord(word,bitMs=100){
 if(!Number.isFinite(bitMs)||bitMs<50||bitMs>200)throw new Error('Bit pace must be 50–200 ms.');
 return wordBits(word).map((bit,i)=>({bit,index:i,offset:i*bitMs/1000,duration:bitMs/1000*0.72,frequency:bit?660:220,type:bit?'triangle':'sine',weight:bit?0.12:0.06,group:i%3===0}));
}
export class WordSonifier {
 constructor({contextFactory,enabled=()=>true,onBit=()=>{},onEnd=()=>{}}={}){this.contextFactory=contextFactory||(()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)());this.enabled=enabled;this.onBit=onBit;this.onEnd=onEnd;this.sources=new Set();this.animation=null;this.token=0;this.volume=.35;}
 async play(word,bitMs=100){
  const score=scoreWord(word,bitMs);this.stop();if(!this.enabled())return false;
  const token=this.token;
  this.context??=this.contextFactory();
  if(!this.master){this.master=this.context.createGain();this.master.connect(this.context.destination);}
  this.master.gain.value=this.volume;await this.context.resume();
  if(token!==this.token||!this.enabled())return false;
  const start=this.context.currentTime+0.025;
  for(const note of score){this.note(note.frequency,note.type,note.weight,start+note.offset,note.duration);if(note.group)this.note(1500,'sine',0.025,start+note.offset,0.008);}
  let last=-1;
  const frame=()=>{if(token!==this.token)return;if(!this.enabled()){this.stop();return;}const position=Math.floor((this.context.currentTime-start)/(bitMs/1000));if(position>=0&&position<15&&position!==last){last=position;this.onBit(position,score[position].bit);}if(this.context.currentTime>=start+15*bitMs/1000){this.animation=null;this.onEnd();return;}this.animation=requestAnimationFrame(frame);};
  this.animation=requestAnimationFrame(frame);return true;
 }
 note(frequency,type,weight,time,duration){
  const oscillator=this.context.createOscillator(),gain=this.context.createGain();oscillator.type=type;oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(weight,time+0.003);gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);oscillator.connect(gain);gain.connect(this.master);this.sources.add(oscillator);oscillator.onended=()=>{this.sources.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(time);oscillator.stop(time+duration+0.005);
 }
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,0.02);}
 stop(){this.token++;if(this.animation!==null)cancelAnimationFrame(this.animation);this.animation=null;for(const oscillator of this.sources){oscillator.stop();oscillator.disconnect();}this.sources.clear();this.onEnd();}
}
