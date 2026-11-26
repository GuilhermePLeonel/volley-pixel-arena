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
 else {let setterSlot=(6-rotation)%6,setterBack=setterSlot===0||setterSlot>=4;x=p.role==='Central'||p.role==='Líbero'?-6.8:-6.5;z=p.role==='Líbero'?(setterBack?2:0):p.role==='Central'?0:p.role==='Oposto'?2.9:-2.8}
 return orient(p.team,x,z);
}
// The reception shape is entered only after the opponent's service hit.
export function serveReceiveFormation(p,rotation){
 let front=isFront(p,rotation),x,z;
 if(p.role==='Levantador'){x=front?-2.5:-7.1;z=front?2:2.2}
 else if(p.role==='Ponteiro'){x=front?-5.3:-6.7;z=front?-3:-2.4}
 else if(p.role==='Líbero'){x=-6;z=1}
 else if(front){x=-2;z=p.role==='Central'?0:3}
 else {x=-7;z=p.role==='Central'?2.8:0}
 return orient(p.team,x,z);
}export function attackSpot(p,rotation){let spot=tacticalFormation(p,rotation,'offense');if(!isFront(p,rotation))spot.x=p.team?4.3:-4.3;return spot}export function makePlayers(){return [0,1].flatMap(team=>roles.map((role,index)=>{let p={id:team*6+index,team,role,baseRole:role,index,y:0,vy:0,anim:0,facing:0,action:'idle',cool:0};return {...p,...formation(p,0)}}))}
export function chooseInterceptor(own,path,team,rules,speed,serveReceive=false){
 const candidates=path.filter(q=>(team===0?q.x<-.25:q.x>.25)&&q.y<2.85&&q.y>.45);
 let best=null;
 for(const p of own){if(p.id===rules.last||(serveReceive&&p.role==='Levantador'&&!isFront(p,rules.rotation[team])))continue;for(const q of candidates){if(rules.side===team&&rules.touches===2&&!isFront(p,rules.rotation[team])&&Math.abs(q.x)<3&&q.y>2.55)continue;let travel=dist(p,q)/speed;let penalty=rules.side===team&&rules.touches===1&&p.role!=='Levantador'?.8:rules.side!==team&&p.role==='Levantador'?2.2:0;let score=Math.max(0,travel-q.t)*3+q.t*.3+travel*.25+penalty;if(!best||score<best.score)best={player:p,target:q,score};}}
 return best;
}
// Keep an interceptor long enough to avoid rapid back-and-forth changes.
export function coordinateInterceptor(state,eligible,path,team,rules,speed,serveReceive,assigned,active,dt){
 const context=[active,rules.side,rules.touches,rules.last,serveReceive,assigned].join(':');
 if(state.context!==context){state.context=context;state.selection=null;state.timer=0}
 if(!active||!eligible.length){state.selection=null;state.timer=0;return null}
 state.timer-=dt;
 if(state.timer<=0){
  let best=chooseInterceptor(eligible,path,team,rules,speed,serveReceive);
  let current=state.selection&&chooseInterceptor(eligible.filter(p=>p.id===state.selection.player.id),path,team,rules,speed,serveReceive);
  // A challenger must be meaningfully better before changing the assignment.
  state.selection=current&&best&&current.score<=best.score+.8?current:best;
  if(state.selection)state.selection={...state.selection,target:{...state.selection.target}};
  state.timer=.18;
 }else if(state.selection){state.selection.target.t=Math.max(0,state.selection.target.t-dt)}
 return state.selection;
}
function moveSmoothly(p,dest,speed,dt){
 if(p.navX===undefined){p.navX=p.x;p.navZ=p.z;p.moveVX=0;p.moveVZ=0;p.moving=false}
 let follow=1-Math.exp(-7*dt);p.navX+=(dest.x-p.navX)*follow;p.navZ+=(dest.z-p.navZ)*follow;
 let dx=p.navX-p.x,dz=p.navZ-p.z,d=Math.hypot(dx,dz),targetSpeed=d>.16?Math.min(speed,(d-.16)*5):0;
 let ax=d?dx/d*targetSpeed:0,az=d?dz/d*targetSpeed:0,smooth=1-Math.exp(-10*dt);
 p.moveVX+=(ax-p.moveVX)*smooth;p.moveVZ+=(az-p.moveVZ)*smooth;
 let vx=p.moveVX,vz=p.moveVZ,step=Math.hypot(vx,vz)*dt;
 if(step>d&&d<.3){p.x=p.navX;p.z=p.navZ;p.moveVX=0;p.moveVZ=0}else{p.x+=vx*dt;p.z+=vz*dt}
 let velocity=Math.hypot(p.moveVX,p.moveVZ);p.moving=p.moving?velocity>.24:velocity>.45;
 if(p.moving){let wanted=Math.atan2(p.moveVZ,p.moveVX),delta=Math.atan2(Math.sin(wanted-p.facing),Math.cos(wanted-p.facing));p.facing+=delta*(1-Math.exp(-7*dt));p.anim+=dt*velocity;p.action='run'}else p.action='idle';
}
export function updateAI(game,dt){
 const {players,ball,rules}=game,path=trajectory(ball);game.aiCoord||=[{},{}];
 for(const team of [0,1]){
  const own=players.filter(p=>p.team===team),speed=game.difficulty==='Fácil'?3.05:game.difficulty==='Difícil'?4.4:3.7;
  const assigned=game.setTarget?.team===team&&rules.side===team&&rules.touches===2?game.setTarget.playerId:null;
  const eligible=assigned===null?own:own.filter(p=>p.id===assigned);
  const selection=coordinateInterceptor(game.aiCoord[team],eligible,path,team,rules,speed,game.serveFlight,assigned,ball.targetTeam===team,dt),chosen=selection?.player;
  for(const p of own){
   if(p===game.controlled&&!game.liberoOff)continue;
   let phase=rules.side===team?'offense':'defense',receiving=game.serveFlight&&ball.targetTeam===team;
   let dest=receiving?serveReceiveFormation(p,rules.rotation[team]):tacticalFormation(p,rules.rotation[team],phase,ball.z);
   if(chosen===p&&!(receiving&&p.role==='Levantador'))dest=selection.target;
   if(chosen===p&&rules.side===team&&rules.touches===2&&isFront(p,rules.rotation[team])&&p.y===0&&p.vy===0&&selection.target.t<.38&&dist(p,selection.target)<1.5){p.vy=8.3;p.takeoffX=p.x;p.actionPose='attack';p.actionTime=.5}
   moveSmoothly(p,dest,speed,dt);
   if(chosen===p&&p.cool<=0&&ball.live&&(team===0?ball.x<=0:ball.x>=0)&&dist(p,ball)<.9&&ball.y<2.8&&ball.y>.45&&rules.last!==p.id){if(rules.side!==team||rules.touches<3){game.aiHit(p);p.cool=.5}}
  }
 }
}
