import type { Activity } from '../types/game';
import { trimNumber } from '../utils/conversions';

interface Props {
  activity: Activity;
  correct: boolean;
  message: string;
  diagnosis?: string;
  pointsEarned: number;
  bonuses: { label: string; points: number }[];
  isLastActivity: boolean;
  onNext: () => void;
}

/** Texto legible de la respuesta correcta, sea número, opción o lista. */
function formatCorrectAnswer(activity: Activity): string {
  const answer = activity.correctAnswer;
  if (Array.isArray(answer)) return answer.join(' → ');
  if (typeof answer === 'number') {
    const text = trimNumber(answer, 6);
    return activity.answerUnit ? `${text} ${activity.answerUnit}` : text;
  }
  return String(answer);
}

/**
 * Panel de retroalimentación que aparece DESPUÉS de responder.
 *
 * Es el corazón pedagógico del juego: aquí no basta con decir "correcto" o
 * "incorrecto". Se muestra siempre el procedimiento completo, el factor
 * usado, el fenómeno físico detrás y una reflexión — incluso cuando el
 * estudiante acertó, porque acertar por casualidad también ocurre.
 */
export function ExplanationPanel({
  activity,
  correct,
  message,
  diagnosis,
  pointsEarned,
  bonuses,
  isLastActivity,
  onNext,
}: Props) {
  return (
    <section
      className={`explanation ${correct ? 'explanation--correct' : 'explanation--incorrect'}`}
      aria-live="polite"
      tabIndex={-1}
    >
      <header className="explanation__header">
        <p className="explanation__verdict">
          {/* El icono y la palabra van juntos: nunca solo color */}
          <span className="explanation__icon" aria-hidden="true">
            {correct ? '✓' : '✗'}
          </span>
          <strong>{correct ? 'Respuesta correcta' : 'Respuesta incorrecta'}</strong>
        </p>
        <p className="explanation__message">{message}</p>
      </header>

      {diagnosis && (
        <p className="explanation__diagnosis">
          <span aria-hidden="true">🔍</span> {diagnosis}
        </p>
      )}

      <dl className="explanation__answer">
        <dt>Respuesta correcta</dt>
        <dd>{formatCorrectAnswer(activity)}</dd>
        <dt>Factor o fórmula</dt>
        <dd>
          <code>{activity.conversionFactor}</code>
        </dd>
      </dl>

      <div className="explanation__block">
        <h3>Procedimiento paso a paso</h3>
        <ol className="explanation__steps">
          {activity.explanationSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="explanation__block">
        <h3>¿Qué ocurre físicamente?</h3>
        <p>{activity.phenomenonExplanation}</p>
      </div>

      <blockquote className="explanation__reflection">{activity.reflection}</blockquote>

      <div className="explanation__score">
        <p className="explanation__points">
          <strong>
            {pointsEarned > 0 ? `+${pointsEarned}` : pointsEarned} puntos
          </strong>
        </p>
        {bonuses.length > 0 && (
          <ul className="explanation__bonuses">
            {bonuses.map((b, i) => (
              <li key={i} className={b.points >= 0 ? 'bonus--plus' : 'bonus--minus'}>
                {b.label}: {b.points >= 0 ? `+${b.points}` : b.points}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="btn btn--primary btn--wide" onClick={onNext} autoFocus>
        {isLastActivity ? 'Ver resultados del nivel' : 'Siguiente actividad'}
      </button>
    </section>
  );
}
