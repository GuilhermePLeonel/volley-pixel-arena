import {clamp,dist,trajectory} from './physics.js';
// Opposite pairs are three places apart in the service order.
export const roles=['Levantador','Central','Ponteiro','Oposto','Central','Ponteiro'];
// Service order: positions 1, 2, 3, 4, 5, 6, viewed from team 0.
export const slots=[[-7,2.8],[-3,2.8],[-3,0],[-3,-2.8],[-7,-2.8],[-7,0]];
export const rotationSlot=(p,rotation)=>(p.index-rotation+6)%6;
export const serverIndex=rotation=>rotation%6;
export const isFront=(p,rotation)=>{const n=rotationSlot(p,rotation);return n>=1&&n<=3};
const orient=(team,x,z)=>({x:team?-x:x,z:team?-z:z});
export function formation(p,rotation){const s=slots[rotationSlot(p,rotation)];return orient(p.team,s[0],s[1]);}
export function receptionFormation(p,rotation){let spot=formation(p,rotation);if(p.role==='Levantador'&&!isFront(p,rotation))spot.x=p.team?4.6:-4.6;return spot;}
export function tacticalFormation(p,rotation,phase='transition',ballZ=0){
 const front=isFront(p,rotation);let x,z;
 if(p.role==='Levantador'){x=-1.85;z=1.9}
 else if(front){x=-2.1;z=p.role==='Central'?0:p.role==='Oposto'?3:-3;if(phase==='defense'&&p.role==='Central')z=clamp((p.team?-ballZ:ballZ)*.35,-1.1,1.1)}
 else {x=p.role==='Central'?-7.1:-6.5;z=p.role==='Central'?0:p.role==='Oposto'?2.9:-2.9}
 return orient(p.team,x,z);
}
export function makePlayers(){return [0,1].flatMap(team=>roles.map((role,index)=>{let p={id:team*6+index,team,role,index,y:0,vy:0,anim:0,facing:0,action:'idle',cool:0};return {...p,...formation(p,0)}}))}
export function chooseInterceptor(own,path,team,rules,speed){
 const candidates=path.filter(q=>(team===0?q.x<-.25:q.x>.25)&&q.y<2.85&&q.y>.45);
 let best=null;
 for(const p of own){if(p.id===rules.last)continue;for(const q of candidates){let travel=dist(p,q)/speed;let penalty=rules.side===team&&rules.touches===1&&p.role!=='Levantador'?.8:0;let score=Math.max(0,travel-q.t)*3+q.t*.3+travel*.25+penalty;if(!best||score<best.score)best={player:p,target:q,score};}}
 return best;
}
export function updateAI(game,dt){const {players,ball,rules}=game;const path=trajectory(ball);for(const team of [0,1]){const own=players.filter(p=>p.team===team);let speed=game.difficulty==='Fácil'?3.5:game.difficulty==='Difícil'?5.3:4.4;let selection=ball.targetTeam===team?chooseInterceptor(own,path,team,rules,speed):null;let chosen=selection?.player;
 for(const p of own){if(p===game.controlled)continue;let phase=rules.side===team?'offense':'defense';let dest=tacticalFormation(p,rules.rotation[team],phase,ball.z);if(chosen===p)dest=selection.target;const dx=dest.x-p.x,dz=dest.z-p.z,d=Math.hypot(dx,dz);if(d>.12){p.x+=dx/d*Math.min(d,speed*dt);p.z+=dz/d*Math.min(d,speed*dt);p.facing=Math.atan2(dz,dx);p.anim+=dt*speed;p.action='run'}else p.action='idle';
 if(chosen===p&&p.cool<=0&&ball.live&&(team===0?ball.x<=0:ball.x>=0)&&dist(p,ball)<1.15&&ball.y<2.8&&ball.y>.45&&rules.last!==p.id){if(rules.side!==team||rules.touches<3){game.aiHit(p);p.cool=.5}}
 }} }


