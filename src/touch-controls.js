// A circular dead zone keeps the player still when the stick is nearly centred.
export function joystickVector(dx,dy,radius,deadZone=.12){
 const distance=Math.hypot(dx,dy);
 if(!radius||distance<=radius*deadZone)return {x:0,y:0};
 const magnitude=Math.min(1,(distance/radius-deadZone)/(1-deadZone));
 return {x:dx/distance*magnitude,y:dy/distance*magnitude};
}

export function installTouchControls({stick,knob,jump,attack,tip,pause,canPlay,move,aim,beginShot,endShot,cancelShot,onJump,onPause}){
 let stickPointer=null,shotPointer=null,shotButton=null,shotOrigin=null,dragged=false;
 function clearStick(){stickPointer=null;knob.style.transform='translate(-50%,-50%)';move(0,0)}
 function clearShot(){shotPointer=null;shotButton=null;shotOrigin=null;dragged=false}
 function moveStick(e){
  if(e.pointerId!==stickPointer)return;
  let rect=stick.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.5;
  let vector=joystickVector(e.clientX-(rect.left+rect.width/2),e.clientY-(rect.top+rect.height/2),radius);
  knob.style.transform=`translate(calc(-50% + ${vector.x*radius*.65}px),calc(-50% + ${vector.y*radius*.65}px))`;
  move(vector.x,vector.y);
 }
 stick.addEventListener('pointerdown',e=>{if(!canPlay()||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)});
 stick.addEventListener('pointermove',moveStick);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,e=>{if(e.pointerId===stickPointer)clearStick()});
 jump.addEventListener('pointerdown',e=>{if(!canPlay())return;e.preventDefault();onJump()});
 pause.addEventListener('click',()=>{reset();onPause()});
 for(const [element,button] of [[attack,0],[tip,2]]){
  element.addEventListener('pointerdown',e=>{if(!canPlay()||shotPointer!==null)return;e.preventDefault();if(!beginShot(button))return;shotPointer=e.pointerId;shotButton=element;shotOrigin={x:e.clientX,y:e.clientY};dragged=false;element.setPointerCapture(e.pointerId);element.classList.add('pressed')});
  element.addEventListener('pointermove',e=>{if(e.pointerId!==shotPointer)return;if(Math.hypot(e.clientX-shotOrigin.x,e.clientY-shotOrigin.y)>8)dragged=true;if(dragged)aim(e.clientX,e.clientY)});
  element.addEventListener('pointerup',e=>{if(e.pointerId!==shotPointer)return;if(dragged)aim(e.clientX,e.clientY);shotButton.classList.remove('pressed');clearShot();endShot()});
  for(const name of ['pointercancel','lostpointercapture'])element.addEventListener(name,e=>{if(e.pointerId!==shotPointer)return;shotButton.classList.remove('pressed');clearShot();cancelShot()});
 }
 function reset(){clearStick();if(shotButton)shotButton.classList.remove('pressed');clearShot();cancelShot()}
 return {reset};
}
