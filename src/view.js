import xandaoSprite from './assets/xandao-quadra.png';
import {TacticalOverlay} from './tactical-debug.js';
import * as THREE from 'three';
import {Stands} from './stands.js';
import {makeBallTexture,addRefereeStand} from './court-art.js';
import coachCelebration from './assets/jefferson-reaction.webp';
import originalAtlas from './assets/volley-original.png';
import coachSprite from './assets/atletas/jefferson.webp';
const athleteSprites=import.meta.glob('./assets/atletas/*.{png,webp}',{eager:true,query:'?url',import:'default'});
import {teamUniform} from './sprite-variants.js';
import {athleteById} from './roster.js';
const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
export class View{
 constructor(host,players){this.host=host;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x101010);this.camera=new THREE.PerspectiveCamera(38,1,.1,120);this.camera.position.set(-27,20,.01);this.camera.lookAt(0,0,0);this.cameraYaw=0;this.lastRender=performance.now();this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(this.renderer.domElement);this.scene.add(new THREE.HemisphereLight(0xf5f3ef,0x574132,2));let light=new THREE.DirectionalLight(0xfff2df,2.3);light.position.set(-6,20,9);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-16;light.shadow.camera.right=16;light.shadow.camera.top=16;light.shadow.camera.bottom=-16;this.scene.add(light);this.buildCourt();this.tacticalOverlay=new TacticalOverlay(this.scene);this.stands=new Stands(this.scene);let loader=new THREE.TextureLoader();this.atlases={original:loader.load(originalAtlas)};for(const [path,url] of Object.entries(athleteSprites)){let id=path.split('/').pop().replace(/\.(png|webp)$/,'');if(id!=='jefferson')this.atlases[id]=loader.load(url)}
  this.uniforms=new Map();
  this.rivalCoachFrames=new Map();
  this.coachIdle=this.loadSprite(loader,coachSprite);
  this.xandao=this.loadSprite(loader,xandaoSprite);
  this.coachCheer=this.loadSprite(loader,coachCelebration);
  this.coaches=[0,1].map(side=>this.makeCoach(side));
  addRefereeStand(this.scene,(...args)=>this.box(...args));for(const texture of Object.values(this.atlases)){texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace}this.playerMeshes=players.map(p=>this.makePlayer(p));let bt=makeBallTexture();let ball=new THREE.Sprite(new THREE.SpriteMaterial({map:bt,transparent:true,depthWrite:false}));ball.scale.set(.52,.52,1);this.scene.add(ball);this.ball=ball;this.createWarmupArt();this.ballShadow=this.shadow(.3);this.createImpact();this.createCometTrail();this.createSetIndicator();this.aim=new THREE.Mesh(new THREE.RingGeometry(.3,.38,32),new THREE.MeshBasicMaterial({color:0xfff4e7,side:THREE.DoubleSide,transparent:true,opacity:.8}));this.aim.rotation.x=-Math.PI/2;this.aim.position.y=.035;this.scene.add(this.aim);this.line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xfff4e7,transparent:true,opacity:.55}));this.scene.add(this.line);this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.resize();window.addEventListener('resize',()=>this.resize())}
 createCometTrail(){let canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;let ctx=canvas.getContext('2d');let glow=ctx.createRadialGradient(32,32,1,32,32,30);glow.addColorStop(0,'rgba(255,255,230,1)');glow.addColorStop(.22,'rgba(255,215,82,.9)');glow.addColorStop(.55,'rgba(255,105,24,.48)');glow.addColorStop(1,'rgba(255,65,10,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);let texture=new THREE.CanvasTexture(canvas);this.trail=[];this.trailPoints=[];this.trailClock=0;for(let i=0;i<12;i++){let sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));sprite.visible=false;this.scene.add(sprite);this.trail.push(sprite)}}
 updateCometTrail(game,dt){let b=game.ball;if(b.live&&b.comet){this.trailClock+=dt;if(this.trailClock>=.025||this.trailPoints.length===0){this.trailClock=0;this.trailPoints.unshift({x:b.x,y:b.y,z:b.z});this.trailPoints.length=Math.min(this.trailPoints.length,this.trail.length)}}else{this.trailPoints.length=0;this.trailClock=0}for(let i=0;i<this.trail.length;i++){let sprite=this.trail[i],point=this.trailPoints[i];sprite.visible=!!point;if(point){let fade=1-i/this.trail.length;sprite.position.set(point.x,point.y,point.z);sprite.scale.setScalar(.2+.48*fade);sprite.material.opacity=.68*fade}}}
 createSetIndicator(){
  this.setArea=new THREE.Group();let disc=new THREE.Mesh(new THREE.CircleGeometry(.95,32),new THREE.MeshBasicMaterial({color:0x49e77c,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;this.setArea.add(disc);let edge=new THREE.Mesh(new THREE.RingGeometry(.91,.98,32),new THREE.MeshBasicMaterial({color:0x88ffab,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false}));edge.rotation.x=-Math.PI/2;edge.position.y=.01;this.setArea.add(edge);this.setArea.visible=false;this.scene.add(this.setArea);
  this.setLabelCanvas=document.createElement('canvas');this.setLabelCanvas.width=256;this.setLabelCanvas.height=64;this.setLabelTexture=this.texture(this.setLabelCanvas);this.setLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:this.setLabelTexture,transparent:true,depthWrite:false,depthTest:false}));this.setLabel.scale.set(2.6,.65,1);this.setLabel.renderOrder=15;this.setLabel.visible=false;this.scene.add(this.setLabel);this.setLabelText='';
 }
 updateSetIndicator(game){let target=game.setTarget,player=target&&game.players.find(p=>p.id===target.playerId);let visible=!!(target&&player&&game.ball.live);this.setArea.visible=visible;this.setLabel.visible=visible;if(!visible)return;this.setArea.position.set(target.x,.105,target.z);this.setLabel.position.set(player.x,player.y+1.95,player.z);let name=player===game.controlled&&!game.liberoOff?'PARA VOCÊ':(player.team===0?'':'RIVAL · ')+(game.playerName(player)??(player.role+' #'+(player.index+1))).toUpperCase();if(name!==this.setLabelText){this.setLabelText=name;let c=this.setLabelCanvas,x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='rgba(14,49,31,.92)';x.fillRect(0,5,256,52);x.fillStyle='#89ffab';x.font='bold 25px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(name,128,32,242);this.setLabelTexture.needsUpdate=true}} createImpact(){let c=document.createElement('canvas');c.width=48;c.height=48;let x=c.getContext('2d');x.fillStyle='#ff853a';x.fillRect(19,1,10,46);x.fillRect(1,19,46,10);x.fillRect(8,8,32,32);x.clearRect(8,8,8,8);x.clearRect(32,8,8,8);x.clearRect(8,32,8,8);x.clearRect(32,32,8,8);x.fillStyle='#ffe66b';x.fillRect(15,8,18,32);x.fillRect(8,15,32,18);x.fillStyle='#fffbed';x.fillRect(16,16,16,16);let t=this.texture(c);this.impact=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,depthTest:false}));this.impact.visible=false;this.impact.renderOrder=20;this.impactTime=0;this.scene.add(this.impact)}
 loadSprite(loader,url){
  const texture=loader.load(url);
  texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.NearestFilter;
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
 }
 uniformTexture(athleteId,team,libero=false){
  const base=this.atlases[athleteId]||this.atlases.original;
  if(!base.image)return null;
  const key=team.id+':'+athleteId+':'+libero;
  if(!this.uniforms.has(key)){
   const whiteBase=athleteById(athleteId)?.role==='Líbero';
   this.uniforms.set(key,this.texture(teamUniform(base.image,team,{libero,whiteBase})));
  }
  return this.uniforms.get(key);
 }
 rivalCoachFrame(athleteId,team,cheering){
  const atlas=this.uniformTexture(athleteId,team);
  if(!atlas)return null;
  const key=cheering?'cheering':'standing';
  if(!this.rivalCoachFrames.has(key)){
   const canvas=document.createElement('canvas');
   const size=atlas.image.width/12;
   canvas.width=canvas.height=size;
   const [column,row]=cheering?[7,6]:[10,8];
   canvas.getContext('2d').drawImage(atlas.image,column*size,row*size,size,size,0,0,size,size);
   this.rivalCoachFrames.set(key,this.texture(canvas));
  }
  return this.rivalCoachFrames.get(key);
 }
 makeCoach(side){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.coachIdle,transparent:true,depthWrite:false}));
  sprite.center.set(.5,.1);
  sprite.scale.set(1.7,1.95,1);
  sprite.position.set(side?7:-7,.1,side?6.1:-6.1);
  this.scene.add(sprite);
  return {sprite,reaction:0};
 }
 showCoachReaction(side,xandao){
  if(this.coaches[side])this.coaches[side].reaction=side===1&&xandao?2.3:1.7;
 }
 resetMatchArt(){
  for(const coach of this.coaches)coach.reaction=0;
  for(const textures of [this.uniforms,this.rivalCoachFrames]){
   for(const texture of textures.values())texture.dispose();
   textures.clear();
  }
 }
 updateCoaches(game,dt){
  this.coaches.forEach((coach,side)=>{
   coach.reaction=Math.max(0,coach.reaction-dt);
   const cheering=coach.reaction>0;
   const texture=side===0?(game.xandao?this.xandao:cheering?this.coachCheer:this.coachIdle):
    this.rivalCoachFrame(game.rivalRoster.coach,game.teams[1],cheering);
   coach.sprite.visible=!!texture;
   if(texture)coach.sprite.material.map=texture;
  });
 }
 createWarmupArt(){
  this.coachBubble=document.createElement('div');
  this.coachBubble.className='coach-speech';
  this.coachBubble.setAttribute('role','status');
  this.coachBubble.hidden=true;
  this.host.appendChild(this.coachBubble);
  this.stagePoint=new THREE.Vector3();
  this.apexCue=document.createElement('div');
  this.apexCue.className='apex-cue';
  this.apexCue.setAttribute('aria-hidden','true');
  this.apexCue.hidden=true;
  this.host.appendChild(this.apexCue);
  this.warmupBalls=Array.from({length:3},()=>{
   const ball=this.ball.clone();ball.visible=false;this.scene.add(ball);return ball;
  });
 }
 updateWarmupArt(game,elapsed){
  const warming=elapsed!==null;
  this.warmupBalls.forEach(ball=>ball.visible=warming);
  this.aim.visible=!warming;
  if(!warming)return;
  this.ball.visible=this.ballShadow.visible=false;
  for(let i=0;i<6;i++){
   const home=game.players[i],rival=game.players[i+6],mesh=this.playerMeshes[i];
   const pair=i%3,side=i<3?-1:1;
   const x=-7.6+pair*2.5,z=side*3.6;
   const cycle=(elapsed+pair*.23)%1.8;
   const phase=(cycle%.9)/.9;
   const from=cycle<.9?-1:1;
   const returning=side!==from;
   const contacting=returning?phase>.82:phase<.20;
   const jump=contacting?.1*Math.sin(Math.PI*(returning?(phase-.82)/.18:phase/.20)):0;
   mesh.sprite.position.set(x,.1+jump,z);
   mesh.shadow.position.set(x,.1,z);
   mesh.marker.visible=false;
   this.updatePlayerSprite({...home,action:contacting?'set':'idle',actionPose:'set',
    actionTime:contacting?.12:0,spriteBack:side>0},mesh,game.teams[0]);
   const rivalMesh=this.playerMeshes[i+6];
   this.updatePlayerSprite({...rival,action:'idle',actionTime:0},rivalMesh,game.teams[1]);
   if(i<3)this.warmupBalls[pair].position.set(x,1.35+Math.sin(phase*Math.PI)*1.7,from*3.6*(1-2*phase));
  }
 }
 projectStage(position,dx,dy,width,height){
  const point=this.stagePoint.copy(position).applyMatrix4(this.camera.matrixWorldInverse);
  point.x+=dx;point.y+=dy;
  point.applyMatrix4(this.camera.projectionMatrix);
  return {x:(point.x+1)*width/2,y:(1-point.y)*height/2};
 }
 updateApexCue(game,canPlay){
  const cue=this.apexCue;
  const visible=canPlay&&game.controlled.apexHold>0&&(game.awaitUserServe||game.ball.live);
  cue.hidden=!visible;
  if(!visible)return;
  const text=game.awaitUserServe?'SAQUE!':'CORTE!';
  if(cue.textContent!==text)cue.textContent=text;
  const mesh=this.playerMeshes[game.players.indexOf(game.controlled)];
  const {sprite}=mesh;
  const width=this.host.clientWidth,height=this.host.clientHeight;
  this.camera.updateMatrixWorld();
  const head=this.projectStage(sprite.position,0,sprite.scale.y*(1-sprite.center.y),width,height);
  const x=Math.max(8,Math.min(width-cue.offsetWidth-8,head.x-cue.offsetWidth/2));
  const y=Math.max(8,head.y-cue.offsetHeight-10);
  cue.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;
 }
 updateCoachSpeech(game,warming){
  const text=warming?'Aquecimento até o GN\nficar sóbrio!':
   game.xandao&&this.coaches[1].reaction>0?'Se tivesse feito o que eu pedi,\nnão teria perdido a Supercopa':'';
  const bubble=this.coachBubble;
  bubble.hidden=!text;
  if(!text)return;
  if(bubble.textContent!==text)bubble.textContent=text;
  const width=this.host.clientWidth,height=this.host.clientHeight;
  const w=bubble.offsetWidth,h=bubble.offsetHeight;
  const margin=14,gap=34;
  const clamp=(value,min,max)=>Math.max(min,Math.min(value,max));
  this.camera.updateMatrixWorld();
  const coach=this.coaches[0].sprite;
  const anchor=this.projectStage(coach.position,0,coach.scale.y*(1-coach.center.y),width,height);
  const players=this.playerMeshes.filter(mesh=>mesh.sprite.visible).map(({sprite})=>{
   const leftTop=this.projectStage(sprite.position,-sprite.scale.x/2,sprite.scale.y*.9,width,height);
   const rightBottom=this.projectStage(sprite.position,sprite.scale.x/2,-sprite.scale.y*.1,width,height);
   return {left:leftTop.x-6,top:leftTop.y-6,right:rightBottom.x+6,bottom:rightBottom.y+6};
  });
  const centered=anchor.x-w/2;
  const preferredTop=clamp(anchor.y-h-gap,margin,height-h-margin);
  let best;
  for(const [dx,dy] of [[0,0],[-w*.28,0],[w*.28,0],[0,-h*.55],[-w*.28,-h*.55],[w*.28,-h*.55]]){
   const x=clamp(centered+dx,margin,width-w-margin),y=Math.max(margin,preferredTop+dy);
   const overlap=players.reduce((area,p)=>area+
    Math.max(0,Math.min(x+w,p.right)-Math.max(x,p.left))*
    Math.max(0,Math.min(y+h,p.bottom)-Math.max(y,p.top)),0);
   const score=overlap*4+Math.hypot(x-clamp(centered,margin,width-w-margin),y-preferredTop);
   if(!best||score<best.score)best={x,y,score};
  }
  bubble.style.transform=`translate(${Math.round(best.x)}px,${Math.round(best.y)}px)`;
  bubble.style.setProperty('--tail-offset',`${clamp(anchor.x-best.x,22,w-22)}px`);
 }
 playerAtlas(player,team){
  if(player.team===0)return this.atlases[player.athleteId]||this.atlases.original;
  return this.uniformTexture(player.athleteId,team,player.role==='Líbero');
 }
 showImpact(pos){this.impact.position.set(pos.x,pos.y,pos.z);this.impactTime=.42;this.impact.visible=true} box(x,y,z,w,h,d,color){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.receiveShadow=true;this.scene.add(m);return m}
 buildCourt(){this.box(0,-.38,0,34,.6,25,0x1b1b1b);this.box(0,-.03,0,23,.08,14,0x39342f);this.box(-4.5,.02,0,9,.08,9,0xe3a26e);this.box(4.5,.02,0,9,.08,9,0xdd9566);const line=(x,z,w,d)=>this.box(x,.075,z,w,.025,d,0xf6e8d0);line(0,-4.5,18,.07);line(0,4.5,18,.07);line(-9,0,.07,9);line(9,0,.07,9);line(-3,0,.055,9);line(3,0,.055,9);line(0,0,.08,9);for(let z of [-5,5])this.box(0,1.35,z,.15,2.7,.15,0xc4d5d3);for(let z of [-4.5,4.5]){for(let i=0;i<8;i++)this.box(0,2.625+i*.125,z,.075,.125,.075,i%2?0xf9f5ea:0xe53935)}let net=new THREE.Mesh(new THREE.PlaneGeometry(9.8,1.0,20,5),new THREE.MeshBasicMaterial({color:0xd7e8e2,wireframe:true,transparent:true,opacity:.35,side:THREE.DoubleSide}));net.rotation.y=Math.PI/2;net.position.set(0,2.07,0);this.scene.add(net);this.box(0,2.57,0,.08,.08,10,0xf9f2df);for(let i=0;i<4;i++){this.box(0,.3+i*.45,-8.5-i*.55,27,.45,.8,0x292929);this.box(0,.3+i*.45,8.5+i*.55,27,.45,.8,0x292929)} }
 shadow(r){let m=new THREE.Mesh(new THREE.CircleGeometry(r,24),new THREE.MeshBasicMaterial({color:0x141110,transparent:true,opacity:.25,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.09;this.scene.add(m);return m}
 texture(c){let t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;return t}
 makePlayer(p){let texture=this.atlases.original.clone();texture.repeat.set(1/12,1/12);texture.needsUpdate=true;let sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.center.set(.5,.1);sprite.scale.set(1.85,1.85,1);this.scene.add(sprite);let shadow=this.shadow(.33);let marker=new THREE.Mesh(new THREE.RingGeometry(.4,.46,32),new THREE.MeshBasicMaterial({color:0xff8a30,side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;this.scene.add(marker);return {sprite,shadow,marker,atlas:this.atlases.original}}
 updatePlayerSprite(p,m,team){
  const pose=p.actionTime>0?p.actionPose:p.action==='serve-ready'?'serve-ready':
   p.y>.2?'attack':p.action==='run'?'run':'idle';
  const moving=p.action==='run';
  const serving=pose==='serve-ready'||pose==='serve';
  if(serving||pose==='idle'||p.spriteBack===undefined)p.spriteBack=p.team===0;
  else if(moving){
   const forward=Math.cos(p.facing),lateral=Math.sin(p.facing);
   if(forward>.4)p.spriteBack=true;
   else if(forward<-.4)p.spriteBack=false;
   if(lateral<-.45)p.spriteMirror=true;
   else if(lateral>.45)p.spriteMirror=false;
  }
  const back=p.spriteBack;
  let start=0,count=1,row=0;
  switch(pose){
   case 'run':row=2;start=1;count=8;break;
   case 'pass':row=0;start=2;count=7;break;
   case 'set':row=4;start=2;count=8;break;
   case 'block':row=6;start=2;count=7;break;
   case 'serve-ready':row=8;start=back?2:10;break;
   case 'serve':row=8;start=6;count=4;break;
   case 'attack':row=8;start=5;count=4;break;
   case 'dive':row=10;start=1;count=9;break;
  }
  const frame=moving&&pose==='run'?start+Math.floor(p.anim*5)%count:
   start+Math.min(count-1,Math.floor(Math.max(0,1-(p.actionTime||0)/.55)*count));
  const atlas=this.playerAtlas(p,team);
  m.sprite.visible=!!atlas;
  if(!atlas)return;
  if(m.atlas!==atlas){
   const frameTexture=atlas.clone();
   frameTexture.repeat.y=1/12;
   frameTexture.needsUpdate=true;
   m.sprite.material.map.dispose();
   m.sprite.material.map=frameTexture;
   m.atlas=atlas;
  }
  const texture=m.sprite.material.map;let mirror=(pose==='run'||pose==='dive')&&!!p.spriteMirror;texture.repeat.x=(mirror?-1:1)/12;texture.offset.x=(frame+(mirror?1:0))/12;texture.offset.y=1-(row+(back?1:0)+1)/12;}
 pointer(clientX,clientY){let rect=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1),this.camera);let v=new THREE.Vector3();return this.ray.ray.intersectPlane(this.plane,v)?{x:v.x,z:v.z}:null}
 resize(){let w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=w/h<.8?55:38;this.camera.updateProjectionMatrix();this.camera.projectionMatrix.elements[0]*=1.16;this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert()}
 updateBallSprite(game){
  const {ball,flight}=game;
  const serveDirection=flight?.team===1?-1:1;
  const leavingServer=flight?.kind==='serve'&&ball.live&&
   (ball.x-flight.origin.x)*serveDirection<.25;
  const visible=(ball.live||!!flight)&&!leavingServer;
  this.ball.visible=this.ballShadow.visible=visible;
  if(!visible)return;
  this.ball.position.set(ball.x,ball.y,ball.z);
  this.ball.material.rotation=ball.angle;
  this.ballShadow.position.set(ball.x,.1,ball.z);
  this.ballShadow.scale.setScalar(Math.max(.35,1-ball.y*.08));
 }
 render(game,warmup=null,canPlay=false){let now=performance.now(),dt=Math.min((now-this.lastRender)/1000,.1);this.lastRender=now;this.updateCoaches(game,dt);this.stands.update(dt);this.updateCometTrail(game,dt);if(this.impactTime>0){this.impactTime=Math.max(0,this.impactTime-dt);let progress=1-this.impactTime/.42;this.impact.scale.setScalar(.6+progress*2);this.impact.material.opacity=1-progress;this.impact.material.rotation=progress*.5;this.impact.visible=this.impactTime>0}let desired=game.ball.live?THREE.MathUtils.clamp(game.ball.z*.045,-.22,.22):0;this.cameraYaw+=(desired-this.cameraYaw)*(1-Math.exp(-dt*1.8));this.camera.position.set(-27*Math.cos(this.cameraYaw),20,27*Math.sin(this.cameraYaw));this.camera.lookAt(0,0,0);game.cameraYaw=this.cameraYaw;for(let i=0;i<game.players.length;i++){let p=game.players[i],m=this.playerMeshes[i];m.sprite.position.set(p.x,.1+p.y,p.z);this.updatePlayerSprite(p,m,game.teams[p.team]);m.shadow.position.set(p.x,.1,p.z);m.shadow.scale.setScalar(1-p.y*.12);m.marker.visible=p===game.controlled&&!game.liberoOff;m.marker.position.set(p.x,.11,p.z)}let b=game.ball;this.updateBallSprite(game);this.aim.position.set(game.aim.x,.1,game.aim.z);this.aim.material.color.set(game.aimValid()?0xfff4e7:0xff7a70);let pts=[];let shot=game.previewShot();if(shot){let t=shot.destination,T=shot.duration,origin=shot.origin||b;if(shot.waypoint){pts.push(new THREE.Vector3(b.x,b.y,b.z),new THREE.Vector3(shot.waypoint.x,shot.waypoint.y,shot.waypoint.z));if(!shot.blockedAngle)pts.push(new THREE.Vector3(t.x,t.y,t.z))}else for(let i=0;i<=24;i++){let f=i/24;let y=b.y+(t.y-b.y)*f+.5*shot.gravity*T*T*f*(1-f);pts.push(new THREE.Vector3(b.x+(t.x-b.x)*f,y,b.z+(t.z-b.z)*f))}}this.line.geometry.setFromPoints(pts);this.updateSetIndicator(game);this.tacticalOverlay.update(game);this.updateWarmupArt(game,warmup);this.updateCoachSpeech(game,warmup!==null);this.updateApexCue(game,canPlay);this.renderer.render(this.scene,this.camera)}
}
