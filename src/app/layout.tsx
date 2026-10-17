import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata = {title:'Elite Barber & Tattoo | Prototipo ZENKO',description:'Demostración de barbería y portafolio de Jean Carlos en Cartagena.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="es"><body>{children}</body></html>;}
