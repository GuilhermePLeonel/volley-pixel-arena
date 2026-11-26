import test from 'node:test';
import assert from 'node:assert/strict';
import {courtAim,joystickVector,installTouchControls} from '../src/touch-controls.js';
import {Game} from '../src/game.js';

test('mira móvel prende os dois eixos nas linhas da quadra',()=>{
 assert.deepEqual(courtAim({x:-18,z:12}),{x:-9,z:4.5});
 assert.deepEqual(courtAim({x:12,z:-7}),{x:9,z:-4.5});
 assert.deepEqual(courtAim({x:-6,z:2}),{x:-6,z:2});
});

test('direcional tem zona morta, limite circular e movimento proporcional',()=>{
 assert.deepEqual(joystickVector(4,0,50),{x:0,y:0});
 const middle=joystickVector(25,0,50),edge=joystickVector(100,100,50);
 assert.ok(middle.x>0&&middle.x<1);
 assert.ok(Math.abs(Math.hypot(edge.x,edge.y)-1)<1e-9);
 assert.equal(edge.x,edge.y);
});

function element(){
 const listeners={};
 return {style:{},classList:{add(){},remove(){}},addEventListener(type,fn){(listeners[type]??=[]).push(fn)},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}},emit(type,values={}){for(const fn of listeners[type]||[])fn({pointerId:1,clientX:50,clientY:50,button:0,detail:1,preventDefault(){},...values})}};
}
test('analógico responde a arrastes pequenos e apenas o botão separado pula',()=>{
 const stick=element(),knob=element(),attack=element(),aimKnob=element(),jump=element(),pause=element();
 const moves=[],jumps=[];
 let active=true;
 installTouchControls({stick,knob,attack,aimKnob,jump,pause,
  canPlay:()=>active,move:(x,y)=>moves.push([x,y]),aim:()=>{},beginAim:()=>true,endAim:()=>{},
  cancelAim:()=>{},onJump:()=>jumps.push('jump'),onPause:()=>{}});
 stick.emit('pointerdown');stick.emit('pointerup');
 assert.equal(jumps.length,0);
 stick.emit('pointerdown');
 stick.emit('pointermove',{clientX:57});
 assert.ok(moves.at(-1)[0]>0);
 jump.emit('pointerdown',{pointerId:2});
 jump.emit('click');
 assert.equal(jumps.length,1);
 assert.ok(moves.at(-1)[0]>0);
 stick.emit('pointercancel');
 assert.deepEqual(moves.at(-1),[0,0]);
 jump.emit('click',{detail:0});
 assert.equal(jumps.length,2);
 active=false;
 jump.emit('pointerdown');jump.emit('click',{detail:0});
 assert.equal(jumps.length,2);
});

test('movimento, pulo e mira podem ocorrer antes de soltar para tocar',()=>{
 const stick=element(),knob=element(),attack=element(),aimKnob=element(),jump=element(),pause=element();
 const moves=[],aims=[],actions=[];
 const controls=installTouchControls({stick,knob,attack,aimKnob,jump,pause,
  canPlay:()=>true,move:(x,y)=>moves.push([x,y]),aim:(x,y,dt)=>aims.push([x,y,dt]),beginAim:()=>(actions.push('begin'),true),
  endAim:()=>actions.push('end'),cancelAim:()=>actions.push('cancel'),onJump:()=>actions.push('jump'),onPause:()=>actions.push('pause')});
 stick.emit('pointerdown',{pointerId:1,clientX:50});stick.emit('pointermove',{pointerId:1,clientX:90});
 attack.emit('pointerdown',{pointerId:2,clientX:300,clientY:600});
 attack.emit('pointermove',{pointerId:2,clientX:320,clientY:600});controls.update(.1);
 assert.ok(moves.at(-1)[0]>0);assert.ok(aims.at(-1)[0]>.8);assert.equal(aims.at(-1)[1],0);assert.equal(aims.at(-1)[2],.1);
 jump.emit('pointerdown',{pointerId:3});
 assert.deepEqual(actions,['begin','jump']);
 assert.ok(moves.at(-1)[0]>0);
 attack.emit('pointerup',{pointerId:2,clientX:320,clientY:600});
 assert.deepEqual(actions,['begin','jump','end']);
 stick.emit('pointerup',{pointerId:1});assert.deepEqual(moves.at(-1),[0,0]);
 attack.emit('pointerdown',{pointerId:4});attack.emit('pointercancel',{pointerId:4});
 assert.deepEqual(actions.slice(-2),['begin','cancel']);
 controls.reset();assert.deepEqual(moves.at(-1),[0,0]);
});

test('movimento pelo analógico é 10% mais veloz no mesmo deslocamento e teclado conserva sua velocidade',()=>{
 function speed({strength=0,keys={}}){
  const g=new Game({role:'Ponteiro',athlete:'leonel',difficulty:'Normal',quick:true},()=>{});
  Object.assign(g.ball,{live:true,targetTeam:1,x:4,y:3});
  Object.assign(g.controlled,{x:-5,z:0});
  g.touchMove={x:strength,y:0};g.keys=keys;
  g.update(1/60);
  return Math.abs(g.controlled.z)*60;
 }
 for(const strength of [.1,.3,1]){
  const original=(3.4+1.8*strength)*strength;
  assert.ok(Math.abs(speed({strength})/original-1.1)<1e-9);
 }
 assert.equal(speed({keys:{d:true}}),3.4);
 assert.equal(speed({keys:{d:true,shift:true}}),5.2);
});
