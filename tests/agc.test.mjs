// SPDX-License-Identifier: GPL-2.0-or-later
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {AgcCore,Dsky,KEY_CODES} from '../dist/agc/core.mjs';
const dir=new URL('../dist/agc/',import.meta.url),read=name=>fs.readFileSync(new URL(name,dir));
const provenance=JSON.parse(read('provenance.json'));
for(const [name,asset] of Object.entries(provenance.assets)){const b=read(name);assert.equal(b.length,asset.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),asset.sha256);}
const octal=[];for(const raw of read('source/Luminary099.binsource').toString().split('\n')){const line=raw.split(';')[0].trim();if(!line||line.includes('='))continue;for(const token of line.split(/\s+/)){assert(token==='@'||/^[0-7]{5}$/.test(token),'Unexpected octal token');octal.push(token==='@'?0:parseInt(token,8));}}
assert.equal(octal.length,36864);const rope=read('Luminary099.bin');for(let i=0;i<octal.length;i++)assert.equal(rope.readUInt16BE(i*2)>>>1,octal[i],'Rope word '+i);
const core=await AgcCore.create(read('yaAGC.wasm'));assert.equal(core.version(),provenance.emulator.version);core.loadRom(rope);core.step(100000);
assert(core.packetCount>0);assert(core.erasable()[5]>=0o400&&core.erasable()[5]<=0o7777,'Z points to valid address');
const macro=keys=>{for(const key of keys){core.key(key);core.step(60000);}core.step(100000);};
macro(['VERB','3','5','ENTR']);for(const field of ['prog','verb','noun'])assert.equal(core.dsky.text(field),'88');for(const field of ['r1','r2','r3'])assert.equal(core.dsky.text(field).slice(1),'88888');assert(core.dsky.annunciators!==0,'Lamp-test annunciators');
// Wait until the original lamp test ends before commanding continuous time display.
core.step(1000000);core.step(1000000);macro(['VERB','1','6','NOUN','6','5','ENTR']);assert.equal(core.dsky.text('verb'),'16');assert.equal(core.dsky.text('noun'),'65');
const beforeTime=core.dsky.text('r3');core.step(100000);assert.notEqual(core.dsky.text('r3'),beforeTime,'Time register updates under original flight code');
const validation=await AgcCore.create(read('yaAGC.wasm'));validation.loadRom(read('Validation.bin'));validation.step(100000);assert.equal(validation.dsky.text('prog'),'00');validation.proceed(true);validation.step(10000);validation.proceed(false);
let completed=false;for(let i=0;i<100;i++){validation.step(250000);const mode=validation.dsky.text('prog');assert(['00','77'].includes(mode),'Upstream CPU test failure '+mode+' subcode '+validation.dsky.text('noun'));if(mode==='77'){completed=true;break;}}
assert(completed,'Validation must reach completion 77');assert.equal(validation.erasable()[0o61],0o77777,'Validation final ERRNUM sentinel');
const d=new Dsky();d.receive(0o10,parseInt('100000000000011',2));d.receive(0o10,parseInt('011111100111011',2));d.receive(0o10,parseInt('011000111111110',2));assert.equal(d.text('r1'),'+12345');
assert.equal(KEY_CODES['0'],0o20);assert.equal(KEY_CODES.NOUN,0o37);assert.throws(()=>core.key('invalid'));assert.throws(()=>core.loadRom(new Uint8Array(10)));assert.throws(()=>core.write(512,1));
console.log('PASS: asset SHA-256, all 36,864 octal words, emulator version, flight boot, original V35 lamp test, original V16 N65 time display, DSKY channel decoding, input bounds.');
console.log('PASS: available upstream CPU tests reach PROG 77 after '+validation.cycles+' memory cycles. The upstream suite is partial, not exhaustive CPU certification.');
