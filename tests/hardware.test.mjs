// SPDX-License-Identifier: GPL-2.0-or-later
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AgcCore} from '../dist/agc/core.mjs';
import {HardwareBridge,Vehicle,PIPA_SCALE,signedWord,startFlatoutDiagnostic} from '../dist/agc/hardware.mjs';
const read=name=>fs.readFileSync(new URL('../dist/agc/'+name,import.meta.url));
async function fresh(){const core=await AgcCore.create(read('yaAGC.wasm'));core.loadRom(read('Luminary099.bin'));return {core,bridge:new HardwareBridge(core)};}
assert.equal(signedWord(0o77777),-0);assert.equal(signedWord(0o77776),-1);assert.equal(signedWord(0o37777),16383);
const {core,bridge}=await fresh();core.step(100000);
for(const k of ['VERB','1','6','NOUN','2','1','ENTR']){core.key(k);core.step(60000);}core.step(100000);
const falling=new Vehicle();
for(let i=0;i<50;i++)bridge.advance(0.02,falling.step(0.02,0,0));
assert(falling.vy<-21.6);assert.deepEqual(bridge.pulses,[0,0,0]);assert.equal(core.erasable()[0o37],0,'Gravity must not feed the accelerometer');
// Sub-pulse inputs accumulate; opposite direction must not have floor bias.
for(let i=0;i<10;i++)bridge.advance(0.02,[PIPA_SCALE*0.11,0,-PIPA_SCALE*0.11]);
assert.deepEqual(bridge.pulses,[1,0,-1]);assert.equal(signedWord(core.erasable()[0o37]),1);assert.equal(signedWord(core.erasable()[0o41]),-1);
for(let i=0;i<10;i++)bridge.advance(0.02,[-PIPA_SCALE*0.11,0,PIPA_SCALE*0.11]);
assert.deepEqual(bridge.pulses,[0,0,0],'Opposite fractional impulses cancel without boundary roundoff');
core.step(100000);
assert.equal(Math.abs(signedWord(core.erasable()[0o37])),0);assert.equal(Math.abs(signedWord(core.erasable()[0o41])),0);
assert.equal(core.dsky.text('verb'),'16');assert.equal(core.dsky.text('noun'),'21');assert.equal(core.dsky.text('r1').slice(1),'00000');
// Validate unchanged entry words against the rope, independently of the harness.
const rope=read('Luminary099.bin'),offset=(0o31*1024+0o370)*2;
assert.deepEqual(Array.from({length:8},(_,i)=>rope.readUInt16BE(offset+2*i)>>>1),[0o34737,0o55606,0o44755,0o55620,0o55612,0o00006,0o23607,0o12312]);
const diag=await fresh();const entryCycles=startFlatoutDiagnostic(diag.core,diag.bridge);assert(entryCycles<100);assert.equal(diag.core.erasable()[0o55],4096);assert(diag.bridge.driveEnabled);
const pausedPC=diag.core.erasable()[5];const powered=new Vehicle();let up=0,z=0;
for(let i=0;i<100;i++){const delta=powered.step(0.02,diag.bridge.position,15);up+=delta[0];z+=delta[2];diag.bridge.advance(0.02,delta,{runCpu:false});if(i===49)assert.equal(diag.bridge.drivePulses,3200,'Drive rate after one second');if(i===63)assert.equal(diag.bridge.drivePulses,4096,'Command exhausted after 1.28 seconds');}
assert.equal(diag.bridge.drivePulses,4096);assert.equal(diag.bridge.position,1);assert.equal(diag.bridge.zeroOutputs,1);assert.equal(signedWord(diag.core.erasable()[0o55]),-0);
assert.equal(diag.core.erasable()[5],pausedPC,'Counter service must not continue the uninitialised flight routine');
assert(Math.abs(diag.bridge.pulses[0]*PIPA_SCALE-up)<PIPA_SCALE);assert(Math.abs(diag.bridge.pulses[2]*PIPA_SCALE-z)<PIPA_SCALE);assert(diag.bridge.pulses[0]>0&&diag.bridge.pulses[2]>0);
assert.equal(signedWord(diag.core.erasable()[0o37]),diag.bridge.pulses[0]);
// Exact demand exhaustion on a clock boundary must still emit one final ZOUT.
diag.core.erasable()[0o55]=64;diag.bridge.needsZero=false;diag.bridge.zeroOutputs=0;diag.bridge.advance(0.02,[0,0,0],{runCpu:false});assert.equal(diag.bridge.zeroOutputs,0);diag.bridge.advance(0.02,[0,0,0],{runCpu:false});assert.equal(diag.bridge.zeroOutputs,1);
// Negative DINC commands produce MOUT and reduce model position.
diag.core.erasable()[0o55]=0o77777^4;const position=diag.bridge.position;diag.bridge.advance(0.02,[0,0,0],{runCpu:false});assert.equal(diag.bridge.position,position-4/4096);
const instant=new Vehicle(),slow=new Vehicle();instant.step(0.02,1,0,0);slow.step(0.02,1,0,1);assert(instant.throttle>slow.throttle);assert(instant.vy>slow.vy);
const contact=new Vehicle();contact.h=0.1;const delta=contact.step(0.02,0,0);assert.equal(contact.status,'contact');assert.equal(contact.h,0);assert(contact.t<0.02);assert.deepEqual(delta,[0,0,0]);
assert.throws(()=>bridge.advance(1,[0,0,0]));assert.throws(()=>new Vehicle().step(0.02,2,0));
console.log('PASS: real AGC PIPA input, gravity exclusion, pulse quantization/reversal, original V16 N21 display, unchanged FLATOUT entry words and drive enable, 4096 POUT pulses, final ZOUT, MOUT, counter-only CPU isolation, lag response and surface contact.');
