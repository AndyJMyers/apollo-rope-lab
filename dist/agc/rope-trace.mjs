// SPDX-License-Identifier: GPL-2.0-or-later
import {HardwareBridge,startFlatoutDiagnostic} from './hardware.mjs';
export function fixedWord(rom,bank,address){
 if(!Number.isInteger(bank)||bank<0||bank>=36||!Number.isInteger(address)||address<0o2000||address>0o7777)throw new Error('Not a valid fixed-rope address.');
 const bytes=rom instanceof Uint8Array?rom:new Uint8Array(rom);
 if(bytes.length!==73728)throw new Error('Expected the complete flight rope.');
 const fileBank=bank===2?0:bank===3?1:bank===0?2:bank===1?3:bank;
 const offset=2*(fileBank*1024+(address&0o1777));
 return ((bytes[offset]<<8)|bytes[offset+1])>>>1;
}
export function wordBits(word){if(!Number.isInteger(word)||word<0||word>0o77777)throw new Error('Invalid 15-bit word.');return Array.from({length:15},(_,i)=>(word>>>(14-i))&1);}
export const INSTRUCTIONS={
 [0o2370]:['CAF BIT13','Load the fixed constant BIT13 (4096) into A.'],
 [0o2371]:['TS PIFPSET','Store that value in the throttle preset.'],
 [0o2372]:['CS ZERO','Load the complement of zero.'],
 [0o2373]:['TS FCOLD','Store the previous-force value.'],
 [0o2374]:['TS PIF','Store the incremental-force value.'],
 [0o2375]:['EXTEND','Select the extended instruction set for the next word.'],
 [0o2376]:['QXCH RTNHOLD','Exchange Q with the throttle routine’s return register.'],
 [0o2377]:['TCF DOIT','Transfer control to the throttle output path.'],
 [0o2312]:['CA PIF','Load the incremental-force value.'],
 [0o2313]:['AD PIFPSET','Add the throttle preset.'],
 [0o2314]:['TS PSEUDO55','Store a working copy of the output demand.'],
 [0o2315]:['TS THRUST','Put the 4096-pulse demand in counter 0055.'],
 [0o2316]:['CAF BIT4','Load the thrust-drive enable mask, 00010 octal.'],
 [0o2317]:['EXTEND','Select extended I/O for the next word.'],
 [0o2320]:['WOR CHAN14','OR the enable mask into output channel 014.']
};
function snapshot(core){const m=core.erasable();return {pc:m[5]&0o7777,a:m[0],q:m[2],thrust:m[0o55],channel14:core.dsky.channels[0o14]||0,cycles:core.cycles};}
export function recordFlatout(core,rom){
 const bridge=new HardwareBridge(core),frames=[];let before,firstCycle;
 const cycles=startFlatoutDiagnostic(core,bridge,{onCycle(phase,c){
  if(phase==='before'){if(!before){before=snapshot(c);firstCycle=before.cycles;}return;}
  const after=snapshot(c);
  if(after.pc!==before.pc){const [name,explanation]=INSTRUCTIONS[before.pc]||['Unknown',''];frames.push({bank:0o31,address:before.pc,word:fixedWord(rom,0o31,before.pc),name,explanation,before,after,memoryCycles:after.cycles-firstCycle});before=null;}
 }});
 if(frames.length!==15||!bridge.driveEnabled||core.erasable()[0o55]!==4096)throw new Error('The original throttle trace did not complete as expected.');
 return {frames,cycles,driveEnabled:bridge.driveEnabled};
}
