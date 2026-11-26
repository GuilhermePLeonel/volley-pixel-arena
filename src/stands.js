import * as THREE from 'three';
import crestUrl from './assets/atletica-financas.png';

// Instanced, deliberately small figures keep the stands lively without heavy models.
export class Stands {
 constructor(scene){
  this.time=0;this.people=[];this.flags=[];this.dummy=new THREE.Object3D();
  let geometry=new THREE.SphereGeometry(.115,6,4),material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  for(let side of [-1,1])for(let row=0;row<4;row++)for(let column=0;column<23;column++){
   let id=this.people.length,variation=Math.sin(id*12.9898)*43758.5453,random=variation-Math.floor(variation);
   this.people.push({x:-12.15+column*1.1+(random-.5)*.13,y:.66+row*.45,z:side*(8.5+row*.55),phase:random*Math.PI*2,scale:.75+random*.35,orange:(column+row*3+(random>.65?1:0))%3!==0});
  }
  this.crowd=new THREE.InstancedMesh(geometry,material,this.people.length);this.crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.crowd.frustumCulled=false;
  this.people.forEach((person,i)=>this.crowd.setColorAt(i,new THREE.Color(person.orange?0xf28b24:0x101012)));scene.add(this.crowd);
  let crest=new THREE.TextureLoader().load(crestUrl);crest.colorSpace=THREE.SRGBColorSpace;crest.anisotropy=2;
  let flagMaterial=new THREE.MeshBasicMaterial({map:crest,side:THREE.DoubleSide}),poleMaterial=new THREE.MeshStandardMaterial({color:0xd6d9d1,roughness:.8});
  for(let side of [-1,1])for(let x of [-6,5]){
   let z=side*9.75,pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,3.2,6),poleMaterial);pole.position.set(x,2.2,z);scene.add(pole);
   let geometry=new THREE.PlaneGeometry(1.65,1.65,10,2),flag=new THREE.Mesh(geometry,flagMaterial);flag.rotation.y=-Math.PI/2;flag.position.set(x,2.95,z+.825);scene.add(flag);
   this.flags.push({geometry,initial:Float32Array.from(geometry.attributes.position.array),phase:x*.4+side});
  }
  this.update(0);
 }
 update(dt){
  this.time+=Math.min(dt,.1);
  for(let i=0;i<this.people.length;i++){let p=this.people[i],bounce=Math.max(0,Math.sin(this.time*3.4+p.phase))*.17;this.dummy.position.set(p.x,p.y+bounce,p.z);this.dummy.scale.setScalar(p.scale);this.dummy.updateMatrix();this.crowd.setMatrixAt(i,this.dummy.matrix)}this.crowd.instanceMatrix.needsUpdate=true;
  for(let flag of this.flags){let attribute=flag.geometry.attributes.position,initial=flag.initial;for(let i=0;i<attribute.count;i++){let x=initial[i*3],offset=(x+.825)/1.65;attribute.array[i*3+2]=Math.sin(this.time*2.8+x*3+flag.phase)*.1*offset}attribute.needsUpdate=true}
 }
}
