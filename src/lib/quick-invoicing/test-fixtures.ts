import { DEFAULT_PROFILE } from "@/lib/types";
export function syntheticIntent() {
  return { operationId:"a1234567-1234-4123-8123-123456789012",kind:"factura",date:"2026-10-21",
    client:{name:"Cliente sintético",nif:"12345678Z",address:"Calle Prueba 1",postalCode:"08001",city:"Barcelona"},
    items:[{id:"line-1",description:"Cambio de cinta",quantity:1,unitPrice:80,ivaPercent:21,unit:"ud"}],notes:"Avisar antes de venir",paymentMethod:"efectivo",paid:false };
}
export const syntheticProfile = { ...DEFAULT_PROFILE, name:"Empresa sintética",commercialName:"Empresa antigua de prueba",nif:"B12345678",address:"Calle Uno 1",city:"Barcelona",postalCode:"08001",iban:"ES0000000000000000000000" };
