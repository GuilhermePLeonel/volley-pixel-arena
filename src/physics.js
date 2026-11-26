export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function trajectory(ball, seconds=1.8, step=.05){const out=[];for(let t=0;t<seconds;t+=step){let y=ball.y+ball.vy*t-4.9*t*t;if(y<0)break;out.push({x:ball.x+ball.vx*t,y,z:ball.z+ball.vz*t,t});}return out;}
export function launch(ball,target,duration){duration=clamp(duration,.3,2.1);ball.vx=(target.x-ball.x)/duration;ball.vz=(target.z-ball.z)/duration;ball.vy=(target.y-ball.y+4.9*duration*duration)/duration;}
export function stepBall(b,dt){b.vy-=9.8*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;}
