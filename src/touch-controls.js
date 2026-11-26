// A circular dead zone keeps both analog controls still near their centres.
export function joystickVector(dx,dy,radius,deadZone=.12){
 const distance=Math.hypot(dx,dy);
 if(!radius||distance<=radius*deadZone)return {x:0,y:0};
 const magnitude=Math.min(1,(distance/radius-deadZone)/(1-deadZone));
 return {x:dx/distance*magnitude,y:dy/distance*magnitude};
}

export function installTouchControls({stick,knob,attack,aimKnob,chargeFill,chargeValue,tip,pause,canPlay,move,aim,beginShot,endShot,cancelShot,onJump,onPause}){
 let stickPointer=null,stickOrigin=null,stickMoved=false,stickStart=0;
 let shotPointer=null,shotButton=null,shotOrigin=null,shotVector={x:0,y:0},aimApplied=false;
 const maxTapTime=260,dragThreshold=10;
 function clearStick(){stickPointer=null;stickOrigin=null;stickMoved=false;knob.style.transform='translate(-50%,-50%)';move(0,0)}
 function clearShot(){shotPointer=null;shotButton=null;shotOrigin=null;shotVector={x:0,y:0};aimApplied=false;aimKnob.style.transform='translate(-50%,-50%)'}
 function setPower(power){
  power=Math.max(0,Math.min(1,power));
  chargeFill.style.transform=`translate(-50%,-50%) scale(${.3+power*.7})`;
  chargeFill.style.background=power>=1?'#fff2a3':power>=.7?'#ffac4e':'#dfff69';
  chargeValue.textContent=`${Math.round(power*100)}%`;
 }
 function moveStick(e){
  if(e.pointerId!==stickPointer)return;
  let dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y;
  if(Math.hypot(dx,dy)>dragThreshold)stickMoved=true;
  if(!stickMoved)return;
  let rect=stick.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.5;
  let vector=joystickVector(dx,dy,radius);
  knob.style.transform=`translate(calc(-50% + ${vector.x*radius*.65}px),calc(-50% + ${vector.y*radius*.65}px))`;
  move(vector.x,vector.y);
 }
 stick.addEventListener('pointerdown',e=>{if(!canPlay()||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stickOrigin={x:e.clientX,y:e.clientY};stickMoved=false;stickStart=e.timeStamp;stick.setPointerCapture(e.pointerId)});
 stick.addEventListener('pointermove',moveStick);
 stick.addEventListener('pointerup',e=>{if(e.pointerId!==stickPointer)return;const tap=!stickMoved&&Math.hypot(e.clientX-stickOrigin.x,e.clientY-stickOrigin.y)<=dragThreshold&&e.timeStamp-stickStart<=maxTapTime;clearStick();if(tap&&canPlay())onJump()});
 for(const name of ['pointercancel','lostpointercapture'])stick.addEventListener(name,e=>{if(e.pointerId===stickPointer)clearStick()});
 pause.addEventListener('click',()=>{reset();onPause()});
 for(const [element,button] of [[attack,0],[tip,2]]){
  element.addEventListener('pointerdown',e=>{if(!canPlay()||shotPointer!==null)return;e.preventDefault();if(!beginShot(button))return;shotPointer=e.pointerId;shotButton=element;shotOrigin={x:e.clientX,y:e.clientY};shotVector={x:0,y:0};aimApplied=false;element.setPointerCapture(e.pointerId);element.classList.add('pressed')});
  element.addEventListener('pointermove',e=>{if(e.pointerId!==shotPointer)return;let rect=element.getBoundingClientRect();let radius=Math.min(rect.width,rect.height)*.23;shotVector=joystickVector(e.clientX-shotOrigin.x,e.clientY-shotOrigin.y,radius,.08);if(element===attack)aimKnob.style.transform=`translate(calc(-50% + ${shotVector.x*rect.width*.18}px),calc(-50% + ${shotVector.y*rect.height*.18}px))`});
  element.addEventListener('pointerup',e=>{if(e.pointerId!==shotPointer)return;if(!aimApplied&&(shotVector.x||shotVector.y))aim(shotVector.x,shotVector.y,1/60);shotButton.classList.remove('pressed');clearShot();endShot();setPower(0)});
  for(const name of ['pointercancel','lostpointercapture'])element.addEventListener(name,e=>{if(e.pointerId!==shotPointer)return;shotButton.classList.remove('pressed');clearShot();cancelShot();setPower(0)});
 }
 function update(dt){if(shotPointer!==null&&(shotVector.x||shotVector.y)&&canPlay()){aim(shotVector.x,shotVector.y,dt);aimApplied=true}}
 function reset(){clearStick();if(shotButton)shotButton.classList.remove('pressed');clearShot();cancelShot();setPower(0)}
 setPower(0);
 return {reset,update,setPower};
}
