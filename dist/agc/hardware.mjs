// SPDX-License-Identifier: GPL-2.0-or-later
// Hardware demonstration, not a mission-aligned inertial navigation system.
import {CYCLE_US} from './core.mjs';
export const PIPA_SCALE=0.0585; // metres/second per pulse; Virtual AGC LM Simulator
export const PIPA=[0o37,0o40,0o41], THRUST_COUNTER=0o55;
export function signedWord(word){word&=0o77777;return word&0o40000?-(word^0o77777):word;}
export class HardwareBridge {
 constructor(core){this.core=core;this.residual=[0,0,0];this.pulses=[0,0,0];this.driveClock=0;this.cycleFraction=0;this.driveEnabled=false;this.position=0;this.drivePulses=0;this.zeroOutputs=0;this.needsZero=false;
  const previous=core.onOutput;
  core.onOutput=(channel,value)=>{previous(channel,value);this.receive(channel,value);};
 }
 receive(channel,value){
  if(channel===0o14)this.driveEnabled=!!(value&8);
  if(channel===(0x80|THRUST_COUNTER)){
   if(value===0o15||value===0o16){this.position=Math.max(0,Math.min(1,this.position+(value===0o15?1:-1)/4096));this.drivePulses++;}
   else if(value===0o17){this.zeroOutputs++;this.needsZero=false;}
  }
 }
 // Every input packet steals one memory cycle through the original counter logic.
 service(counter,type,count){for(let remaining=count;remaining>0;){const n=Math.min(128,remaining);for(let i=0;i<n;i++)this.core.write(0x80|counter,type);this.core.step(n);remaining-=n;}return count;}
 advance(dt,deltaV,{runCpu=true}={}){
  if(!Number.isFinite(dt)||dt<=0||dt>0.05||deltaV.length!==3||deltaV.some(x=>!Number.isFinite(x)))throw new Error('Invalid hardware timestep.');
  let used=0;
  for(let axis=0;axis<3;axis++){
   this.residual[axis]+=deltaV[axis]/PIPA_SCALE;
   // Avoid losing a pulse when floating-point sums land just below an integer.
   const n=Math.trunc(this.residual[axis]+Math.sign(this.residual[axis])*1e-12);
   if(Math.abs(n)>256)throw new Error('Sensor impulse exceeds the demonstration range.');
   this.residual[axis]-=n;if(Math.abs(this.residual[axis])<1e-12)this.residual[axis]=0;this.pulses[axis]+=n;
   used+=this.service(PIPA[axis],n<0?2:0,Math.abs(n));
  }
  if(this.driveEnabled){
   this.driveClock+=dt*3200;
   const ticks=Math.floor(this.driveClock);this.driveClock-=ticks;
   const pending=Math.abs(signedWord(this.core.erasable()[THRUST_COUNTER]));
   // One final DINC at zero produces ZOUT; do not clock zero forever.
   if(pending>0)this.needsZero=true;
   const count=Math.min(ticks,pending+(this.needsZero?1:0));
   used+=this.service(THRUST_COUNTER,4,count);
  }else this.driveClock=0;
  if(runCpu){this.cycleFraction+=dt*1e6/CYCLE_US;const budget=Math.floor(this.cycleFraction);this.cycleFraction-=budget;if(used>budget)throw new Error('Counter traffic exceeds the CPU time budget.');this.core.step(budget-used);}
 }
}
// Isolated bounded entry test: unchanged FLATOUT in bank 31, address 2370.
// Register seeding is a diagnostic harness, not the flight startup procedure.
// Stop immediately after the original WOR CHAN14. Thereafter service counters
// only: navigation, Executive and the rest of the throttle routine do not run.
export function startFlatoutDiagnostic(core,bridge){
 core.exports.cpu_reset();core.step(1); // consume the emulator's reset/GOJAM
 const m=core.erasable();m[3]=7<<8;m[4]=0o31<<10;m[6]=(0o31<<10)|7;m[5]=0o2370;m[2]=0;
 bridge.driveEnabled=false;bridge.position=0;
 for(let i=0;i<100;i++){core.step(1);if(bridge.driveEnabled){if(m[THRUST_COUNTER]!==4096)throw new Error('Unexpected FLATOUT demand.');return i+1;}}
 throw new Error('Original FLATOUT did not enable thrust drive.');
}
export class Vehicle {
 constructor(){this.t=0;this.h=600;this.x=0;this.vy=-20;this.vx=0;this.fuel=2000;this.throttle=0;this.status='flying';}
 step(dt,target,angle,lag=0.2){
  if(!Number.isFinite(dt)||dt<=0||dt>0.05||!Number.isFinite(target)||target<0||target>1||!Number.isFinite(angle)||Math.abs(angle)>25||!Number.isFinite(lag)||lag<0)throw new Error('Invalid vehicle command.');
  if(this.status!=='flying')return [0,0,0];
  this.throttle=lag===0?target:target+(this.throttle-target)*Math.exp(-dt/lag);
  const needed=45040*this.throttle*dt/(311*9.80665), fraction=needed?Math.min(1,this.fuel/needed):1;
  const acceleration=45040*this.throttle*fraction/(7000+this.fuel),radians=angle*Math.PI/180;
  const up=acceleration*Math.cos(radians),across=acceleration*Math.sin(radians),ay=up-1.62;
  // Shorten the final interval at the ground crossing; sensors stop at contact.
  let elapsed=dt;
  if(this.h+this.vy*dt+0.5*ay*dt*dt<=0){
   let lo=0,hi=dt;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(this.h+this.vy*mid+0.5*ay*mid*mid>0)lo=mid;else hi=mid;}elapsed=(lo+hi)/2;this.status='contact';
  }
  this.h=this.status==='contact'?0:Math.max(0,this.h+this.vy*elapsed+0.5*ay*elapsed*elapsed);this.x+=this.vx*elapsed+0.5*across*elapsed*elapsed;this.vy+=ay*elapsed;this.vx+=across*elapsed;this.t+=elapsed;this.fuel=Math.max(0,this.fuel-needed*elapsed/dt);
  if(this.fuel===0)this.throttle=0;
  // X vertical, Y out of plane, Z downrange. Gravity is deliberately excluded.
  return [up*elapsed,0,across*elapsed];
 }
}
