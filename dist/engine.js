/* Educational dynamics and overload model. Does not execute AGC instructions. */
(function(root){
 const G=1.62, THRUST=45040, ISP=311, DRY=7000;
 function initial(){return {t:0,h:600,x:350,vy:-28,vx:-12,fuel:2000,throttle:0,angle:0,mode:'auto',status:'ready',alarms:0,nextAlarm:0,shedUntil:0,freezeUntil:0,trace:[]};}
 function command(s){
  const target=s.h<15?-1.2:-Math.min(28,Math.sqrt(1.2*Math.max(0,s.h-2)));
  const up=Math.max(.1,G+.9*(target-s.vy));
  const ax=Math.max(-1.8,Math.min(1.8,-.012*s.x-.24*s.vx));
  const angle=Math.max(-25,Math.min(25,Math.atan2(ax,up)*180/Math.PI));
  return {angle,throttle:Math.max(0,Math.min(1,up*(DRY+s.fuel)/(THRUST*Math.cos(angle*Math.PI/180))))};
 }
 function step(s,dt,opts){
  if(s.status!=='flying')return s;
  const total=85+opts.radar;
  if(total>100 && s.t>=s.nextAlarm){s.alarms++;s.nextAlarm=s.t+4;s.shedUntil=s.t+3.8;s.freezeUntil=s.t+.2;if(opts.onAlarm)opts.onAlarm(s);}
  const effective=total-(opts.protect&&s.t<s.shedUntil?28:0);
  const canGuide=effective<=100&&s.t>=s.freezeUntil;
  if(s.mode==='auto'&&canGuide){const c=command(s);s.angle=c.angle;s.throttle=c.throttle;}
  if(s.fuel<=0)s.throttle=0;
  const needed=THRUST*s.throttle/(ISP*9.80665)*dt;
  const fraction=needed>0?Math.min(1,s.fuel/needed):1;
  const thrust=THRUST*s.throttle*fraction;
  const mass=DRY+s.fuel;
  s.fuel=Math.max(0,s.fuel-needed);
  const radians=s.angle*Math.PI/180;
  const ay=thrust*Math.cos(radians)/mass-G, ax=thrust*Math.sin(radians)/mass;
  const prevH=s.h;
  s.h+=s.vy*dt+.5*ay*dt*dt;s.x+=s.vx*dt+.5*ax*dt*dt;s.vy+=ay*dt;s.vx+=ax*dt;s.t+=dt;
  if(s.h<=0){
   // Interpolate the ground crossing so the reported impact speed is meaningful.
   const f=Math.max(0,Math.min(1,prevH/(prevH-s.h)));
   s.vy-=ay*dt*(1-f);s.vx-=ax*dt*(1-f);s.x-=s.vx*dt*(1-f);s.t-=dt*(1-f);s.h=0;s.throttle=0;
   s.status=Math.abs(s.vy)<=3&&Math.abs(s.vx)<=2&&Math.abs(s.x)<=40?'landed':'crashed';
  }
  return s;
 }
 root.RopeEngine={initial,step,command,constants:{G,THRUST,ISP,DRY}};
 if(typeof module!=='undefined')module.exports=root.RopeEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
