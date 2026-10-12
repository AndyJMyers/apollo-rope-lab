// SPDX-License-Identifier: GPL-2.0-or-later
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {AgcCore} from '../dist/agc/core.mjs';
import {fixedWord,wordBits,recordFlatout} from '../dist/agc/rope-trace.mjs';
const read=name=>fs.readFileSync(new URL('../dist/agc/'+name,import.meta.url)),rom=read('Luminary099.bin');
assert.equal(fixedWord(rom,0o31,0o2370),0o34737);assert.equal(fixedWord(rom,2,0o4737),4096,'BIT13 constant');
assert.deepEqual(wordBits(0o40001),[1,0,0,0,0,0,0,0,0,0,0,0,0,0,1]);assert.equal(wordBits(0o77777).filter(Boolean).length,15);
assert.throws(()=>fixedWord(rom,36,0o2370));assert.throws(()=>fixedWord(rom,0o31,0o1370));assert.throws(()=>wordBits(32768));
// Explicit file-bank permutation: 2,3,0,1,4..35.
for(const [bank,fileBank] of [[2,0],[3,1],[0,2],[1,3],[4,4],[35,35]])assert.equal(fixedWord(rom,bank,0o2000),rom.readUInt16BE(fileBank*2048)>>>1);
const core=await AgcCore.create(read('yaAGC.wasm'));core.loadRom(rom);const trace=recordFlatout(core,rom);
assert.equal(trace.cycles,27);assert.equal(trace.frames.length,15);assert.equal(trace.frames.reduce((sum,f)=>sum+f.memoryCycles,0),27);
for(const f of trace.frames){assert.notEqual(f.name,'Unknown');assert.equal(f.word,fixedWord(rom,f.bank,f.address));assert.equal(f.before.pc,f.address);assert.notEqual(f.after.pc,f.address);}
assert.equal(trace.frames[0].after.a,4096);assert.equal(trace.frames[11].name,'TS THRUST');assert.equal(trace.frames[11].word,0o54055);assert.equal(trace.frames[11].before.thrust,0);assert.equal(trace.frames[11].after.thrust,4096);
const last=trace.frames.at(-1);assert.equal(last.name,'WOR CHAN14');assert.equal(last.word,0o05014);assert.equal(last.before.channel14,0);assert.equal(last.after.channel14,8);assert.equal(last.after.thrust,4096);assert(trace.driveEnabled);
console.log('PASS: fixed-bank permutation, BIT13 and selected rope words, bit order/bounds, all 15 actual instruction transitions, 27 cycles, accumulator constant, THRUST store and real channel-014 enable.');
