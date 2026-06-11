"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/Card";
import { AutomaticosPanel } from "@/components/recommendations/AutomaticosPanel";
import { UserRemindersPanel } from "@/components/reminders/UserRemindersPanel";
import { useAppRecommendations } from "@/hooks/useAppRecommendations";
import { useAppStore } from "@/context/AppStore";
import { pendingUserReminders } from "@/lib/user-reminders";

type AvisosTab = "auto" | "mine";

export default function AvisosPage() {
  const [tab, setTab] = useState<AvisosTab>("mine");
  const { recommendations, factuTips, autoCount } = useAppRecommendations();
  const { data } = useAppStore();
  const pendingTasks = pendingUserReminders(data.userReminders).length;

  return (
    <div>
      <PageHeader
        title="Avisos y recordatorios"
        subtitle="Tus tareas, avisos de la app y consejos de Factu"
      />

      <div className="mb-6 flex gap-2 rounded-2xl bg-slate-100 p-1">
        <TabButton
          active={tab === "mine"}
          onClick={() => setTab("mine")}
          label="Mis tareas"
          count={pendingTasks}
        />
        <TabButton
          active={tab === "auto"}
          onClick={() => setTab("auto")}
          label="Automáticos"
          count={autoCount}
        />
      </div>

      {tab === "mine" ? (
        <UserRemindersPanel />
      ) : (
        <AutomaticosPanel alerts={recommendations} factuTips={factuTips} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
