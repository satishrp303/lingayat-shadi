import { z } from 'zod';
import { clearSession, createMember, createSession, currentSessionTokenFromRequest, expiredSessionCookie, findMember, normalizeContact, sessionCookie, validPassword, verifyPassword } from '@/lib/member-auth';
import { failure, sameOrigin } from '@/lib/server';
export const dynamic='force-dynamic';

const authSchema=z.object({action:z.enum(['signin','signup','signout']),identifier:z.string().max(120).optional(),password:z.string().max(100).optional()});

export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'forbidden'},{status:403});
 try{
  const body=authSchema.safeParse(await request.json().catch(()=>null));
  if(!body.success)return Response.json({error:'invalid'},{status:400});
  if(body.data.action==='signout'){
   await clearSession(currentSessionTokenFromRequest(request));
   return Response.json({ok:true},{headers:{'Set-Cookie':expiredSessionCookie()}});
  }
  const contact=normalizeContact(body.data.identifier||'');
  const password=body.data.password||'';
  if(!contact||!validPassword(password))return Response.json({error:'invalid-auth'},{status:400});
  const existing=await findMember(contact.contact);
  if(body.data.action==='signup'){
   if(existing)return Response.json({error:'account-exists'},{status:409});
   const id=await createMember(contact.contact,contact.type,password);
   const token=await createSession(id);
   return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie(token)}});
  }
  if(!existing||!await verifyPassword(password,existing.password_hash))return Response.json({error:'bad-login'},{status:401});
  const token=await createSession(existing.id);
  return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie(token)}});
 }catch(e){return failure(e)}
}
