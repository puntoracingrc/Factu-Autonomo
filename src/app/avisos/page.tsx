"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/Card";
import { AutomaticosPanel } from "@/components/recommendations/AutomaticosPanel";
import { UserRemindersPanel } from "@/components/reminders/UserRemindersPanel";
import { useAppRecommendations } from "@/hooks/useAppRecommendations";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { markRemindersSeen } from "@/lib/reminder-team";
import { pendingUserReminders } from "@/lib/user-reminders";
import {
  nextAvisosTabForKey,
  type AvisosTab,
} from "@/lib/avisos-tabs";

export default function AvisosPage() {
  const [tab, setTab] = useState<AvisosTab>("mine");
  const { recommendations, factuTips, autoCount } = useAppRecommendations();
  const { data } = useAppStore();
  const { syncNow } = useCloudSync();
  const pendingTasks = pendingUserReminders(data.userReminders).length;
  const tabRefs = useRef<Partial<Record<AvisosTab, HTMLButtonElement>>>({});

  // Una vez al abrir Avisos: traer recordatorios del equipo (el pull periódico sigue en CloudSync).
  useEffect(() => {
    void syncNow();
  }, [syncNow]);

  useEffect(() => {
    if (tab === "mine") {
      markRemindersSeen();
    }
  }, [tab, pendingTasks]);

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: AvisosTab,
  ) {
    const nextTab = nextAvisosTabForKey(currentTab, event.key);
    if (!nextTab) return;
    event.preventDefault();
    setTab(nextTab);
    window.requestAnimationFrame(() => tabRefs.current[nextTab]?.focus());
  }

  return (
    <div>
      <PageHeader
        title="Avisos y recordatorios"
        subtitle="Tus tareas, avisos de la app y consejos de Factu"
      />

      <div
        role="tablist"
        aria-label="Tipos de avisos"
        className="mb-6 flex gap-2 rounded-2xl bg-slate-100 p-1"
      >
        <TabButton
          id="avisos-tab-mine"
          controls="avisos-panel-mine"
          active={tab === "mine"}
          onClick={() => setTab("mine")}
          onKeyDown={(event) => handleTabKeyDown(event, "mine")}
          buttonRef={(element) => {
            tabRefs.current.mine = element ?? undefined;
          }}
          label="Mis tareas"
          count={pendingTasks}
        />
        <TabButton
          id="avisos-tab-auto"
          controls="avisos-panel-auto"
          active={tab === "auto"}
          onClick={() => setTab("auto")}
          onKeyDown={(event) => handleTabKeyDown(event, "auto")}
          buttonRef={(element) => {
            tabRefs.current.auto = element ?? undefined;
          }}
          label="Automáticos"
          count={autoCount}
        />
      </div>

      {tab === "mine" ? (
        <div
          id="avisos-panel-mine"
          role="tabpanel"
          aria-labelledby="avisos-tab-mine"
          tabIndex={0}
        >
          <UserRemindersPanel />
        </div>
      ) : (
        <div
          id="avisos-panel-auto"
          role="tabpanel"
          aria-labelledby="avisos-tab-auto"
          tabIndex={0}
        >
          <AutomaticosPanel alerts={recommendations} factuTips={factuTips} />
        </div>
      )}
    </div>
  );
}

function TabButton({
  id,
  controls,
  active,
  onClick,
  onKeyDown,
  buttonRef,
  label,
  count,
}: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
  label: string;
  count: number;
}) {
  return (
    <button
      id={id}
      ref={buttonRef}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
      {count > 0 ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
          }`}
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}
