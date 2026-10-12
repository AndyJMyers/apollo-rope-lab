// SPDX-License-Identifier: GPL-2.0-or-later
import {AgcCore,verifiedBytes} from './core.mjs';
import {HardwareBridge,Vehicle,PIPA,signedWord,startFlatoutDiagnostic} from './hardware.mjs';
const $=id=>document.getElementById(id);
let core,bridge,vehicle=new Vehicle(),mode='',running=false,busy=false,last=0,accumulator=0,samples=[],lastSample=-1,manifest;
const canvas=$('hw-scene'),ctx=canvas.getContext('2d');
function status(text){$('hw-status').textContent=text;}
function controls(){
 for(const id of ['hw-manual','hw-flatout'])$(id).disabled=busy;
 $('hw-play').disabled=busy||!core||vehicle.status!=='flying'||vehicle.t>=120;
 $('hw-step').disabled=busy||!core||running||vehicle.status!=='flying'||vehicle.t>=120;
 $('hw-reset').disabled=busy||!core;
 $('hw-throttle').disabled=busy||mode==='flatout';
 $('hw-tilt').disabled=$('hw-lag').disabled=busy;
 $('hw-export').disabled=busy||!samples.length;
 $('hw-play').textContent=running?'PAUSE EXPERIMENT':'RUN EXPERIMENT';
}
async function boot(selected){
 if(busy)return;busy=true;running=false;controls();status('Verifying rope and emulator assets…');
 try{
  manifest??=await fetch(new URL('./provenance.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Provenance unavailable.');return r.json();});
  const names=['yaAGC.wasm','Luminary099.bin'];
  const [wasm,rom]=await Promise.all(names.map(name=>verifiedBytes(new URL('./'+name,import.meta.url),manifest.assets[name].sha256)));
  core=await AgcCore.create(wasm);core.loadRom(rom);bridge=new HardwareBridge(core);vehicle=new Vehicle();mode=selected;samples=[];lastSample=-1;accumulator=0;
  if(mode==='flatout'){
   const cycles=startFlatoutDiagnostic(core,bridge);
   status('Original FLATOUT enabled drive after '+cycles+' entry cycles. Ready to clock its command.');
   $('hw-source').textContent='CONTROL: original FLATOUT command. Entry registers are seeded; after the command, only counters are serviced. No continuous flight guidance runs.';
  }else{
   core.step(100000);for(const key of ['VERB','1','6','NOUN','2','1','ENTR']){core.key(key);core.step(60000);}core.step(100000);
   status('Flight computer running V16 N21. Ready: freefall produces no sensor pulses.');
   $('hw-source').textContent='CONTROL: your manual throttle. The full original computer runs and displays accelerometer counts, but does not command the vehicle.';
   $('hw-throttle').value=0;$('hw-throttle-label').textContent='0%';
  }
  record();render();
 }catch(e){core=null;status('Experiment could not start: '+e.message);}
 finally{busy=false;controls();}
}
function record(){
 if(!core)return;
 samples.push([vehicle.t.toFixed(6),mode,vehicle.h.toFixed(6),vehicle.vy.toFixed(6),vehicle.vx.toFixed(6),vehicle.fuel.toFixed(6),vehicle.throttle.toFixed(6),$('hw-tilt').value,(+$('hw-lag').value/100).toFixed(2),...PIPA.map(a=>signedWord(core.erasable()[a])),...bridge.pulses,bridge.drivePulses,signedWord(core.erasable()[0o55]),core.cycles]);
 lastSample=vehicle.t;
}
function tick(){
 if(vehicle.status!=='flying'||vehicle.t>=120)return;
 const target=mode==='flatout'?bridge.position:+$('hw-throttle').value/100;
 const before=vehicle.t,delta=vehicle.step(0.02,target,+$('hw-tilt').value,+$('hw-lag').value/100);
 bridge.advance(vehicle.t-before,delta,{runCpu:mode!=='flatout'});
 if(vehicle.t-lastSample>=0.099||vehicle.status!=='flying'||vehicle.t>=120)record();
 if(vehicle.status!=='flying'||vehicle.t>=120){running=false;status(vehicle.status==='contact'?'Contact at '+Math.abs(vehicle.vy).toFixed(2)+' m/s vertically. Reset for another experiment.':'120-second experiment complete. Reset to repeat.');controls();}
}
function guardTick(){try{tick();}catch(e){running=false;status('Experiment paused: '+e.message);controls();}}
function render(){
 $('hw-clock').textContent='T+ '+vehicle.t.toFixed(2)+' s';$('hw-height').textContent=vehicle.h.toFixed(1)+' m';$('hw-vy').textContent=vehicle.vy.toFixed(2)+' m/s';$('hw-vx').textContent=vehicle.vx.toFixed(2)+' m/s';$('hw-engine').textContent=(100*vehicle.throttle).toFixed(1)+'%';$('hw-fuel').textContent=vehicle.fuel.toFixed(1)+' kg';$('hw-control').textContent=mode==='flatout'?'AGC command':mode==='manual'?'Manual':'—';
 $('hw-motion').textContent=vehicle.status==='contact'?'CONTACT':running?'Hardware loop active.':core?'Paused.':'Ready.';
 if(core){
  const m=core.erasable();$('hw-pipa').textContent=PIPA.map((a,i)=>'PIPA'+'XYZ'[i]+' / '+a.toString(8).padStart(4,'0')+'  '+(m[a]&0o77777).toString(8).padStart(5,'0')+'\n  signed count: '+signedWord(m[a])+'\n  delivered: '+bridge.pulses[i]+' pulses').join('\n\n');
  $('hw-drive').textContent='CH 014 BIT 4: '+(bridge.driveEnabled?'ON':'OFF')+'\nTHRUST remaining: '+signedWord(m[0o55])+'\nDrive pulses: '+bridge.drivePulses+'\nZOUT events: '+bridge.zeroOutputs+'\nModel position: '+(bridge.position*100).toFixed(1)+'%';
  $('hw-dsky').textContent=mode==='flatout'?'Bounded command test.\nDSKY not running.':'PROG '+core.dsky.text('prog')+'\nVERB '+core.dsky.text('verb')+'  NOUN '+core.dsky.text('noun')+'\n\n'+['r1','r2','r3'].map(x=>core.dsky.text(x)).join('\n');
 }
 draw();
}
function draw(){
 const w=canvas.clientWidth||600,h=canvas.clientHeight||330,dpr=Math.min(window.devicePixelRatio||1,2);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#050906';ctx.fillRect(0,0,w,h);
 for(let i=0;i<40;i++){ctx.fillStyle='#536148';ctx.fillRect((i*137.17)%w,(i*i*13.43)%(h*0.8),1,1);}
 const top=Math.max(700,vehicle.h*1.15),ground=h-30,y=ground-vehicle.h/top*(h-60);
 ctx.font='10px monospace';ctx.lineWidth=1;ctx.strokeStyle='#293724';ctx.fillStyle='#879776';
 for(let i=0;i<=3;i++){const yy=ground-i/3*(h-60);ctx.beginPath();ctx.moveTo(15,yy);ctx.lineTo(w-15,yy);ctx.stroke();ctx.fillText(Math.round(top*i/3)+' m',18,yy-6);}
 ctx.fillStyle='#182112';ctx.fillRect(0,ground,w,30);
 ctx.save();ctx.translate(w*0.55,y-15);ctx.rotate(+$('hw-tilt').value*Math.PI/180);
 if(vehicle.status==='flying'&&vehicle.throttle>0){ctx.fillStyle='#d9bc6a';ctx.beginPath();ctx.moveTo(-5,6);ctx.lineTo(0,12+vehicle.throttle*35);ctx.lineTo(5,6);ctx.fill();}
 ctx.fillStyle='#c5c9a7';ctx.strokeStyle='#c5c9a7';ctx.lineWidth=2;ctx.fillRect(-12,-6,24,12);ctx.strokeRect(-7,-18,14,10);
 for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*10,3);ctx.lineTo(s*20,15);ctx.lineTo(s*26,15);ctx.stroke();}ctx.restore();
 ctx.fillStyle='#b7d56d';ctx.fillText('DOWNRANGE '+vehicle.x.toFixed(1)+' m · vehicle centred in view',18,h-10);
}
function frame(now){
 if(running&&!busy&&!document.hidden){accumulator+=Math.min(0.05,Math.max(0,(now-last)/1000));while(accumulator>=0.02&&running){guardTick();accumulator-=0.02;}render();}
 last=now;requestAnimationFrame(frame);
}
for(const name of ['manual','flatout'])$('hw-'+name).onclick=()=>boot(name);
for(const [name,suffix] of [['throttle','%'],['tilt','°'],['lag',' s']])$('hw-'+name).oninput=()=>{$('hw-'+name+'-label').textContent=(name==='lag'?(+$('hw-lag').value/100).toFixed(2):$('hw-'+name).value)+suffix;render();};
$('hw-play').onclick=()=>{running=!running;last=performance.now();accumulator=0;status(running?'Experiment running. Change tilt or lag to compare the response.':'Experiment paused.');controls();};
$('hw-step').onclick=()=>{guardTick();render();controls();};$('hw-reset').onclick=()=>boot(mode);
$('hw-export').onclick=()=>{
 if(lastSample!==vehicle.t)record();
 const header='time_s,control,height_m,vertical_m_s,downrange_m_s,fuel_kg,engine_fraction,tilt_deg,lag_s,pipax,pipay,pipaz,input_x_pulses,input_y_pulses,input_z_pulses,drive_pulses,thrust_remaining,cpu_cycles';
 const url=URL.createObjectURL(new Blob([header+'\n'+samples.map(row=>row.join(',')).join('\n')+'\n'],{type:'text/csv'}));
 const a=document.createElement('a');a.href=url;a.download='apollo-hardware-'+mode+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;});window.addEventListener('resize',draw);controls();render();requestAnimationFrame(frame);
