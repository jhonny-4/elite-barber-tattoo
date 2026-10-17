import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addBooking,addTattooRequest,emptyState} from '../src/domain/demo.ts';
const input={barberId:'barbero-1',serviceId:'corte-barba',date:'2099-10-20',time:'10:00',name:'Cliente demo',phone:'3000000000'};
test('rechaza cruces parciales, permite citas contiguas y profesionales distintos',()=>{const s=addBooking(emptyState(),input);assert.throws(()=>addBooking(s,{...input,time:'10:30'}),/cruza/);assert.equal(addBooking(s,{...input,time:'10:45'}).bookings.length,2);assert.equal(addBooking(s,{...input,barberId:'barbero-2'}).bookings.length,2);});
test('cancelar libera disponibilidad',()=>{const s=addBooking(emptyState(),input);s.bookings[0].status='cancelada';assert.equal(addBooking(s,input).bookings.length,2);});
test('valida servicio, fecha, hora y contacto',()=>{for(const override of [{serviceId:'otro'},{date:'2020-01-01'},{time:'17:45'},{phone:'x'}])assert.throws(()=>addBooking(emptyState(),{...input,...override}));});
test('tatuajes quedan pendientes y requieren descripción',()=>{const r={name:'Demo',phone:'3000000000',idea:'Una idea de prueba',placement:'Brazo',size:'10 cm',referenceName:null};assert.equal(addTattooRequest(emptyState(),r).requests[0].status,'pendiente');assert.throws(()=>addTattooRequest(emptyState(),{...r,idea:'x'}));});
