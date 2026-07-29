import {
  evaluateCentralBusinessAuthorityActivation,
  type CentralBusinessAuthorityActivation,
} from "./activation";
import {
  buildCentralBusinessMutationCommand,
  type CentralBusinessMutationInput,
} from "./mutation-command";
import {
  mutateCentralBusinessThroughRpc,
  type CentralBusinessMutationRpcClient,
  type CentralBusinessMutationRpcResult,
} from "./mutation-rpc-adapter";

assertServerOnlyModule();

export class CentralBusinessMutationServiceError extends Error {
  readonly code:
    | "CENTRAL_BUSINESS_AUTHORITY_DISABLED"
    | "CENTRAL_BUSINESS_AUTHORITY_SHADOW_ONLY";
  readonly activation: CentralBusinessAuthorityActivation;

  constructor(
    code: CentralBusinessMutationServiceError["code"],
    message: string,
    activation: CentralBusinessAuthorityActivation,
  ) {
    super(message);
    this.name = "CentralBusinessMutationServiceError";
    this.code = code;
    this.activation = activation;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El servicio central de datos de negocio solo puede cargarse en servidor.",
    );
  }
}

export async function mutateCentralBusinessEntity(input: {
  mutation: CentralBusinessMutationInput;
  rpcClient: CentralBusinessMutationRpcClient;
  userEmail?: string | null;
  activation?: CentralBusinessAuthorityActivation;
}): Promise<{
  activation: CentralBusinessAuthorityActivation;
  rpcResult: CentralBusinessMutationRpcResult;
}> {
  const activation =
    input.activation ??
    evaluateCentralBusinessAuthorityActivation({
      userId: input.mutation.auth.userId,
      userEmail: input.userEmail,
    });
  if (!activation.writesEnabled) {
    throw new CentralBusinessMutationServiceError(
      activation.effectiveMode === "shadow"
        ? "CENTRAL_BUSINESS_AUTHORITY_SHADOW_ONLY"
        : "CENTRAL_BUSINESS_AUTHORITY_DISABLED",
      "La autoridad central de datos de negocio no admite escrituras para esta cuenta.",
      activation,
    );
  }

  const command = buildCentralBusinessMutationCommand(input.mutation);
  return {
    activation,
    rpcResult: await mutateCentralBusinessThroughRpc(
      input.rpcClient,
      command,
    ),
  };
}
