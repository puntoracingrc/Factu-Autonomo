import {
  evaluateCentralBusinessAuthorityActivation,
  type CentralBusinessAuthorityActivation,
} from "./activation";
import {
  buildCentralBusinessDocumentSeriesReconciliationCommand,
  buildCentralBusinessNumberedDocumentCreateCommand,
  type CentralBusinessDocumentSeriesReconciliationInput,
  type CentralBusinessNumberedDocumentCreateInput,
} from "./numbered-document-command";
import {
  createCentralBusinessNumberedDocumentThroughRpc,
  reconcileCentralBusinessDocumentSeriesThroughRpc,
  type CentralBusinessNumberedDocumentCreateRpcResult,
  type CentralBusinessNumberedDocumentRpcClient,
  type CentralBusinessDocumentSeriesReconciliationRpcResult,
} from "./numbered-document-rpc-adapter";

assertServerOnlyModule();

export class CentralBusinessNumberedDocumentServiceError extends Error {
  readonly code:
    | "CENTRAL_BUSINESS_AUTHORITY_DISABLED"
    | "CENTRAL_BUSINESS_AUTHORITY_SHADOW_ONLY";
  readonly activation: CentralBusinessAuthorityActivation;

  constructor(
    code: CentralBusinessNumberedDocumentServiceError["code"],
    message: string,
    activation: CentralBusinessAuthorityActivation,
  ) {
    super(message);
    this.name = "CentralBusinessNumberedDocumentServiceError";
    this.code = code;
    this.activation = activation;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El servicio numerado de negocio solo puede cargarse en servidor.",
    );
  }
}

function requireWrites(
  activation: CentralBusinessAuthorityActivation,
): CentralBusinessAuthorityActivation {
  if (!activation.writesEnabled) {
    throw new CentralBusinessNumberedDocumentServiceError(
      activation.effectiveMode === "shadow"
        ? "CENTRAL_BUSINESS_AUTHORITY_SHADOW_ONLY"
        : "CENTRAL_BUSINESS_AUTHORITY_DISABLED",
      "La autoridad central no admite documentos numerados para esta cuenta.",
      activation,
    );
  }
  return activation;
}

export async function reconcileCentralBusinessDocumentSeries(input: {
  reconciliation: CentralBusinessDocumentSeriesReconciliationInput;
  rpcClient: CentralBusinessNumberedDocumentRpcClient;
  userEmail?: string | null;
  activation?: CentralBusinessAuthorityActivation;
}): Promise<{
  activation: CentralBusinessAuthorityActivation;
  rpcResult: CentralBusinessDocumentSeriesReconciliationRpcResult;
}> {
  const activation = requireWrites(
    input.activation ??
      evaluateCentralBusinessAuthorityActivation({
        userId: input.reconciliation.auth.userId,
        userEmail: input.userEmail,
      }),
  );
  return {
    activation,
    rpcResult: await reconcileCentralBusinessDocumentSeriesThroughRpc(
      input.rpcClient,
      buildCentralBusinessDocumentSeriesReconciliationCommand(
        input.reconciliation,
      ),
    ),
  };
}

export async function createCentralBusinessNumberedDocument(input: {
  creation: CentralBusinessNumberedDocumentCreateInput;
  rpcClient: CentralBusinessNumberedDocumentRpcClient;
  userEmail?: string | null;
  activation?: CentralBusinessAuthorityActivation;
}): Promise<{
  activation: CentralBusinessAuthorityActivation;
  rpcResult: CentralBusinessNumberedDocumentCreateRpcResult;
}> {
  const activation = requireWrites(
    input.activation ??
      evaluateCentralBusinessAuthorityActivation({
        userId: input.creation.auth.userId,
        userEmail: input.userEmail,
      }),
  );
  return {
    activation,
    rpcResult: await createCentralBusinessNumberedDocumentThroughRpc(
      input.rpcClient,
      buildCentralBusinessNumberedDocumentCreateCommand(input.creation),
    ),
  };
}
