// SPDX-License-Identifier: GPL-2.0-or-later
import assert from 'node:assert/strict';
import {scoreWord,WordSonifier} from '../dist/agc/sonify.mjs';
const score=scoreWord(0o40001,100);assert.deepEqual(score.map(n=>n.bit),[1,0,0,0,0,0,0,0,0,0,0,0,0,0,1]);assert.equal(score[0].frequency,660);assert.equal(score[1].frequency,220);assert(score[0].weight>score[1].weight);assert.equal(score[14].offset,1.4);assert.deepEqual(score.filter(n=>n.group).map(n=>n.index),[0,3,6,9,12]);assert.throws(()=>scoreWord(0,49));assert.throws(()=>scoreWord(32768));
class Param{constructor(){this.value=0;this.events=[];}setValueAtTime(v,t){this.events.push([v,t]);}linearRampToValueAtTime(v,t){this.events.push([v,t]);}exponentialRampToValueAtTime(v,t){this.events.push([v,t]);}setTargetAtTime(v){this.value=v;}}
class Node{constructor(){this.frequency=new Param();this.gain=new Param();this.stopped=false;}connect(){}disconnect(){}start(time){this.started=time;}stop(time){this.stopped=true;this.stopTime=time;}}
class Context{constructor(){this.currentTime=0;this.destination={};this.oscillators=[];}createGain(){return new Node();}createOscillator(){const n=new Node();this.oscillators.push(n);return n;}async resume(){}}
const callbacks=new Map();let id=0;globalThis.requestAnimationFrame=f=>{callbacks.set(++id,f);return id;};globalThis.cancelAnimationFrame=i=>callbacks.delete(i);
let enabled=true;const context=new Context(),heard=[];const player=new WordSonifier({contextFactory:()=>context,enabled:()=>enabled,onBit:(index,bit)=>heard.push([index,bit])});
assert(await player.play(0o40001,100));assert.equal(context.oscillators.length,20,'15 bit tones plus five group ticks');assert.equal(context.oscillators[0].frequency.value,660);assert.equal(context.oscillators[0].started,.025);assert.equal(context.oscillators[2].frequency.value,220);
const advance=time=>{context.currentTime=time;const [key,fn]=callbacks.entries().next().value;callbacks.delete(key);fn();};advance(.03);advance(.14);assert.deepEqual(heard,[[0,1],[1,0]]);
player.setVolume(.6);assert.equal(player.master.gain.value,.6);player.stop();assert.equal(callbacks.size,0);assert.equal(player.sources.size,0);assert(context.oscillators.every(n=>n.stopped));
enabled=false;const count=context.oscillators.length;assert.equal(await player.play(0o77777),false);assert.equal(context.oscillators.length,count,'Mute does not schedule tones');
// Cancellation while AudioContext.resume is pending cannot start delayed notes.
enabled=true;let resume;const pendingContext=new Context();pendingContext.resume=()=>new Promise(resolve=>resume=resolve);const pending=new WordSonifier({contextFactory:()=>pendingContext});const promise=pending.play(1);pending.stop();resume();assert.equal(await promise,false);assert.equal(pendingContext.oscillators.length,0);
console.log('PASS: actual MSB-first bits, pitch/weight mapping, octal group ticks, tone scheduling/highlighting, volume, mute, source cancellation and pending-resume race. Acoustic quality needs listening QA.');
