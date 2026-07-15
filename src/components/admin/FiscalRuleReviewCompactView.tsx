import type {
  CompactFiscalReviewView,
  FiscalReviewAction,
} from "@/lib/fiscal-source-review";

interface FiscalRuleReviewCompactViewProps {
  view: CompactFiscalReviewView;
  onDecision?: (decision: FiscalReviewAction) => void;
}

const DECISION_LABELS: Record<FiscalReviewAction, string> = {
  APPROVE: "Aprobar revisión",
  REJECT: "Rechazar",
  REQUEST_CHANGES: "Solicitar cambios",
  REVOKE_DECISION: "Revocar decisión",
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
              <strong>{source.title}</strong>
              <dl>
                <dt>Localizador oficial</dt>
                <dd>{source.officialLocator}</dd>
                <dt>Ámbito material</dt>
                <dd>{source.materialScope}</dd>
                <dt>Reglas afectadas</dt>
                <dd>{source.affectedRuleIds.join(", ")}</dd>
                <dt>Validez material</dt>
                <dd>{source.materialValidity.status}</dd>
                <dt>Estado</dt>
                <dd>{source.verificationStatus}</dd>
                <dt>Cambio</dt>
                <dd>
                  {source.changeSummary.status} · {source.changeSummary.nature}
                </dd>
              </dl>
            </li>
          ))}
        </ul>
        <h3>Decisiones fiscales</h3>
        {view.decisions.length === 0 ? (
          <p>Sin decisiones fiscales registradas.</p>
        ) : (
          <ul>
            {view.decisions.map((decision) => (
              <li key={decision.decisionId}>
                {decision.reviewerRole} · {decision.decision} · identidad{" "}
                {decision.trustStatus} · {decision.revocationStatus}
              </li>
            ))}
          </ul>
        )}
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
        <h3>Contenido exacto</h3>
        <ul>
          {view.hashes.sourceContentHashes.map((hash) => (
            <li key={`content-${hash}`}>{hash}</li>
          ))}
        </ul>
        <h3>Contenido normalizado</h3>
        <ul>
          {view.hashes.sourceNormalizedHashes.map((hash) => (
            <li key={`normalized-${hash}`}>{hash}</li>
          ))}
        </ul>
      </details>

      <footer aria-label="Decisión de la revisión fiscal">
        {view.availableActions.map((decision) => (
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
