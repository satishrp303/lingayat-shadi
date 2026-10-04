// Strip metadata on the server as well as normalizing photos in the browser.
// Keeping only image-essential chunks avoids persisting GPS, EXIF and XMP data.
export function stripImageMetadata(input:Uint8Array,type:string):Uint8Array {
 const pieces:Uint8Array[]=[]; const view=new DataView(input.buffer,input.byteOffset,input.byteLength);
 function join(){const out=new Uint8Array(pieces.reduce((n,p)=>n+p.length,0));let at=0;for(const p of pieces){out.set(p,at);at+=p.length}return out}
 if(type==='image/jpeg'){
  pieces.push(input.slice(0,2));let i=2;
  while(i<input.length){if(input[i]!==255)throw new Error('Invalid JPEG');const start=i;while(input[i]===255)i++;const marker=input[i++];
   if(marker===218){pieces.push(input.slice(start));return join()}
   if(marker===217){pieces.push(input.slice(start,i));return join()}
   if(i+2>input.length)throw new Error('Invalid JPEG');const length=view.getUint16(i);if(length<2||i+length>input.length)throw new Error('Invalid JPEG');
   // Retain JFIF (APP0) and image coding data. Other APP segments and comments can contain private metadata.
   if(!((marker>=225&&marker<=239)||marker===254))pieces.push(input.slice(start,i+length));i+=length;
  }throw new Error('Invalid JPEG');
 }
 if(type==='image/png'){
  pieces.push(input.slice(0,8));let i=8;
  while(i+12<=input.length){const length=view.getUint32(i),end=i+length+12;if(end>input.length)throw new Error('Invalid PNG');const name=String.fromCharCode(...input.slice(i+4,i+8));if(['IHDR','PLTE','IDAT','IEND','tRNS'].includes(name))pieces.push(input.slice(i,end));if(name==='IEND')return join();i=end}throw new Error('Invalid PNG');
 }
 if(type==='image/webp'){
  pieces.push(input.slice(0,12));let i=12;
  while(i+8<=input.length){const name=String.fromCharCode(...input.slice(i,i+4));const length=view.getUint32(i+4,true),end=i+8+length+(length%2);if(end>input.length)throw new Error('Invalid WebP');if(['VP8 ','VP8L','VP8X','ALPH','ANIM','ANMF'].includes(name)){const part=input.slice(i,end);if(name==='VP8X'&&part.length>8)part[8]&=~12;pieces.push(part)}i=end}
  const out=join();new DataView(out.buffer).setUint32(4,out.length-8,true);return out;
 }
 throw new Error('Unsupported photo');
}
