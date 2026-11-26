import * as THREE from 'three';
import {orient,rotations} from './tactics.js';
import {trajectory} from './physics.js';

export function installTacticalPanel({getGame,isActive,resetInput}){
 const panel=document.createElement('aside');
 panel.className='tactics-debug hidden';
 panel.setAttribute('aria-label','Depuração tática');
 panel.innerHTML='<div class="tactics-heading"><strong>Depuração 5×1</strong><button type="button" data-close aria-label="Fechar depuração">×</button></div>'+
  '<div class="tactics-controls"><label>Rotação<select data-rotation></select></label>'+
  '<label>Saque<select data-server><option value="0">Rino Finanças</option><option value="1">Adversário</option></select></label></div>'+
  '<div class="tactics-controls"><span>Simular ataque adversário</span>'+
  '<button type="button" data-zone="4">P4</button><button type="button" data-zone="3">P3</button><button type="button" data-zone="2">P2</button></div>'+
  '<div class="tactics-legend">Verde · recepção | Azul · defesa | Rosa · bloqueio | Amarelo · trajetória</div>'+
  '<div data-status></div><div class="tactics-players" data-players></div>';
 const by=selector=>panel.querySelector(selector);
 const rotation=by('[data-rotation]'), server=by('[data-server]');
 rotation.replaceChildren(...rotations.map((r,i)=>new Option(r.name,i)));
 const app=document.querySelector('#app');
 app.append(panel);
 const showButton=document.createElement('button');
 showButton.type='button';showButton.className='tactics-open hidden';showButton.textContent='Tática';
 app.append(showButton);
 let enabled=new URLSearchParams(location.search).get('tatica')==='1';
 let lastUpdate=0, wasVisible=false;
 function toggle(){
  if(!isActive())return;
  enabled=!enabled;
  sync();
 }
 function sync(){
  const active=isActive();
  const visible=enabled&&active;
  if(visible&&!wasVisible){
   const game=getGame();
   rotation.value=game.rules.rotation[0];server.value=game.rules.server;
   lastUpdate=0;
  }
  wasVisible=visible;
  panel.classList.toggle('hidden',!visible);
  showButton.classList.toggle('hidden',!active||visible||!new URLSearchParams(location.search).has('tatica'));
  getGame().debugTactics=visible;
 }
 function setup(){
  resetInput();
  getGame().debugSetup(Number(rotation.value),Number(server.value));
  lastUpdate=0;
 }
 by('[data-close]').onclick=toggle;
 showButton.onclick=toggle;
 rotation.onchange=server.onchange=setup;
 panel.querySelectorAll('[data-zone]').forEach(button=>button.onclick=()=>{
  resetInput();
  getGame().debugAttack(Number(button.dataset.zone));
  server.value='1';
  lastUpdate=0;
 });
 window.addEventListener('keydown',event=>{
  if(event.key==='F2'&&isActive()&&!event.repeat){event.preventDefault();toggle();}
 });
 return {sync,render(now){
  if(!wasVisible||now-lastUpdate<100)return;
  lastUpdate=now;
  const game=getGame(),{players,rules}=game;
  const phase=game.teamTactics.map((state,team)=>{
   const next=players.find(p=>p.id===state.next);
   const nextName=next?(game.playerName(next)??next.role+' P'+next.officialZone):'—';
   return game.teams[team].shortName+' · '+rotations[rules.rotation[team]].name+' · '+state.phase+' · próximo toque '+nextName;
  });
  by('[data-status]').textContent=phase.join('\n');
  by('[data-players]').textContent=players.map(p=>{
   const name=p.team?'Rival':game.playerName(p)??'Rino';
   const q=p.tacticalTarget;
   return name+' · '+p.role+' P'+p.officialZone+' '+(p.frontRow?'rede':'fundo')+
    ' · '+p.responsibility+' · '+(q?q.x.toFixed(1)+', '+q.z.toFixed(1):'—')+
    ' · '+(p.actionTime>0?p.actionPose:p.action)+(p.contactPriority?' ['+p.contactPriority+']':'');
  }).join('\n');
 }};
}

export class TacticalOverlay {
 constructor(scene){
  this.group=new THREE.Group();
  this.group.visible=false;
  scene.add(this.group);
  this.positions=new Float32Array(1600*3);
  this.colors=new Float32Array(this.positions.length);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));
  this.lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,depthTest:false,transparent:true,opacity:.87}));
  this.lines.frustumCulled=false;
  this.lines.renderOrder=5;
  this.group.add(this.lines);
 }
 segment(a,b,color,flat=true){
  const height=flat?.13:0;
  for(const p of [a,b]){
   const at=this.count++*3;
   this.positions[at]=p.x;this.positions[at+1]=height+(flat?0:p.y);this.positions[at+2]=p.z;
   this.colors[at]=color.r;this.colors[at+1]=color.g;this.colors[at+2]=color.b;
  }
 }
 update(game){
  this.group.visible=game.debugTactics;
  if(!game.debugTactics)return;
  const colors=debugColors;
  this.count=0;
  for(const state of game.teamTactics){
   for(const {team,x0,x1,z0,z1} of state.regions??[]){
    const points=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]].map(q=>orient(team,...q));
    for(let i=1;i<points.length;i++)this.segment(points[i-1],points[i],state.phase==='Recepção'?colors.receive:colors.defense);
   }
   if(state.settingGoal)this.cross(state.settingGoal,.31,colors.receive);
  }
  for(const p of game.players){
   const state=game.teamTactics[p.team],q=p.moveTarget;
   if(!q)continue;
   const selected=state.next===p.id, blocking=state.blockers?.includes(p.id);
   const color=blocking?colors.block:selected?colors.receive:p.team?colors.rival:colors.home;
   const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);
   if(d>.2){
    this.segment(p,q,color);
    for(const sign of [-1,1])this.segment(q,{x:q.x-.26*dx/d+sign*.14*dz/d,z:q.z-.26*dz/d-sign*.14*dx/d},color);
   }
   if(selected||blocking||p===game.controlled)this.cross(q,selected?.27:.18,color);
  }
  const path=game.ball.live?(game.prediction?.length?game.prediction:trajectory(game.ball)):[];
  for(let i=1;i<path.length;i++)this.segment(path[i-1],path[i],colors.ball,false);
  if(game.setTarget)this.cross(game.setTarget,.51,colors.receive);
  const geometry=this.lines.geometry;
  geometry.setDrawRange(0,this.count);
  geometry.attributes.position.needsUpdate=geometry.attributes.color.needsUpdate=true;
 }
 cross(q,r,color){
  this.segment({x:q.x-r,z:q.z},{x:q.x+r,z:q.z},color);
  this.segment({x:q.x,z:q.z-r},{x:q.x,z:q.z+r},color);
 }
}

const debugColors=Object.fromEntries(Object.entries({
 receive:0x87ff8f,defense:0x56b7ff,block:0xff75aa,ball:0xffff70,home:0xfbc291,rival:0xdbddff,
}).map(([name,value])=>[name,new THREE.Color(value)]));
