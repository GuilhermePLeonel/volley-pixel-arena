export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const gravityOf=ball=>ball.gravity??9.8;
export function trajectory(ball, seconds=2.6, step=.05){const out=[];let g=gravityOf(ball);for(let t=0;t<seconds;t+=step){let y=ball.y+ball.vy*t-.5*g*t*t;if(y<0)break;out.push({x:ball.x+ball.vx*t,y,z:ball.z+ball.vz*t,t});}return out;}
export function launch(ball,target,duration,gravity=9.8){duration=clamp(duration,.12,2.6);ball.gravity=gravity;ball.vx=(target.x-ball.x)/duration;ball.vz=(target.z-ball.z)/duration;ball.vy=(target.y-ball.y+.5*gravity*duration*duration)/duration;}
// High-power attacks use an arcade topspin approximation. Passes keep normal gravity.
export function shotGravity(kind,power){if(kind==='attack'&&power>=1)return 0;return kind==='attack'?16+18*clamp((power-.6)/.1,0,1)+16*clamp((power-.6)/.4,0,1):9.8;}
export function shotDuration(ball,target,kind,power){
 power=clamp(power,0,1);if(kind==='attack'&&power>=1)return clamp(Math.hypot(target.x-ball.x,target.y-ball.y,target.z-ball.z)/40,.12,1.2);let boost=clamp((power-.6)/.4,0,1),threshold=clamp((power-.6)/.1,0,1);
 let duration=kind==='attack'?.95-.12*power-.13*threshold-.17*boost:kind==='free'?1.35-.2*power:kind==='set'?1.68+.18*power:1.52+.18*power;
 if(ball.x*target.x<0){let fraction=-ball.x/(target.x-ball.x);let baseline=ball.y+(target.y-ball.y)*fraction;let needed=(2.83-baseline)/(.5*shotGravity(kind,power)*fraction*(1-fraction));if(needed>0)duration=Math.max(duration,Math.sqrt(needed));}
 return clamp(duration,.3,2.6);
}
export function stepBall(b,dt){let gravity=gravityOf(b);b.x+=b.vx*dt;b.y+=b.vy*dt-.5*gravity*dt*dt;b.z+=b.vz*dt;b.vy-=gravity*dt;}



