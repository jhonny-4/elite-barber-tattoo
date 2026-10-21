// Prueba del handler compilado: todas las llamadas HTTP se interceptan. No usa datos ni correos reales.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const load=createRequire(import.meta.url);
process.env.SUPABASE_SECRET_KEY='qa-only-not-a-real-key';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://qa-supabase.invalid';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='qa-only-not-a-real-key';
process.env.RESEND_API_KEY='qa-only-not-a-real-key';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'}).format(new Date());
const date=new Date(Date.parse(`${today}T12:00:00Z`)+2*86400000).toISOString().slice(0,10);
const barber={id:'11111111-1111-4111-8111-111111111111',slug:'barbero-qa',display_name:'QA',active:true};
const service={id:'22222222-2222-4222-8222-222222222222',slug:'corte',name:'Corte',duration_min:45,price_cop:25000,active:true};
let booking=null,notice=null;
const acceptedMail=new Set();
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(resource,options={})=>{
  const req=resource instanceof Request?resource:null;
  const url=new URL(req?req.url:String(resource));
  const method=options.method??req?.method??'GET';
  const headers=new Headers(options.headers??req?.headers);
  const body=options.body?JSON.parse(options.body):{};
  if(url.hostname==='api.resend.com') {assert.equal(method,'POST');acceptedMail.add(headers.get('Idempotency-Key'));return json({id:'qa-message'});}
  const single=headers.get('Accept')?.includes('vnd.pgrst.object');
  const rows=data=>json(single?(data[0]??null):data);
  const table=url.pathname.split('/').pop();
  if(table==='bookings') return rows(booking?[booking]:[]);
  if(table==='barbers') return rows([barber]);
  if(table==='services') return rows([service]);
  if(table==='barber_services') return rows([{barber_id:barber.id,service_id:service.id}]);
  if(table==='work_hours') return rows(Array.from({length:7},(_,weekday)=>({barber_id:barber.id,weekday,opens:'00:00:00',closes:'23:59:00'})));
  if(table==='breaks') return rows([]);
  if(table==='busy_ranges') return json(booking?[{starts_at:booking.starts_at,ends_at:booking.ends_at}]:[]);
  if(table==='create_booking') {
    if(!booking) booking={id:'33333333-3333-4333-8333-333333333333',barber_id:body.p_barber,service_id:body.p_service,starts_at:body.p_starts.replace('.000Z','+00:00'),ends_at:new Date(Date.parse(body.p_starts)+45*60000).toISOString(),customer_name:body.p_name,customer_phone:body.p_phone,customer_email:body.p_email,access_token_hash:body.p_token_hash,idempotency_key:body.p_idempotency,price_cop:25000,status:'confirmada'};
    return json(booking);
  }
  if(table==='notifications') {
    if(method==='GET') return rows(notice?[notice]:[]);
    notice={id:'44444444-4444-4444-8444-444444444444',...notice,...body};return new Response(null,{status:method==='POST'?201:204});
  }
  throw new Error(`HTTP inesperado bloqueado: ${url.pathname}`);
};
const {POST}=load('../../.next/server/app/api/reservas/route.js').routeModule.userland;
const input={name:'Cliente QA',phone:'3000000001',email:'qa@example.invalid',barberSlug:barber.slug,serviceSlug:service.slug,date,time:'10:00'};
const request=(body,ip='qa-normal')=>new Request('https://elite.example/api/reservas',{method:'POST',headers:{host:'elite.example','Content-Type':'application/json','Idempotency-Key':'qa-booking-idempotency-1','x-forwarded-for':ip},body:JSON.stringify(body)});
(async()=>{
  const created=await POST(request(input));assert.equal(created.status,201,await created.clone().text());const first=await created.json();
  const retried=await POST(request(input));assert.equal(retried.status,201,await retried.clone().text());const second=await retried.json();
  assert.equal(first.id,second.id);assert.equal(first.token,second.token);assert.equal(first.barber,barber.slug);
  assert.equal(createHash('sha256').update(first.token).digest('hex'),booking.access_token_hash);
  assert.equal(acceptedMail.size,1);assert.ok(notice.sent_at);
  const changed=await POST(request({...input,name:'Otra persona'}));assert.equal(changed.status,409);
  const malformed=await POST(request(null));assert.equal(malformed.status,400);
  booking=null;notice=null;
  const simultaneous=await Promise.all([POST(request(input,'qa-parallel')),POST(request(input,'qa-parallel'))]);
  assert.ok(simultaneous.every(r=>r.status===201),'El reintento concurrente debe recuperar la misma reserva');
  const [a,b]=await Promise.all(simultaneous.map(r=>r.json()));assert.equal(a.id,b.id);assert.equal(a.token,b.token);
  console.log('Handler de producción: creación, fecha PostgreSQL, token estable, reintento sin doble correo, conflicto y JSON inválido aprobados. Sin red real.');
})().catch(e=>{console.error(e);process.exitCode=1;});
