import { NextResponse } from "next/server";
import { QuickError } from "@/lib/quick-invoicing/server";
import { terminalDeviceAction } from "@/lib/quick-invoicing/terminal-server";
import { readTextBody } from "@/lib/server/request-body";

export const runtime="nodejs";
const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow",Vary:"Authorization"};
export async function POST(request:Request) {
  try {
    const body=await readTextBody(request,{maxBytes:256,invalidMessage:"Solicitud no válida.",tooLargeMessage:"Solicitud demasiado grande."});
    if (!body.ok) return body.response;
    let action: string;
    try {action=JSON.parse(body.data)?.action;} catch {throw new QuickError(400,"NFC_ACTION_INVALID","Acción no válida.");}
    if (!["intent","check","token"].includes(action)) throw new QuickError(400,"NFC_ACTION_INVALID","Acción no válida.");
    return NextResponse.json({ok:true,...await terminalDeviceAction(request,action)},{headers});
  } catch(error) {
    return NextResponse.json({ok:false,code:error instanceof QuickError ? error.code : "NFC_UNCONFIRMED",
      message:error instanceof QuickError ? error.message : "No se pudo confirmar el cobro NFC. Vuelve al mismo cobro en Fast."},
      {status:error instanceof QuickError ? error.status : 503,headers});
  }
}
