import * as THREE from 'three';

function texture(canvas){
 const t=new THREE.CanvasTexture(canvas);
 t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;
 return t;
}

// A small illustrated sprite inspired by the yellow and blue V200W panels.
export function makeBallTexture(){
 const c=document.createElement('canvas');c.width=c.height=48;
 const x=c.getContext('2d');
 x.beginPath();x.arc(24,24,22,0,Math.PI*2);x.fillStyle='#f9cf16';x.fill();
 x.save();x.beginPath();x.arc(24,24,21.7,0,Math.PI*2);x.clip();
 x.translate(24,24);
 for(let i=0;i<3;i++){
  x.save();x.rotate(i*Math.PI*2/3);
  x.beginPath();x.moveTo(-3,-1);x.bezierCurveTo(-6,-9,-3,-19,4,-24);
  x.lineTo(14,-24);x.bezierCurveTo(5,-17,2,-10,5,-3);x.closePath();
  x.fillStyle='#093b91';x.fill();
  x.beginPath();x.moveTo(-3,-1);x.bezierCurveTo(-6,-9,-3,-19,4,-24);
  x.strokeStyle='#062c6a';x.lineWidth=.8;x.stroke();x.restore();
 }
 x.restore();
 let shade=x.createRadialGradient(16,14,3,24,24,23);
 shade.addColorStop(0,'rgba(255,255,255,.25)');shade.addColorStop(.65,'rgba(255,255,255,0)');shade.addColorStop(1,'rgba(24,25,29,.35)');
 x.beginPath();x.arc(24,24,22,0,Math.PI*2);x.fillStyle=shade;x.fill();
 x.strokeStyle='#24324c';x.lineWidth=1;x.stroke();
 return texture(c);
}

// Small pixel-art official, separate from the athletes and the coach.
export function makeRefereeTexture(){
 const c=document.createElement('canvas');c.width=32;c.height=64;
 const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 const r=(color,a,b,w,h)=>{x.fillStyle=color;x.fillRect(a,b,w,h)};
 r('#17242d',9,3,14,15);r('#25313a',8,5,16,10);r('#c18a65',10,8,12,10);
 r('#202a30',10,4,12,5);r('#202a30',9,7,2,6);r('#202a30',21,7,2,6);
 r('#27323c',11,11,2,2);r('#27323c',19,11,2,2);r('#e2a477',14,18,5,3);
 r('#20313c',6,20,20,21);r('#f2f4ee',8,21,16,18);r('#d5e3df',12,20,8,3);
 r('#477da5',15,23,2,15);r('#25547d',8,22,2,16);r('#25547d',22,22,2,16);
 r('#c18a65',5,24,3,14);r('#c18a65',24,24,3,14);r('#d39a70',5,35,3,5);r('#d39a70',24,35,3,5);
 r('#151f2b',8,39,16,15);r('#1d2b37',9,40,6,16);r('#1d2b37',17,40,6,16);
 r('#18232a',7,55,9,5);r('#18232a',17,55,9,5);r('#dae1dc',7,59,9,2);r('#dae1dc',17,59,9,2);
 return texture(c);
}

export function addRefereeStand(scene,box){
 const metal=0xa4b9bb,platform=0x314e59;
 box(0,1.4,-6.05,1.5,.16,1.25,platform);
 for(const x of [-.65,.65])for(const z of [-6.55,-5.55])box(x,.68,z,.1,1.35,.1,metal);
 for(const x of [-.65,.65]){
  box(x,1.95,-6.55,.09,1,.09,metal);
  box(x,1.95,-5.55,.09,1,.09,metal);
  box(x,2.42,-6.05,.09,.08,1.08,metal);
 }
 box(0,2.42,-6.55,1.35,.08,.09,metal);
 for(let y=.3;y<1.35;y+=.3)box(-.72,y,-6.05,.08,.07,1,metal);
 const referee=new THREE.Sprite(new THREE.SpriteMaterial({map:makeRefereeTexture(),transparent:true,depthWrite:false}));
 referee.center.set(.5,.03);referee.scale.set(1.05,1.85,1);referee.position.set(0,1.49,-6.04);scene.add(referee);
}
