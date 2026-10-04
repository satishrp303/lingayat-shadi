import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { crc32 } from 'node:zlib';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5184';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Tests only run against loopback');
const tag=randomUUID();const people=['a','b','c'].map(v=>({id:`test-${tag}-${v}`,email:`test-${v}@example.test`}));
async function request(person,path='/api/community',body,extra={}){const headers={Origin:base,...extra};if(person){headers['oai-authenticated-user-id']=person.id;headers['oai-authenticated-user-email']=person.email}if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';const res=await fetch(base+path,{method:body?'POST':'GET',headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});return res}
async function read(person){const r=await request(person);assert.equal(r.status,200);return r.json()}
const details={name:'Local test member',age:28,gender:'woman',community:'Mali',city:'Pune',occupation:'Test profession',education:'Test education',marital:'never',bio:'Disposable local integration test profile only.',published:true,consent:true};
try{
 assert.equal((await request(null,'/api/community',{action:'save-profile',profile:details})).status,401);
 for(const p of people)assert.equal((await request(p,'/api/community',{action:'save-profile',profile:details})).status,200);
 const [a,b,c]=await Promise.all(people.map(read));const ids=[a.profile.id,b.profile.id,c.profile.id];
 assert.ok(!JSON.stringify(a.profiles).includes('@example.test'),'Directory must hide emails');
 assert.equal((await request(people[0],'/api/community',{action:'save-profile',profile:{...details,age:17}})).status,400);
 assert.equal((await request(people[0],'/api/community',{action:'shortlist',target:ids[1],saved:true})).status,200);
 assert.ok((await read(people[0])).shortlisted.some(p=>p.id===ids[1]));
 const sends=await Promise.all([request(people[0],'/api/community',{action:'interest',target:ids[1]}),request(people[1],'/api/community',{action:'interest',target:ids[0]})]);
 assert.deepEqual(sends.map(r=>r.status).sort(),[200,409],'Reciprocal requests must produce one interest');
 let senderIndex=sends[0].status===200?0:1,recipientIndex=1-senderIndex;
 let recipient=await read(people[recipientIndex]);let item=recipient.received.find(i=>i.sender===ids[senderIndex]);assert.ok(item);assert.equal(item.email,null);
 assert.equal((await request(people[2],'/api/community',{action:'respond',id:item.id,status:'accepted'})).status,404);
 assert.equal((await request(people[recipientIndex],'/api/community',{action:'respond',id:item.id,status:'accepted'})).status,200);
 assert.equal((await read(people[senderIndex])).sent.find(i=>i.id===item.id).email,people[recipientIndex].email);
 assert.equal((await read(people[recipientIndex])).received.find(i=>i.id===item.id).email,people[senderIndex].email);
 const png=await fs.readFile(new URL('../public/wedding-hero.png',import.meta.url));
 const metadata=Buffer.from('Comment\0GPS private test');const chunk=Buffer.alloc(metadata.length+12);chunk.writeUInt32BE(metadata.length,0);chunk.write('tEXt',4);metadata.copy(chunk,8);chunk.writeUInt32BE(crc32(chunk.subarray(4,-4)),chunk.length-4);
 const photo=Buffer.concat([png.subarray(0,33),chunk,png.subarray(33)]);const form=new FormData();form.set('photo',new Blob([photo],{type:'image/png'}),'test.png');
 assert.equal((await request(people[0],'/api/photo',form)).status,200);
 const image=await request(people[1],`/api/photo?id=${ids[0]}`);assert.equal(image.status,200);assert.ok(!Buffer.from(await image.arrayBuffer()).includes(Buffer.from('GPS private test')));
 assert.equal((await request(null,`/api/photo?id=${ids[0]}`)).status,401);
 assert.equal((await request(people[0],'/api/community',{action:'save-profile',profile:{...details,published:false}})).status,200);
 assert.ok(!(await read(people[1])).profiles.some(p=>p.id===ids[0]));assert.equal((await request(people[1],`/api/photo?id=${ids[0]}`)).status,404);
 assert.equal((await request(people[0],'/api/community',{action:'shortlist',target:ids[1],saved:true},{Origin:'https://untrusted.example'})).status,403);
 console.log('PASS: authorization, validation, profiles, persistent shortlist, duplicate-interest protection, acceptance privacy, photo metadata removal, visibility, and CSRF.');
}finally{for(const p of people){const r=await request(p,'/api/community',{action:'delete-profile'});assert.ok([200,409].includes(r.status))}console.log('Local test profiles removed.');}
