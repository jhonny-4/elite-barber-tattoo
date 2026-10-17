import {emptyState, tattooStatuses, type DemoState} from '../domain/demo';
const key = 'zenko.elite.demo.v1';
export function readDemo():DemoState {
  const raw = localStorage.getItem(key);
  if (!raw) return emptyState();
  const state = JSON.parse(raw) as DemoState;
  if(state.version!==1 || !Array.isArray(state.bookings) || !Array.isArray(state.requests) || !state.bookings.every(b=>b && ['id','barberId','serviceId','date','time','name','phone'].every(k=>typeof b[k as keyof typeof b]==='string') && ['reservada-demo','cancelada'].includes(b.status)) || !state.requests.every(r=>r && ['id','name','phone','idea','placement','size'].every(k=>typeof r[k as keyof typeof r]==='string') && tattooStatuses.includes(r.status))) throw new Error('Los datos demo guardados no son compatibles. Puedes restablecerlos desde el panel.');
  return state;
}
export function saveDemo(state:DemoState) {localStorage.setItem(key,JSON.stringify(state));}
