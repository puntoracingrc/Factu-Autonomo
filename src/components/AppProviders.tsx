"use client";

import { QuickToolsProvider } from "@/components/documents/QuickToolsProvider";
import { ConditionalAppShell } from "@/components/layout/ConditionalAppShell";
import { AppErrorMonitor } from "@/components/monitoring/AppErrorMonitor";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { WorkspaceServerAdoptionGate } from "@/components/workspace/WorkspaceServerAdoptionGate";
import { WorkspaceHistoricalArchiveGate } from "@/components/workspace/WorkspaceHistoricalArchiveGate";
import { WorkspaceStorageBoundary } from "@/components/workspace/WorkspaceStorageBoundary";
import { AppStoreProvider } from "@/context/AppStore";
import { BillingProvider } from "@/context/BillingContext";
import { CloudAuthProvider } from "@/context/CloudAuthContext";
import { CloudSyncProvider } from "@/context/CloudSyncContext";
import { CentralAuthorityPlanGateProvider } from "@/hooks/useCentralAuthorityPlanGate";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CloudAuthProvider>
      <WorkspaceStorageBoundary>
        {(scope) => (
          <AppStoreProvider
            key={scope.storageKey}
            ownerScope={scope.ownerScope}
            storageKey={scope.storageKey}
          >
            <CloudSyncProvider>
              <WorkspaceHistoricalArchiveGate>
                <WorkspaceServerAdoptionGate>
                  <BillingProvider>
                    <CentralAuthorityPlanGateProvider>
                      <QuickToolsProvider>
                        <ConditionalAppShell>{children}</ConditionalAppShell>
                      </QuickToolsProvider>
                      <AppErrorMonitor />
                      <RegisterServiceWorker />
                    </CentralAuthorityPlanGateProvider>
                  </BillingProvider>
                </WorkspaceServerAdoptionGate>
              </WorkspaceHistoricalArchiveGate>
            </CloudSyncProvider>
          </AppStoreProvider>
        )}
      </WorkspaceStorageBoundary>
    </CloudAuthProvider>
  );
}
