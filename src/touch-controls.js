import {clamp} from './physics.js';

export function courtAim({x,z}){
 return {x:clamp(x,-9,9),z:clamp(z,-4.5,4.5)};
}

// A circular dead zone keeps both analog controls still near their centres.
export function joystickVector(dx,dy,radius,deadZone=.12){
 const distance=Math.hypot(dx,dy);
 if(!radius||distance<=radius*deadZone)return {x:0,y:0};
 const magnitude=Math.min(1,(distance/radius-deadZone)/(1-deadZone));
 return {x:dx/distance*magnitude,y:dy/distance*magnitude};
}

export function installTouchControls({stick,knob,attack,aimKnob,chargeFill,chargeValue,jump,pause,canPlay,move,aim,beginShot,endShot,cancelShot,onJump,onPause}){
 let stickPointer=null,stickOrigin=null;
 let shotPointer=null,shotOrigin=null,shotVector={x:0,y:0},aimApplied=false;
 function clearStick(){
  stickPointer=null;stickOrigin=null;
  knob.style.transform='translate(-50%,-50%)';
  move(0,0);
 }
 function clearShot(){
  shotPointer=null;shotOrigin=null;shotVector={x:0,y:0};aimApplied=false;
  attack.classList.remove('pressed');
  aimKnob.style.transform='translate(-50%,-50%)';
 }
 function setPower(power){
  power=Math.max(0,Math.min(1,power));
  chargeFill.style.transform=`translate(-50%,-50%) scale(${.3+power*.7})`;
  chargeFill.style.background=power>=1?'var(--power-max)':power>=.7?'var(--power-strong)':'var(--accent)';
  chargeValue.textContent=`${Math.round(power*100)}%`;
 }
 function moveStick(e){
  if(e.pointerId!==stickPointer)return;
  const dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y;
  const rect=stick.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.5;
  const vector=joystickVector(dx,dy,radius);
  knob.style.transform=`translate(calc(-50% + ${vector.x*radius*.65}px),calc(-50% + ${vector.y*radius*.65}px))`;
  move(vector.x,vector.y);
 }
 stick.addEventListener('pointerdown',e=>{
  if(!canPlay()||stickPointer!==null)return;
  e.preventDefault();
  stickPointer=e.pointerId;stickOrigin={x:e.clientX,y:e.clientY};
  stick.setPointerCapture(e.pointerId);
 });
 stick.addEventListener('pointermove',moveStick);
 for(const name of ['pointerup','pointercancel','lostpointercapture']){
  stick.addEventListener(name,e=>{if(e.pointerId===stickPointer)clearStick()});
 }
 jump.addEventListener('pointerdown',e=>{
  if(e.button!==0||!canPlay())return;
  e.preventDefault();
  onJump();
 });
 // Keyboard and assistive technology activate the native button without a pointer event.
 jump.addEventListener('click',e=>{if(e.detail===0&&canPlay())onJump()});
 pause.addEventListener('click',()=>{reset();onPause()});
 attack.addEventListener('pointerdown',e=>{
  if(!canPlay()||shotPointer!==null)return;
  e.preventDefault();
  if(!beginShot())return;
  shotPointer=e.pointerId;shotOrigin={x:e.clientX,y:e.clientY};
  attack.setPointerCapture(e.pointerId);
  attack.classList.add('pressed');
 });
 attack.addEventListener('pointermove',e=>{
  if(e.pointerId!==shotPointer)return;
  const rect=attack.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.23;
  shotVector=joystickVector(e.clientX-shotOrigin.x,e.clientY-shotOrigin.y,radius,.08);
  aimKnob.style.transform=`translate(calc(-50% + ${shotVector.x*rect.width*.18}px),calc(-50% + ${shotVector.y*rect.height*.18}px))`;
 });
 attack.addEventListener('pointerup',e=>{
  if(e.pointerId!==shotPointer)return;
  if(!aimApplied&&(shotVector.x||shotVector.y))aim(shotVector.x,shotVector.y,1/60);
  clearShot();endShot();setPower(0);
 });
 for(const name of ['pointercancel','lostpointercapture']){
  attack.addEventListener(name,e=>{
   if(e.pointerId!==shotPointer)return;
   clearShot();cancelShot();setPower(0);
  });
 }
 function update(dt){if(shotPointer!==null&&(shotVector.x||shotVector.y)&&canPlay()){aim(shotVector.x,shotVector.y,dt);aimApplied=true}}
 function reset(){clearStick();clearShot();cancelShot();setPower(0)}
 setPower(0);
 return {reset,update,setPower};
}
