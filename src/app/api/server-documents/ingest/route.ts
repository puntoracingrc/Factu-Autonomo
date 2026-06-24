import {
  handleServerDocumentIngestRoute,
  serverDocumentIngestMethodNotAllowedResponse,
} from "@/lib/server-documents/route-handler";

export async function POST(request: Request) {
  return handleServerDocumentIngestRoute(request);
}

export async function GET() {
  return serverDocumentIngestMethodNotAllowedResponse();
}
