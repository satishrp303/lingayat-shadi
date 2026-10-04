import { database,identity,sameOrigin,failure,bucket } from '@/lib/server';
import { stripImageMetadata } from '@/lib/image-privacy';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response(null,{status:403});
 if(Number(request.headers.get('content-length')||0)>6*1024*1024)return Response.json({error:'photo-invalid'},{status:400});
 try{const user=await identity();if(!user)return Response.json({error:'signin'},{status:401});const db=database();const me=await db.prepare('SELECT id,photo FROM profiles WHERE user_id = ?').bind(user.userId).first<{id:string;photo:string|null}>();if(!me)return Response.json({error:'profile-required'},{status:409});
 const data=await request.formData();const file=data.get('photo');if(!(file instanceof File)||file.size>5*1024*1024||file.size<12)return Response.json({error:'photo-invalid'},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());const type=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'?'image/webp':null;
 if(!type)return Response.json({error:'photo-invalid'},{status:400});let cleaned;try{cleaned=stripImageMetadata(bytes,type)}catch{return Response.json({error:'photo-invalid'},{status:400})}const key=`profiles/${me.id}/${crypto.randomUUID()}`;await bucket().put(key,cleaned,{httpMetadata:{contentType:type}});await db.prepare('UPDATE profiles SET photo = ? WHERE id = ?').bind(key,me.id).run();if(me.photo)try{await bucket().delete(me.photo)}catch{console.error('Old photo cleanup failed')}return Response.json({ok:true});
 }catch(e){return failure(e)}
}
export async function GET(request:Request){
 try{const user=await identity();if(!user)return new Response(null,{status:401});const id=new URL(request.url).searchParams.get('id');if(!id)return new Response(null,{status:400});const row=await database().prepare('SELECT photo FROM profiles WHERE id = ? AND (published = 1 OR user_id = ?)').bind(id,user.userId).first<{photo:string|null}>();if(!row?.photo)return new Response(null,{status:404});const object=await bucket().get(row.photo);if(!object)return new Response(null,{status:404});return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType??'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return failure(e)}
}
