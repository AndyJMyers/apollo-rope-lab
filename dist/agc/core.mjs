// SPDX-License-Identifier: GPL-2.0-or-later
// Apollo Rope Lab adapter for the unmodified yaAGC WASI binary distributed by webAGC.
export const CYCLE_US=11.72;
export const KEY_CODES={VERB:17,NOUN:31,ENTR:28,CLR:30,'KEY REL':25,RSET:18,'+':26,'−':27,'-':27,'0':16,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9};
const DIGITS={0:' ',21:'0',3:'1',25:'2',27:'3',15:'4',30:'5',28:'6',19:'7',29:'8',31:'9'};
export class Dsky {
 constructor(){this.fields={prog:[' ',' '],verb:[' ',' '],noun:[' ',' '],r1:Array(5).fill(' '),r2:Array(5).fill(' '),r3:Array(5).fill(' ')};this.signs={r1:[false,false],r2:[false,false],r3:[false,false]};this.channels={};this.lamps=0;this.annunciators=0;}
 receive(channel,value){
  this.channels[channel]=value;
  if(channel===0o10){const pair=value>>>11,left=DIGITS[(value>>>5)&31]??'?',right=DIGITS[value&31]??'?',sign=!!(value&1024);const f=this.fields;
   switch(pair){case 11:f.prog=[left,right];break;case 10:f.verb=[left,right];break;case 9:f.noun=[left,right];break;case 8:f.r1[0]=right;break;case 7:f.r1[1]=left;f.r1[2]=right;this.signs.r1[0]=sign;break;case 6:f.r1[3]=left;f.r1[4]=right;this.signs.r1[1]=sign;break;case 5:f.r2[0]=left;f.r2[1]=right;this.signs.r2[0]=sign;break;case 4:f.r2[2]=left;f.r2[3]=right;this.signs.r2[1]=sign;break;case 3:f.r2[4]=left;f.r3[0]=right;break;case 2:f.r3[1]=left;f.r3[2]=right;this.signs.r3[0]=sign;break;case 1:f.r3[3]=left;f.r3[4]=right;this.signs.r3[1]=sign;break;case 12:this.annunciators=value&1023;break;}
  }else if(channel===0o11){this.lamps=(this.lamps&~6)|(value&6);}else if(channel===0o163){this.lamps=(this.lamps&~0x3f9)|(value&0x3f9);}
 }
 text(name){const digits=this.fields[name].join('');if(!name.startsWith('r'))return digits;const [plus,minus]=this.signs[name];return (minus?'−':plus?'+':' ')+digits;}
}
export class AgcCore {
 static async create(wasmBytes,{onOutput=()=>{},onDiagnostic=()=>{}}={}){
  const memory=new WebAssembly.Memory({initial:5});
  const view=()=>new DataView(memory.buffer);
  const wasi={
   fd_close:()=>8,
   fd_seek:()=>70,
   fd_fdstat_get:(fd,ptr)=>{if(fd!==1&&fd!==2)return 8;const a=new Uint8Array(memory.buffer);a.fill(0,ptr,ptr+24);a[ptr]=2;return 0;},
   fd_write:(fd,iovs,count,written)=>{if(fd!==1&&fd!==2)return 8;const v=view(),a=new Uint8Array(memory.buffer);let total=0,text='';for(let i=0;i<count;i++){const p=v.getUint32(iovs+8*i,true),n=v.getUint32(iovs+8*i+4,true);text+=new TextDecoder().decode(a.subarray(p,p+n));total+=n;}v.setUint32(written,total,true);if(text)onDiagnostic(text);return 0;}
  };
  const module=await WebAssembly.compile(wasmBytes);const instance=await WebAssembly.instantiate(module,{env:{memory},wasi_snapshot_preview1:wasi});
  return new AgcCore(memory,instance,onOutput);
 }
 constructor(memory,instance,onOutput){this.memory=memory;this.instance=instance;this.exports=instance.exports;this.onOutput=onOutput;this.cycles=0;this.dsky=new Dsky();this.packetCount=0;}
 version(){const a=new Uint8Array(this.memory.buffer);const ptr=this.exports.version();let end=ptr;while(end<a.length&&a[end])end++;return new TextDecoder().decode(a.subarray(ptr,end));}
 loadRom(rom){const a=new Uint8Array(rom);if(a.byteLength!==73728)throw new Error('Expected a complete 36-bank, 73,728-byte rope image.');const ptr=this.exports.malloc(a.length);if(!ptr)throw new Error('AGC ROM allocation failed.');try{new Uint8Array(this.memory.buffer).set(a,ptr);this.exports.set_fixed(ptr);}finally{this.exports.free(ptr);}this.reset();}
 reset(){this.exports.cpu_reset();this.cycles=0;this.packetCount=0;this.dsky=new Dsky();this.step(1);this.write(0x100|0o15,31);this.write(0x100|0o32,0o20000);this.write(0o32,0o20000);this.step(256);}
 write(channel,value){if(!Number.isInteger(channel)||channel<0||channel>511||!Number.isInteger(value)||value<0||value>32767)throw new Error('Invalid AGC input packet.');if(this.exports.packet_write(channel,value)<=0)throw new Error('AGC input queue rejected packet.');}
 key(name){const code=KEY_CODES[name];if(code===undefined)throw new Error('Unknown DSKY key '+name);this.write(0o15,code);}
 proceed(pressed){this.write(0o32,pressed?0:0o20000);}
 step(cycles){if(!Number.isInteger(cycles)||cycles<0||cycles>1000000)throw new Error('Invalid cycle count.');let remaining=cycles;while(remaining){const n=Math.min(1024,remaining);this.exports.cpu_step(n);this.cycles+=n;remaining-=n;this.drain();}}
 drain(){let packet;while((packet=this.exports.packet_read())!==0){const channel=packet>>>16,value=packet&32767;this.packetCount++;this.dsky.receive(channel,value);this.onOutput(channel,value);}}
 erasable(){return new Uint16Array(this.memory.buffer,this.exports.get_erasable_ptr(),2048);}
}
export async function verifiedBytes(url,expectedHash){const response=await fetch(url);if(!response.ok)throw new Error('Could not load '+url+' ('+response.status+').');const bytes=await response.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==expectedHash)throw new Error('Asset hash mismatch: '+url);return bytes;}
