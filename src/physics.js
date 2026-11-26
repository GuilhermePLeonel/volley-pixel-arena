export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function trajectory(ball, seconds=2.6, step=.05){const out=[];for(let t=0;t<seconds;t+=step){let y=ball.y+ball.vy*t-4.9*t*t;if(y<0)break;out.push({x:ball.x+ball.vx*t,y,z:ball.z+ball.vz*t,t});}return out;}
export function launch(ball,target,duration){duration=clamp(duration,.3,2.6);ball.vx=(target.x-ball.x)/duration;ball.vz=(target.z-ball.z)/duration;ball.vy=(target.y-ball.y+4.9*duration*duration)/duration;}
// Longer flight creates a higher parabola for passes and sets. An attack gets a
// shorter flight, but is lifted when necessary to clear the net physically.
export function shotDuration(ball,target,kind,power){
 power=clamp(power,0,1);
 let duration=kind==='attack'?.91-.28*power:kind==='free'?1.35-.2*power:kind==='set'?1.68+.18*power:1.52+.18*power;
 if(ball.x*target.x<0){let fraction=-ball.x/(target.x-ball.x);let baseline=ball.y+(target.y-ball.y)*fraction;let needed=(2.83-baseline)/(4.9*fraction*(1-fraction));if(needed>0)duration=Math.max(duration,Math.sqrt(needed));}
 return clamp(duration,.3,2.6);
}
export function stepBall(b,dt){b.vy-=9.8*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;}
