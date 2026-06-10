export type {
  VerifactuChainState,
  VerifactuInfo,
  VerifactuSettings,
  VerifactuSubmissionStatus,
} from "../types";

export type VerifactuEnvironment = "test" | "production";

export type VerifactuRecordType = "alta" | "anulacion";

export interface VerifactuRegisterInput {
  issuerNif: string;
  numserie: string;
  fecha: string;
  importe: number;
  recordType: VerifactuRecordType;
  previousHash: string;
  environment: VerifactuEnvironment;
  documentId: string;
}

export interface VerifactuRegisterResult {
  verifactu: import("../types").VerifactuInfo;
  xml: string;
  chain: import("../types").VerifactuChainState;
}
