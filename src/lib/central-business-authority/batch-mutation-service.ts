import type { CentralBusinessAuthorityActivation } from "./activation";
import {
  evaluateCentralBusinessAuthorityActivation,
} from "./activation";
import {
  mutateCentralBusinessBatchThroughRpc,
  type CentralBusinessBatchMutationRpcClient,
  type CentralBusinessBatchMutationRpcResult,
} from "./batch-mutation-rpc-adapter";
import {
  buildCentralBusinessMutationCommand,
  type CentralBusinessMutationInput,
} from "./mutation-command";
import { CentralBusinessMutationServiceError } from "./mutation-service";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_BATCH_MUTATION_SERVICE =
  "CENTRAL_BUSINESS_BATCH_MUTATION_SERVICE_V1";

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El servicio atomico de negocio solo puede cargarse en servidor.",
    );
  }
}

export async function mutateCentralBusinessBatch(input: {
  mutations: CentralBusinessMutationInput[];
  rpcClient: CentralBusinessBatchMutationRpcClient;
  userEmail?: string | null;
  activation?: CentralBusinessAuthorityActivation;
}): Promise<{
  activation: CentralBusinessAuthorityActivation;
  rpcResult: CentralBusinessBatchMutationRpcResult;
}> {
  const first = input.mutations[0];
  const activation =
    input.activation ??
    evaluateCentralBusinessAuthorityActivation({
      userId: first?.auth.userId,
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
  const commands = input.mutations.map((mutation) =>
    buildCentralBusinessMutationCommand(mutation),
  );
  return {
    activation,
    rpcResult: await mutateCentralBusinessBatchThroughRpc(
      input.rpcClient,
      commands,
    ),
  };
}
