"use client";

import { createContext, useContext } from "react";

import type { WorkspaceStorageScope } from "@/lib/workspace-storage";

const WorkspaceStorageContext = createContext<WorkspaceStorageScope | null>(
  null,
);

export function WorkspaceStorageProvider({
  children,
  scope,
}: {
  children: React.ReactNode;
  scope: WorkspaceStorageScope;
}) {
  return (
    <WorkspaceStorageContext.Provider value={scope}>
      {children}
    </WorkspaceStorageContext.Provider>
  );
}

export function useWorkspaceStorage(): WorkspaceStorageScope {
  const scope = useContext(WorkspaceStorageContext);
  if (!scope) {
    throw new Error(
      "useWorkspaceStorage debe usarse dentro de WorkspaceStorageProvider",
    );
  }
  return scope;
}
