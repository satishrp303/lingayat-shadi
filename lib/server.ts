import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export function database(): D1Database { if(!env.DB) throw new Error('Database unavailable'); return env.DB; }
export function bucket(): R2Bucket { if(!env.BUCKET) throw new Error('Photo storage unavailable'); return env.BUCKET; }
export async function identity(){return await getChatGPTUser()}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return !!origin && origin===new URL(request.url).origin;}
export function failure(error:unknown){console.error('Community operation failed',error instanceof Error?error.message:'Unknown error');return Response.json({error:'unavailable'},{status:503});}
