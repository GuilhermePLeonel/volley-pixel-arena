import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';

const makeGame=(role='Ponteiro',notify=()=>{})=>
 new Game({role,difficulty:'Normal',quick:true,training:false},notify);
const frame=1/60;

test('o giro começa no contato, inverte nos toques seguintes e para sozinho',()=>{
 const g=makeGame(), b=g.ball;
 g.update(frame);
 assert.equal(b.angle,0);
 g.doServe();
 const serveSpin=b.spin;
 assert.notEqual(serveSpin,0);

 const receiver=g.players[8], setter=g.players[6];
 for(const player of [receiver,setter]){
  const previous=b.spin;
  Object.assign(b,{x:player.x,y:1.7,z:player.z});
  g.hitLock=0;
  assert.ok(g.contact(player,{x:2.2,z:0},.45));
  assert.equal(Math.sign(b.spin),-Math.sign(previous));
 }
 Object.assign(b,{vx:0,vy:0,vz:0,gravity:0});
 g.hitLock=10;
 for(let i=0;i<120;i++)g.update(frame);
 assert.equal(Math.abs(b.spin),0);
 assert.notEqual(b.angle,0);
 const angle=b.angle;
 g.update(frame);
 assert.equal(b.angle,angle);
});

test('o ponto final é marcado uma vez e a bola termina três quiques decrescentes',()=>{
 const events=[], g=makeGame('Ponteiro',event=>events.push(event));
 g.rules.points[1]=6;
 Object.assign(g.ball,{x:-5,y:.27,z:0,vx:-4,vy:-10,vz:1,gravity:9.8,live:true,targetTeam:0,spin:2});
 g.hitLock=10;
 g.update(frame);
 assert.equal(g.rules.over,true);
 assert.deepEqual(g.rules.sets,[0,1]);
 assert.equal(g.ball.live,false);
 assert.equal(g.ball.y,.24);

 const peaks=[];
 let peak=.24;
 for(let i=0;i<120;i++){
  g.update(frame);
  if(g.ball.y>.24)peak=Math.max(peak,g.ball.y);
  else if(peak>.24){peaks.push(peak);peak=.24;}
 }
 assert.equal(peaks.length,3);
 assert.ok(peaks[0]>peaks[1]&&peaks[1]>peaks[2]);
 assert.equal(g.ball.y,.24);
 assert.equal(g.ball.spin,0);
 assert.equal(events.filter(event=>event==='point').length,1);
 const position=[g.ball.x,g.ball.z];
 g.update(frame);
 assert.deepEqual([g.ball.x,g.ball.z],position);
});

test('a formação volta a encarar a rede e o saque usa sua pose própria',()=>{
 const g=makeGame('Levantador');
 for(const player of g.players){player.spriteBack=player.team===1;player.spriteMirror=true;}
 g.serve();
 for(const player of g.players){
  assert.equal(player.spriteBack,player.team===0);
  assert.equal(player.spriteMirror,false);
 }
 assert.equal(g.controlled.action,'serve-ready');
 g.special();
 g.update(frame);
 assert.equal(g.controlled.actionPose,'serve-ready');
 assert.ok(g.userServe({x:6,z:0},.7));
 assert.equal(g.controlled.actionPose,'serve');
});
