import {clamp,dist} from './physics.js';

// Official order by athlete index. The UI and the sprites keep their existing IDs.
export const serviceOrder=[0,2,1,3,5,4];
export const rotationSlot=(p,rotation)=>(serviceOrder.indexOf(p.index)-rotation+6)%6;
export const officialZone=(p,rotation)=>rotationSlot(p,rotation)+1;
export const serverIndex=rotation=>serviceOrder[rotation%6];
export const isFront=(p,rotation)=>{const slot=rotationSlot(p,rotation);return slot>=1&&slot<=3};
export const orient=(team,x,z)=>({x:team?-x:x,z:team?-z:z});
const localZ=(team,z)=>team?-z:z;

// Entries are by official zone (1 through 6), in metres from the net and centre.
// Approach lanes and cover assignments are tactical choices, not rotation rules.
export const rotations=[
 {name:'P1',receive:[[-5.7,3.9],[-5.15,2.6],[-1.7,.4],[-2.1,-2.8],[-6.2,-2.9],[-6.25,-.1]],
  serve:[[-10.4,2.8],[-2,-3.2],[-1.65,0],[-1.9,3.2],[-6.6,-2.9],[-6.55,.55]],
  attack:[-2.05,-3.2,0,3.25], backAttack:[-4.35,-.15,2.85], short:[-2.7,-3.1],
  entry:[[-3.65,3.55]], receiveLanes:{2:3.25,4:-3.25}, deep:[-7.25,-6.6,-6.15], cover:2},
 {name:'P6',receive:[[-6.3,3.1],[-1.6,2.45],[-1.9,.5],[-5.15,-2.9],[-6.6,-1.5],[-3.45,1.25]],
  serve:[[-10.4,2.8],[-1.65,0],[-1.9,3.15],[-2,-3.25],[-6.6,-.45],[-6.85,3]],
  attack:[-2.2,-3.25,-.15,3.15], backAttack:[-4.45,.1,2.7], short:[-2.55,-3.15],
  entry:[[-2.4,1.6]], receiveLanes:{3:3.1,4:-3.25}, deep:[-6.8,-7.05,-6.25], cover:2},
 {name:'P5',receive:[[-6.25,3.1],[-1.7,2.5],[-4.75,-.35],[-1.9,-3.45],[-2.55,-3.65],[-6.45,.2]],
  serve:[[-10.4,2.8],[-1.9,3.2],[-2,-3.2],[-1.65,0],[-6.85,2.9],[-6.35,-2.8]],
  attack:[-2.1,-3.1,.15,3.2], backAttack:[-4.3,.2,2.8], short:[-2.85,-3.25],
  entry:[[-1.95,-2.9],[-1.45,.25]], receiveLanes:{2:3.25,3:-3.15,4:-.65}, deep:[-7.05,-6.6,-6.45], liberoLane:-1, cover:3},
 {name:'P4',receive:[[-6.7,3.45],[-5.05,2.4],[-1.8,-.35],[-1.25,-3.2],[-6.35,-2.75],[-6.3,.1]],
  serve:[[-10.4,2.8],[-2,-3.15],[-1.65,0],[-1.7,2.9],[-6.75,-2.75],[-6.55,.4]],
  attack:[-2.1,-3.25,-.2,3.25], backAttack:[-4.5,.15,2.8], short:[-2.6,-3.2],
  entry:[[-1.2,-1]], receiveLanes:{2:3.0,3:-.45}, deep:[-6.65,-7.2,-6.45], liberoLane:-1, cover:3},
 {name:'P3',receive:[[-6.25,3.2],[-1.65,2.4],[-1.35,.15],[-5.05,-3.1],[-6.4,-2.45],[-6.8,.5]],
  serve:[[-10.4,2.8],[-1.65,0],[-1.7,2.9],[-2,-3.15],[-6.6,-.65],[-6.85,3]],
  attack:[-2.2,-3.2,.3,3.2], backAttack:[-4.35,-.2,2.9], short:[-2.75,-3.05],
  entry:[[-1.3,1]], receiveLanes:{2:1.0,4:-3.25}, deep:[-6.9,-6.5,-7.05], cover:2},
 {name:'P2',receive:[[-6.35,3.1],[-1.4,2.55],[-5.1,.45],[-1.95,-2.55],[-6.8,-3.3],[-6.4,-.55]],
  serve:[[-10.4,2.8],[-1.7,2.9],[-2,-3.2],[-1.65,0],[-6.85,3],[-6.55,-2.8]],
  attack:[-2.15,-3.25,-.2,3.3], backAttack:[-4.4,.35,2.75], short:[-2.65,-3.2],
  entry:[], receiveLanes:{3:-2.85,4:-.65}, deep:[-7.15,-6.55,-6.7], cover:3},
];

function preset(p,rotation,key){
 return orient(p.team,...rotations[rotation][key][rotationSlot(p,rotation)]);
}
export const receptionFormation=(p,rotation)=>preset(p,rotation,'receive');
export const servingFormation=(p,rotation)=>preset(p,rotation,'serve');
export const settingZone=team=>orient(team,-1.25,1.65);

export function legalReception(players,team,rotation){
 const lineup=new Map(players.filter(p=>p.team===team).map(p=>[officialZone(p,rotation),p]));
 const sign=team?-1:1;
 const boundary=.22; // The simulation tracks foot centres rather than individual feet.
 if(lineup.size!==6)return false;
 for(const p of lineup.values()){
  if(p.x*sign>boundary||p.x*sign<-9-boundary||Math.abs(p.z)>4.5+boundary)return false;
 }
 for(const [front,back] of [[2,1],[3,6],[4,5]]){
  if((lineup.get(front).x-lineup.get(back).x)*sign<-boundary)return false;
 }
 for(const [left,centre,right] of [[4,3,2],[5,6,1]]){
  if((lineup.get(centre).z-lineup.get(left).z)*sign<-boundary ||
     (lineup.get(right).z-lineup.get(centre).z)*sign<-boundary)return false;
 }
 return true;
}

export function preferredPosition(p,rotation,phase='offense',attackZ=0){
 const front=isFront(p,rotation), z=localZ(p.team,attackZ), profile=rotations[rotation];
 if(phase==='defense'){
  if(front){
   const lane=p.role==='Ponteiro'?-3.05:p.role==='Central'?clamp(z*.25,-.9,.9):3.05;
   return orient(p.team,-1.15,lane);
  }
  const side=p.role==='Líbero'?(profile.liberoLane??0):p.role==='Ponteiro'?-1:1;
  const depth=profile.deep[side+1];
  return orient(p.team,depth,clamp(side*2.7+z*.12,-3.8,3.8));
 }
 if(p.role==='Levantador')return settingZone(p.team);
 if(front){
  const [depth,entry,,exit]=profile.attack;
  return orient(p.team,depth,p.role==='Ponteiro'?entry:p.role==='Oposto'?exit:0);
 }
 if(p.role==='Líbero'||p.role==='Central')return orient(p.team,-6.85,rotation<3?1.65:.25);
 return orient(p.team,-6.5,p.role==='Ponteiro'?-2.8:2.85);
}

export function attackOption(p,rotation,firstAttack,passQuality=1){
 if(p.role==='Líbero'||p.role==='Levantador')return null;
 const front=isFront(p,rotation),zone=officialZone(p,rotation);
 if(!front&&p.role==='Central')return null;
 const [depth,,middle]=rotations[rotation].attack;
 const preferred=p.role==='Central'?middle:localZ(p.team,preferredPosition(p,rotation).z);
 const lane=firstAttack?(rotations[rotation].receiveLanes[zone]??preferred):preferred;
 if(!front){
  const pipe=p.role==='Ponteiro';
  const [depth,pipeLane,rightLane]=rotations[rotation].backAttack;
  return {kind:pipe?'Pipe (P6)':'Fundo (P1)',spot:orient(p.team,depth,pipe?pipeLane:rightLane),height:1.74,time:1.43,back:true};
 }
 if(p.role==='Central'&&passQuality>.65){
  const behind=zone===2&&rotation>=3;
  return {kind:behind?'Bola atrás':'Rápida de meio',spot:orient(p.team,depth+.25,behind?2.05:clamp(lane,-.65,.65)),height:1.8,time:1.02};
 }
 const fast=passQuality>.78&&p.role==='Ponteiro';
 return {kind:fast?(lane<0?'Chutada na entrada':'Chutada na saída'):p.role==='Central'?'Alta no meio':lane<0?'Alta na entrada':'Alta na saída',
  spot:orient(p.team,depth+.19,lane),height:1.72,time:fast?1.22:1.64};
}

export function attackSpot(p,rotation){
 return attackOption(p,rotation,false)?.spot??preferredPosition(p,rotation);
}

export function approachFor(player,option,seconds){
 const depth=player.team?1:-1;
 return {...option.spot,x:option.spot.x+depth*clamp((seconds-.3)*1.5,0,1.25)};
}

export function infiltrationTarget(player,rotation,state,goal){
 const waypoints=rotations[rotation].entry;
 state.entryIndex??=0;
 while(state.entryIndex<waypoints.length){
  const next=orient(player.team,...waypoints[state.entryIndex]);
  const reached=dist(player,next)<.65;
  const pastWaypoint=Math.abs(player.x)<Math.abs(next.x)-.55;
  if(reached||pastWaypoint||dist(player,goal)<1.15)state.entryIndex++;
  else return next;
 }
 return goal;
}
