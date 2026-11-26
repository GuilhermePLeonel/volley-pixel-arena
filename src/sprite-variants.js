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
