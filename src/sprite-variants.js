// Recolour only pixels identified as skin or blue cloth in the original atlas.
// The bright white libero jersey retains the orange trim, skin, and hair.
export function transformSpritePixels(data, skin, whiteJersey=false, width=960){
 const target=skin?.match(/[\da-f]{2}/gi)?.map(v=>parseInt(v,16));
 for(let i=0;i<data.length;i+=4){
  let r=data[i],g=data[i+1],b=data[i+2];
  if(!data[i+3])continue;
  const pixel=i/4,x=pixel%width,y=Math.floor(pixel/width);
  const row=Math.floor(y/80),column=Math.floor(x/80),localX=x%80,localY=y%80;
  // Protect the head and shoes separately in each animation strip. Dive frames
  // face sideways, so their head lies at the right edge of the sprite.
  const headBottom=[27,27,30,30,35,35,30,30,27,27,23,23][row]??30;
  const sideways=row>=10&&column>=3&&column<=8;
  const jerseyArea=localY>headBottom&&localY<60&&(!sideways||localX<48);
  const cloth=jerseyArea&&b>55&&b>r+7&&b>g+3&&r<130&&b<180;
  if(whiteJersey&&cloth){
   const light=Math.min(245,Math.max(130,105+b*1.7));
   data[i]=light;data[i+1]=light;data[i+2]=light;
  } else if(target && r>90 && g>55 && b>32 && r>g*1.08 && g>b*1.12 && r-g<95 && g-b<100){
   // Preserve the lighting within the existing animation rather than applying a flat tint.
   data[i]=Math.min(255,r*target[0]/205);
   data[i+1]=Math.min(255,g*target[1]/145);
   data[i+2]=Math.min(255,b*target[2]/105);
  }
 }
 return data;
}

export function variantTexture(source, skin, whiteJersey){
 const canvas=document.createElement('canvas');
 canvas.width=source.width;canvas.height=source.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(source,0,0);
 const image=ctx.getImageData(0,0,canvas.width,canvas.height);
 transformSpritePixels(image.data,skin,whiteJersey,canvas.width);
 ctx.putImageData(image,0,0);
 return canvas;
}

export function teamUniform(source, team, {libero=false, coach=false}={}){
 const canvas=document.createElement('canvas');
 canvas.width=source.width;
 canvas.height=source.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(source,0,0);
 const image=ctx.getImageData(0,0,canvas.width,canvas.height);
 const primary=hexChannels(libero?'#e9ece2':team.primary);
 const secondary=hexChannels(libero?team.primary:team.secondary);
 const pixels=image.data;
 for(let i=0;i<pixels.length;i+=4){
  if(!pixels[i+3])continue;
  const position=i/4;
  const x=position%canvas.width;
  const y=Math.floor(position/canvas.width);
  const row=Math.floor(y/80);
  const headBottom=[27,27,30,30,35,35,30,30,27,27,23,23][row]??30;
  const dive=row>=10&&Math.floor(x/80)>=3&&Math.floor(x/80)<=8;
  const onUniform=coach?(x/canvas.width>.34&&x/canvas.width<.86&&y/canvas.height>.42&&y/canvas.height<.8)
   :(y%80>headBottom&&y%80<60&&(!dive||x%80<48));
  if(!onUniform)continue;
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  const isFabric=coach?r>16&&r<100&&Math.max(r,g,b)-Math.min(r,g,b)<20
   :b>42&&b<160&&b>r+7&&b>g+3;
  const isTrim=r>115&&r>g*1.48&&g>b*1.7;
  if(!isFabric&&!isTrim)continue;
  const color=isFabric?primary:secondary;
  const shade=isFabric?Math.max(.58,Math.min(1.28,(coach?r:b)/75+.25)):.68+r/650;
  for(let channel=0;channel<3;channel++)pixels[i+channel]=color[channel]*shade;
 }
 ctx.putImageData(image,0,0);
 return canvas;
}

function hexChannels(hex){
 return hex.slice(1).match(/../g).map(channel=>parseInt(channel,16));
}
