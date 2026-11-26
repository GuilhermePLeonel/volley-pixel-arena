import * as THREE from 'three';
import {Stands} from './stands.js';
import {makeBallTexture,addRefereeStand} from './court-art.js';
import coachCelebration from './assets/jefferson-reaction.webp';
import originalAtlas from './assets/volley-original.png';
import {hasNamedRoster} from './teams.js';
import coachSprite from './assets/atletas/jefferson.webp';
const athleteSprites=import.meta.glob('./assets/atletas/*.webp',{eager:true,query:'?url',import:'default'});
import {teamUniform} from './sprite-variants.js';
const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
export class View{
 constructor(host,players){this.host=host;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x111c22);this.camera=new THREE.PerspectiveCamera(38,1,.1,120);this.camera.position.set(-27,20,.01);this.camera.lookAt(0,0,0);this.cameraYaw=0;this.lastRender=performance.now();this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(this.renderer.domElement);this.scene.add(new THREE.HemisphereLight(0xd9f5ff,0x574132,2));let light=new THREE.DirectionalLight(0xfff2df,2.3);light.position.set(-6,20,9);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-16;light.shadow.camera.right=16;light.shadow.camera.top=16;light.shadow.camera.bottom=-16;this.scene.add(light);this.buildCourt();this.stands=new Stands(this.scene);let loader=new THREE.TextureLoader();this.atlases={original:loader.load(originalAtlas)};for(const [path,url] of Object.entries(athleteSprites)){let id=path.split('/').pop().replace('.webp','');if(id!=='jefferson')this.atlases[id]=loader.load(url)}
  this.uniforms=new Map();
  this.coachIdle=this.loadSprite(loader,coachSprite);
  this.coachCheer=this.loadSprite(loader,coachCelebration);
  this.coaches=[0,1].map(side=>this.makeCoach(side));
  addRefereeStand(this.scene,(...args)=>this.box(...args));for(const texture of Object.values(this.atlases)){texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace}this.playerMeshes=players.map(p=>this.makePlayer(p));let bt=makeBallTexture();let ball=new THREE.Sprite(new THREE.SpriteMaterial({map:bt,transparent:true,depthWrite:false}));ball.scale.set(.52,.52,1);this.scene.add(ball);this.ball=ball;this.ballShadow=this.shadow(.3);this.createImpact();this.createCometTrail();this.createSetIndicator();this.aim=new THREE.Mesh(new THREE.RingGeometry(.3,.38,32),new THREE.MeshBasicMaterial({color:0xe4ff68,side:THREE.DoubleSide,transparent:true,opacity:.8}));this.aim.rotation.x=-Math.PI/2;this.aim.position.y=.035;this.scene.add(this.aim);this.line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xe4ff68,transparent:true,opacity:.55}));this.scene.add(this.line);this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.resize();window.addEventListener('resize',()=>this.resize())}
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
 uniformTexture(base,team,variant,settings){
  if(!base.image)return base;
  const key=team.id+':'+variant;
  if(!this.uniforms.has(key)){
   this.uniforms.set(key,this.texture(teamUniform(base.image,team,settings)));
  }
  return this.uniforms.get(key);
 }
 makeCoach(side){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.coachIdle,transparent:true,depthWrite:false}));
  sprite.center.set(.5,.1);
  sprite.scale.set(1.7,1.95,1);
  sprite.position.set(side?7:-7,.1,side?6.1:-6.1);
  this.scene.add(sprite);
  return {sprite,reaction:0};
 }
 showCoachReaction(side){
  if(this.coaches[side])this.coaches[side].reaction=1.7;
 }
 resetCoaches(){for(const coach of this.coaches)coach.reaction=0}
 updateCoaches(teams,dt){
  this.coaches.forEach((coach,side)=>{
   coach.reaction=Math.max(0,coach.reaction-dt);
   const cheering=coach.reaction>0;
   const base=cheering?this.coachCheer:this.coachIdle;
   const team=teams[side];
   coach.sprite.material.map=hasNamedRoster(team)?base:
    this.uniformTexture(base,team,cheering?'cheer':'coach',{coach:true});
  });
 }
 playerAtlas(player,team){
  if(hasNamedRoster(team))return this.atlases[player.athleteId]||this.atlases.original;
  const libero=player.role==='Líbero';
  return this.uniformTexture(this.atlases.original,team,libero?'libero':'player',{libero});
 }
 showImpact(pos){this.impact.position.set(pos.x,pos.y,pos.z);this.impactTime=.42;this.impact.visible=true} box(x,y,z,w,h,d,color){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.receiveShadow=true;this.scene.add(m);return m}
 buildCourt(){this.box(0,-.38,0,34,.6,25,0x182c32);this.box(0,-.03,0,23,.08,14,0x2d7b80);this.box(-4.5,.02,0,9,.08,9,0xe3a26e);this.box(4.5,.02,0,9,.08,9,0xdd9566);const line=(x,z,w,d)=>this.box(x,.075,z,w,.025,d,0xf6e8d0);line(0,-4.5,18,.07);line(0,4.5,18,.07);line(-9,0,.07,9);line(9,0,.07,9);line(-3,0,.055,9);line(3,0,.055,9);line(0,0,.08,9);for(let z of [-5,5])this.box(0,1.35,z,.15,2.7,.15,0xc4d5d3);for(let z of [-4.5,4.5]){for(let i=0;i<8;i++)this.box(0,2.625+i*.125,z,.075,.125,.075,i%2?0xf9f5ea:0xe53935)}let net=new THREE.Mesh(new THREE.PlaneGeometry(9.8,1.0,20,5),new THREE.MeshBasicMaterial({color:0xd7e8e2,wireframe:true,transparent:true,opacity:.35,side:THREE.DoubleSide}));net.rotation.y=Math.PI/2;net.position.set(0,2.07,0);this.scene.add(net);this.box(0,2.57,0,.08,.08,10,0xf9f2df);for(let i=0;i<4;i++){this.box(0,.3+i*.45,-8.5-i*.55,27,.45,.8,0x253c43);this.box(0,.3+i*.45,8.5+i*.55,27,.45,.8,0x253c43)} }
 shadow(r){let m=new THREE.Mesh(new THREE.CircleGeometry(r,24),new THREE.MeshBasicMaterial({color:0x0b2423,transparent:true,opacity:.25,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.09;this.scene.add(m);return m}
 texture(c){let t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;return t}
 makePlayer(p){let texture=this.atlases.original.clone();texture.repeat.set(1/12,1/12);texture.needsUpdate=true;let sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.center.set(.5,.1);sprite.scale.set(1.85,1.85,1);this.scene.add(sprite);let shadow=this.shadow(.33);let marker=new THREE.Mesh(new THREE.RingGeometry(.4,.46,32),new THREE.MeshBasicMaterial({color:0xe4ff68,side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;this.scene.add(marker);return {sprite,shadow,marker,atlas:this.atlases.original}}
 updatePlayerSprite(p,m,team){let pose=p.actionTime>0?p.actionPose:(p.y>.2?'attack':p.action==='run'?'run':'idle');let moving=p.action==='run';if(p.spriteBack===undefined)p.spriteBack=p.team===0;if(moving){let forward=Math.cos(p.facing);if(forward>.4)p.spriteBack=true;else if(forward<-.4)p.spriteBack=false;let lateral=Math.sin(p.facing);if(lateral<-.45)p.spriteMirror=true;else if(lateral>.45)p.spriteMirror=false}let back=p.spriteBack;let start=0,count=1,row=0;switch(pose){case 'run':row=2;start=1;count=8;break;case 'pass':row=0;start=2;count=7;break;case 'set':row=4;start=2;count=8;break;case 'attack':row=8;start=5;count=4;break;case 'dive':row=10;start=1;count=9;break}let frame=moving&&pose==='run'?start+Math.floor(p.anim*5)%count:start+Math.min(count-1,Math.floor(Math.max(0,1-(p.actionTime||0)/.55)*count));const atlas=this.playerAtlas(p,team);
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
 render(game){let now=performance.now(),dt=Math.min((now-this.lastRender)/1000,.1);this.lastRender=now;this.updateCoaches(game.teams,dt);this.stands.update(dt);this.updateCometTrail(game,dt);if(this.impactTime>0){this.impactTime=Math.max(0,this.impactTime-dt);let progress=1-this.impactTime/.42;this.impact.scale.setScalar(.6+progress*2);this.impact.material.opacity=1-progress;this.impact.material.rotation=progress*.5;this.impact.visible=this.impactTime>0}let desired=game.ball.live?THREE.MathUtils.clamp(game.ball.z*.045,-.22,.22):0;this.cameraYaw+=(desired-this.cameraYaw)*(1-Math.exp(-dt*1.8));this.camera.position.set(-27*Math.cos(this.cameraYaw),20,27*Math.sin(this.cameraYaw));this.camera.lookAt(0,0,0);game.cameraYaw=this.cameraYaw;for(let i=0;i<game.players.length;i++){let p=game.players[i],m=this.playerMeshes[i];m.sprite.position.set(p.x,.1+p.y,p.z);this.updatePlayerSprite(p,m,game.teams[p.team]);m.shadow.position.set(p.x,.1,p.z);m.shadow.scale.setScalar(1-p.y*.12);m.marker.visible=p===game.controlled&&!game.liberoOff;m.marker.position.set(p.x,.11,p.z)}let b=game.ball;this.ball.position.set(b.x,b.y,b.z);this.ball.material.rotation+=.03;this.ballShadow.position.set(b.x,.1,b.z);this.ballShadow.scale.setScalar(Math.max(.35,1-b.y*.08));this.aim.position.set(game.aim.x,.1,game.aim.z);this.aim.material.color.set(game.aimValid()?0xe4ff68:0xff7a70);let pts=[];let shot=game.previewShot();if(shot){let t=shot.destination,T=shot.duration;if(shot.waypoint){pts.push(new THREE.Vector3(b.x,b.y,b.z),new THREE.Vector3(shot.waypoint.x,shot.waypoint.y,shot.waypoint.z));if(!shot.blockedAngle)pts.push(new THREE.Vector3(t.x,t.y,t.z))}else for(let i=0;i<=24;i++){let f=i/24;let y=b.y+(t.y-b.y)*f+.5*shot.gravity*T*T*f*(1-f);pts.push(new THREE.Vector3(b.x+(t.x-b.x)*f,y,b.z+(t.z-b.z)*f))}}this.line.geometry.setFromPoints(pts);this.updateSetIndicator(game);this.renderer.render(this.scene,this.camera)}
}










