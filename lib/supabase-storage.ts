import { env } from 'cloudflare:workers';

type StoredPhoto = {
 body: ReadableStream<Uint8Array>;
 contentType: string;
};

type StorageConfig = {
 baseUrl: string;
 bucket: string;
 serviceRoleKey: string;
};

function config(): StorageConfig {
 const baseUrl=String(env.SUPABASE_URL||'').replace(/\/+$/,'');
 const serviceRoleKey=String(env.SUPABASE_SERVICE_ROLE_KEY||'');
 const bucket=String(env.SUPABASE_STORAGE_BUCKET||'profile-photos');
 if(!baseUrl||!serviceRoleKey)throw new Error('Photo storage unavailable');
 return {baseUrl,bucket,serviceRoleKey};
}

function objectUrl({baseUrl,bucket}:StorageConfig,key:string){
 return `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function headers(settings:StorageConfig,contentType?:string){
 const result:Record<string,string>={
  apikey:settings.serviceRoleKey,
  Authorization:`Bearer ${settings.serviceRoleKey}`,
 };
 if(contentType)result['Content-Type']=contentType;
 return result;
}

export async function putPhoto(key:string,body:Uint8Array,contentType:string){
 const settings=config();
 const payload=new ArrayBuffer(body.byteLength);
 new Uint8Array(payload).set(body);
 const response=await fetch(objectUrl(settings,key),{method:'POST',headers:{...headers(settings,contentType),'x-upsert':'false'},body:new Blob([payload],{type:contentType})});
 if(!response.ok)throw new Error(`Photo upload failed: ${response.status}`);
}

export async function getPhoto(key:string):Promise<StoredPhoto|null>{
 const settings=config();
 const response=await fetch(objectUrl(settings,key),{headers:headers(settings)});
 if(response.status===404)return null;
 if(!response.ok)throw new Error(`Photo download failed: ${response.status}`);
 if(!response.body)return null;
 return {body:response.body,contentType:response.headers.get('Content-Type')||'image/jpeg'};
}

export async function deletePhoto(key:string){
 const settings=config();
 const response=await fetch(`${settings.baseUrl}/storage/v1/object/${encodeURIComponent(settings.bucket)}`,{
  method:'DELETE',
  headers:headers(settings,'application/json'),
  body:JSON.stringify({prefixes:[key]}),
 });
 if(!response.ok&&response.status!==404)throw new Error(`Photo delete failed: ${response.status}`);
}
