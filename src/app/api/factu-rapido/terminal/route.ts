import { NextResponse } from "next/server";
import { authenticateQuick, QuickError } from "@/lib/quick-invoicing/server";
import { prepareQuickTerminal, cancelQuickTerminal } from "@/lib/quick-invoicing/terminal-server";
import { quickCollectionId } from "@/lib/quick-invoicing/collections-model";
import { readTextBody } from "@/lib/server/request-body";

export const runtime = "nodejs";
const headers = {"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow",Vary:"Authorization, X-Factu-Device-Token, X-Factu-Company-Id"};
export async function POST(request:Request) {
  try {
    const context=await authenticateQuick(request,{purpose:"payment"});
    const read=await readTextBody(request,{maxBytes:1024,invalidMessage:"Solicitud no válida.",tooLargeMessage:"Solicitud demasiado grande."});
    if (!read.ok) return read.response;
    let body: {operationId?:string;collectionId?:string;action?:string};
    try {
      body=JSON.parse(read.data);
      if (!body || typeof body!=="object") throw new Error();
      if (body.operationId) body.operationId=quickCollectionId(body.operationId);
      if (body.collectionId) body.collectionId=quickCollectionId(body.collectionId);
    } catch { throw new QuickError(400,"NFC_SOURCE_REQUIRED","Cobro no válido."); }
    if (body.action!=="prepare" && body.action!=="cancel") throw new QuickError(400,"NFC_ACTION_INVALID","Acción no válida.");
    const result=body.action==="prepare" ? await prepareQuickTerminal(context,body.operationId,body.collectionId)
      : await cancelQuickTerminal(context,body.operationId,body.collectionId);
    return NextResponse.json({ok:true,...result},{headers});
  } catch(error) {
    return NextResponse.json({ok:false,code:error instanceof QuickError ? error.code : "NFC_UNCONFIRMED",
      message:error instanceof QuickError ? error.message : "No se pudo confirmar el cobro NFC. Comprueba el mismo cobro antes de reintentar."},
      {status:error instanceof QuickError ? error.status : 503,headers});
  }
}
