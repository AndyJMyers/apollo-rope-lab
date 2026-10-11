const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
function fly(radar,protect,dt=.02){const s=E.initial();s.status='flying';for(let i=0;i<100000&&s.status==='flying';i++)E.step(s,dt,{radar,protect});return s;}
const nominal=fly(0,true),protectedRun=fly(25,true),unprotected=fly(25,false),extreme=fly(60,true);
assert.equal(nominal.status,'landed');assert.equal(nominal.alarms,0);
assert.equal(protectedRun.status,'landed');assert(protectedRun.alarms>0);
assert.equal(unprotected.status,'crashed');assert.equal(extreme.status,'crashed');
assert(nominal.fuel>0&&nominal.fuel<2000);assert(Math.abs(nominal.vy)<=3);assert(Math.abs(nominal.x)<=40);
const smaller=fly(0,true,.01);assert(Math.abs(smaller.t-nominal.t)<.1);assert(Math.abs(smaller.x-nominal.x)<.1);
const freefall=E.initial();freefall.mode='manual';freefall.status='flying';E.step(freefall,.1,{radar:0,protect:true});assert(Math.abs(freefall.vy-(-28-1.62*.1))<1e-9);assert.equal(freefall.fuel,2000);
const manual=E.initial();manual.mode='manual';manual.status='flying';manual.throttle=1;manual.angle=20;E.step(manual,.1,{radar:0,protect:true});assert(manual.vx>-12);assert(manual.vy>-28);assert(manual.fuel<2000);
const empty=E.initial();empty.mode='manual';empty.status='flying';empty.fuel=0;empty.throttle=1;E.step(empty,.1,{radar:0,protect:true});assert.equal(empty.throttle,0);assert.equal(empty.fuel,0);
const paused=E.initial();E.step(paused,1,{radar:0,protect:true});assert.equal(paused.t,0);assert.equal(paused.h,600);
console.log('PASS: nominal and overload comparisons, timestep consistency, manual thrust, freefall, fuel exhaustion, inactive state.');
console.log(JSON.stringify([nominal,protectedRun,unprotected,extreme].map(s=>({status:s.status,time:s.t,vy:s.vy,x:s.x,alarms:s.alarms})),null,2));
