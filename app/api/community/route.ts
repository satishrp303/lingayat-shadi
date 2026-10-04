import { z } from 'zod';
import { database,identity,sameOrigin,failure,bucket } from '@/lib/server';
export const dynamic='force-dynamic';
const text=z.string().trim().min(1).max(100);
const profileSchema=z.object({name:text.max(60),age:z.number().int().min(21).max(90),gender:z.enum(['woman','man']),community:z.string().trim().max(80),city:text.max(60),occupation:text,education:text,marital:z.enum(['never','divorced','widowed']),bio:z.string().trim().min(20).max(1200),published:z.boolean(),consent:z.literal(true)});
type Row={id:string;email:string;photo:string|null};
export async function GET(){
 try {const user=await identity(); if(!user)return Response.json({profiles:[],profile:null,saved:[],received:[],sent:[],signedIn:false});
 const db=database(); const me=await db.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(user.userId).first<Row>();
 const profiles=await db.prepare('SELECT id,name,age,gender,community,city,occupation,education,marital,bio,photo FROM profiles WHERE published = 1 AND user_id != ? ORDER BY created_at DESC LIMIT 250').bind(user.userId).all();
 if(!me)return Response.json({profiles:profiles.results,profile:null,saved:[],received:[],sent:[],signedIn:true},{headers:{'Cache-Control':'private, no-store'}});
 const result=await db.batch([
 db.prepare('SELECT target FROM shortlists WHERE owner = ?').bind(me.id),
 db.prepare("SELECT i.id,i.sender,i.recipient,i.status,p.name,p.city,p.id AS profile_id,CASE WHEN i.status = 'accepted' THEN p.email ELSE NULL END AS email FROM interests i JOIN profiles p ON p.id = i.sender WHERE i.recipient = ? ORDER BY i.created_at DESC").bind(me.id),
 db.prepare("SELECT i.id,i.sender,i.recipient,i.status,p.name,p.city,p.id AS profile_id,CASE WHEN i.status = 'accepted' THEN p.email ELSE NULL END AS email FROM interests i JOIN profiles p ON p.id = i.recipient WHERE i.sender = ? ORDER BY i.created_at DESC").bind(me.id),
 db.prepare('SELECT p.id,p.name,p.age,p.gender,p.community,p.city,p.occupation,p.education,p.marital,p.bio,p.photo FROM shortlists s JOIN profiles p ON p.id=s.target WHERE s.owner=? AND p.published=1').bind(me.id)]);
 const {user_id: _privateId,...publicMe}=me as Row & {user_id:string};
 return Response.json({profiles:profiles.results,shortlisted:result[3].results,profile:publicMe,saved:(result[0].results as {target:string}[]).map((r)=>r.target),received:result[1].results,sent:result[2].results,signedIn:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return failure(e)}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'forbidden'},{status:403});
 try {const user=await identity();if(!user)return Response.json({error:'signin'},{status:401});
 const raw=await request.text();if(raw.length>12000)return Response.json({error:'invalid'},{status:400});
 let body;try{body=JSON.parse(raw)}catch{return Response.json({error:'invalid'},{status:400})}
 const db=database();const me=await db.prepare('SELECT id,email,photo FROM profiles WHERE user_id = ?').bind(user.userId).first<Row>();
 if(body.action==='save-profile'){
 const p=profileSchema.safeParse(body.profile);if(!p.success)return Response.json({error:'invalid'},{status:400});const v=p.data;
 await db.prepare('INSERT INTO profiles (id,user_id,email,name,age,gender,community,city,occupation,education,marital,bio,published,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,name=excluded.name,age=excluded.age,gender=excluded.gender,community=excluded.community,city=excluded.city,occupation=excluded.occupation,education=excluded.education,marital=excluded.marital,bio=excluded.bio,published=excluded.published').bind(me?.id??crypto.randomUUID(),user.userId,user.email,v.name,v.age,v.gender,v.community,v.city,v.occupation,v.education,v.marital,v.bio,Number(v.published),new Date().toISOString()).run();
 return Response.json({ok:true});}
 if(!me)return Response.json({error:'profile-required'},{status:409});
 if(body.action==='delete-profile'){
 await db.batch([db.prepare('DELETE FROM shortlists WHERE owner = ? OR target = ?').bind(me.id,me.id),db.prepare('DELETE FROM interests WHERE sender = ? OR recipient = ?').bind(me.id,me.id),db.prepare('DELETE FROM profiles WHERE id = ?').bind(me.id)]);
 if(me.photo)try{await bucket().delete(me.photo)}catch(e){console.error('Photo cleanup failed')}
 return Response.json({ok:true});}
 if(body.action==='respond'){
 if(!z.string().uuid().safeParse(body.id).success||!['accepted','declined'].includes(body.status))return Response.json({error:'invalid'},{status:400});
 const changed=await db.prepare("UPDATE interests SET status = ? WHERE id = ? AND recipient = ? AND status = 'pending'").bind(body.status,body.id,me.id).run();
 return changed.meta.changes?Response.json({ok:true}):Response.json({error:'not-found'},{status:404});}
 if(!z.string().uuid().safeParse(body.target).success||body.target===me.id)return Response.json({error:'invalid'},{status:400});
 const target=await db.prepare('SELECT id FROM profiles WHERE id = ? AND published = 1').bind(body.target).first();if(!target)return Response.json({error:'not-found'},{status:404});
 if(body.action==='shortlist'&&typeof body.saved==='boolean'){
 if(body.saved)await db.prepare('INSERT OR IGNORE INTO shortlists(owner,target) VALUES (?,?)').bind(me.id,body.target).run();else await db.prepare('DELETE FROM shortlists WHERE owner = ? AND target = ?').bind(me.id,body.target).run();return Response.json({ok:true});}
 if(body.action==='interest'){
 const existing=await db.prepare('SELECT id FROM interests WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)').bind(me.id,body.target,body.target,me.id).first();
 if(existing)return Response.json({error:'existing-interest'},{status:409});
 const inserted=await db.prepare('INSERT OR IGNORE INTO interests(id,sender,recipient,status,created_at,pair_key) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),me.id,body.target,'pending',new Date().toISOString(),[me.id,body.target].sort().join(':')).run();return inserted.meta.changes?Response.json({ok:true}):Response.json({error:'existing-interest'},{status:409});}
 return Response.json({error:'invalid'},{status:400});
 }catch(e){return failure(e)}
}
