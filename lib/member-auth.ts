import { headers } from 'next/headers';
import { env } from 'cloudflare:workers';

const COOKIE='lingayat_session';
const SESSION_DAYS=30;
// Cloudflare's production runtime rejects PBKDF2 counts above 100,000.
// Local workerd does not enforce that limit, so keep it covered in check-auth.
const HASH_ITERATIONS=100000;

export type MemberUser={userId:string;email:string;displayName:string;fullName:null;contactType:'email'|'mobile'};

type MemberRow={id:string;contact:string;contact_type:'email'|'mobile';password_hash:string};
type SessionRow={member_id:string;contact:string;contact_type:'email'|'mobile'};

function database(): D1Database { if(!env.DB) throw new Error('Database unavailable'); return env.DB; }

export function normalizeContact(value:string){
 const raw=value.trim();
 const email=raw.toLowerCase();
 if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {contact:email,type:'email' as const};
 const mobile=raw.replace(/[^\d+]/g,'');
 if(/^\+?[1-9]\d{7,14}$/.test(mobile))return {contact:mobile,type:'mobile' as const};
 return null;
}

export function validPassword(value:string){return value.length>=8&&value.length<=72}

export function sessionCookie(token:string,maxAge=SESSION_DAYS*24*60*60){
 return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function expiredSessionCookie(){
 return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createPasswordHash(password:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const hash=await pbkdf2(password,salt);
 return `pbkdf2:${HASH_ITERATIONS}:${base64(salt)}:${base64(hash)}`;
}

export async function verifyPassword(password:string,stored:string){
 const [scheme,iterations,saltValue,hashValue]=stored.split(':');
 if(scheme!=='pbkdf2'||Number(iterations)!==HASH_ITERATIONS||!saltValue||!hashValue)return false;
 const expected=fromBase64(hashValue);
 const actual=await pbkdf2(password,fromBase64(saltValue));
 return timingSafeEqual(actual,expected);
}

export async function createSession(memberId:string){
 const token=base64url(crypto.getRandomValues(new Uint8Array(32)));
 const tokenHash=await sha256(token);
 const expires=new Date(Date.now()+SESSION_DAYS*24*60*60*1000).toISOString();
 await database().prepare('INSERT INTO sessions(id,member_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)')
  .bind(crypto.randomUUID(),memberId,tokenHash,expires,new Date().toISOString()).run();
 return token;
}

export async function getMemberUser():Promise<MemberUser|null>{
 const requestHeaders=await headers();
 const token=parseCookie(requestHeaders.get('cookie')||'')[COOKIE];
 if(!token)return null;
 const tokenHash=await sha256(token);
 const row=await database().prepare("SELECT s.member_id,m.contact,m.contact_type FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash = ? AND s.expires_at > ?")
  .bind(tokenHash,new Date().toISOString()).first<SessionRow>();
 if(!row)return null;
 return {userId:row.member_id,email:row.contact,displayName:row.contact,fullName:null,contactType:row.contact_type};
}

export async function findMember(contact:string){
 return await database().prepare('SELECT id,contact,contact_type,password_hash FROM members WHERE contact = ?').bind(contact).first<MemberRow>();
}

export async function createMember(contact:string,contactType:'email'|'mobile',password:string){
 const id=crypto.randomUUID();
 await database().prepare('INSERT INTO members(id,contact,contact_type,password_hash,created_at) VALUES (?,?,?,?,?)')
  .bind(id,contact,contactType,await createPasswordHash(password),new Date().toISOString()).run();
 return id;
}

export async function clearSession(token:string|null){
 if(!token)return;
 await database().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}

export function currentSessionTokenFromRequest(request:Request){
 return parseCookie(request.headers.get('cookie')||'')[COOKIE]||null;
}

function parseCookie(value:string){
 return Object.fromEntries(value.split(';').map(part=>part.trim()).filter(Boolean).map(part=>{
  const index=part.indexOf('=');
  return index===-1?[part,'']:[part.slice(0,index),part.slice(index+1)];
 }));
}

async function pbkdf2(password:string,salt:Uint8Array){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const cleanSalt=new ArrayBuffer(salt.byteLength);
 new Uint8Array(cleanSalt).set(salt);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:cleanSalt,iterations:HASH_ITERATIONS},key,256));
}

async function sha256(value:string){
 return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
}

function timingSafeEqual(a:Uint8Array,b:Uint8Array){
 if(a.length!==b.length)return false;
 let diff=0;
 for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}

function base64(bytes:Uint8Array){
 let binary='';
 for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary);
}

function fromBase64(value:string){
 const binary=atob(value);
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes;
}

function base64url(bytes:Uint8Array){
 return base64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
