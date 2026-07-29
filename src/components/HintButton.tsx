import { SCORING_CONFIG } from '../utils/scoring';

interface Props {
  hint: string;
  revealed: boolean;
  disabled?: boolean;
  onReveal: () => void;
}

/**
 * Botón de pista con descuento explícito.
 *
 * El costo se anuncia ANTES de pulsar: pedir ayuda debe ser una decisión
 * informada, no una trampa. Una vez revelada, la pista queda visible para
 * que el estudiante pueda releerla sin volver a pagar.
 */
export function HintButton({ hint, revealed, disabled, onReveal }: Props) {
  if (revealed) {
    return (
      <div className="hint hint--revealed" role="note">
        <p className="hint__title">
          <span aria-hidden="true">💡</span> Pista
        </p>
        <p className="hint__text">{hint}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn btn--hint"
      onClick={onReveal}
      disabled={disabled}
      aria-label={`Ver la pista. Cuesta ${SCORING_CONFIG.hintPenalty} puntos.`}
    >
      <span aria-hidden="true">💡</span> Ver pista (−{SCORING_CONFIG.hintPenalty} pts)
    </button>
  );
}
