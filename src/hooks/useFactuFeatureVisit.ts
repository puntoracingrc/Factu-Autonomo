"use client";

import { useEffect } from "react";
import {
  markFactuFeatureUsed,
  type FactuFeatureId,
} from "@/lib/factu/feature-usage";

/** Marca una función como usada al entrar en su pantalla. */
export function useFactuFeatureVisit(featureId: FactuFeatureId): void {
  useEffect(() => {
    markFactuFeatureUsed(featureId);
  }, [featureId]);
}
