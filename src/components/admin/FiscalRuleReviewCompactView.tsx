import type {
  CompactFiscalReviewView,
  FiscalReviewDecision,
} from "@/lib/fiscal-source-review";

interface FiscalRuleReviewCompactViewProps {
  view: CompactFiscalReviewView;
  onDecision?: (decision: FiscalReviewDecision) => void;
}

const DECISION_LABELS: Record<FiscalReviewDecision, string> = {
  APPROVE: "Aprobar revisión",
  REJECT: "Rechazar",
  REQUEST_CHANGES: "Solicitar cambios",
};

export function FiscalRuleReviewCompactView({
  view,
  onDecision,
}: FiscalRuleReviewCompactViewProps) {
  return (
    <section aria-labelledby={`fiscal-review-${view.ruleId}`}>
      <header>
        <h2 id={`fiscal-review-${view.ruleId}`}>
          Modelo {view.model} · {view.fiscalYear}
        </h2>
        <p>Estado de revisión: {view.reviewState}</p>
        <p>La revisión nunca aprueba automáticamente la regla.</p>
      </header>

      <details open>
        <summary>Condiciones y excepciones</summary>
        <h3>Condiciones</h3>
        <ul>{view.conditions.map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>Excepciones</h3>
        <ul>{view.exceptions.map((item) => <li key={item}>{item}</li>)}</ul>
      </details>

      <details>
        <summary>Pruebas, fuentes e incidencias</summary>
        <h3>Pruebas</h3>
        <ul>{view.testIds.map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>Fuentes</h3>
        <ul>
          {view.sources.map((source) => (
            <li key={source.sourceId}>
              {source.title} · {source.materialScope} · {source.snapshotHash}
            </li>
          ))}
        </ul>
        <h3>Incidencias</h3>
        {view.incidents.length === 0 ? (
          <p>Sin incidencias registradas.</p>
        ) : (
          <ul>{view.incidents.map((item) => <li key={item}>{item}</li>)}</ul>
        )}
      </details>

      <details>
        <summary>Hashes revisados</summary>
        <p>Regla: {view.hashes.ruleHash}</p>
        <ul>
          {view.hashes.sourceHashes.map((hash) => <li key={hash}>{hash}</li>)}
        </ul>
      </details>

      <footer aria-label="Decisión de la revisión fiscal">
        {view.availableDecisions.map((decision) => (
          <button
            key={decision}
            type="button"
            onClick={() => onDecision?.(decision)}
          >
            {DECISION_LABELS[decision]}
          </button>
        ))}
      </footer>
    </section>
  );
}
