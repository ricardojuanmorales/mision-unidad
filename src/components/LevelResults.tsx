import { BADGE_BY_ID } from '../data/badges';
import type { Level } from '../types/game';
import type { LevelSummary } from '../utils/scoring';

interface Props {
  level: Level;
  summary: LevelSummary;
  newBadges: string[];
  hasNextLevel: boolean;
  onRetry: () => void;
  onNextLevel: () => void;
  onBackToMap: () => void;
}

const MASTERY_TEXT: Record<LevelSummary['mastery'], string> = {
  oro: 'Dominio de oro: todo correcto y sin pistas.',
  plata: 'Dominio de plata: excelente precisión.',
  bronce: 'Dominio de bronce: nivel superado.',
  'en progreso': 'Aún no alcanzas el umbral para avanzar.',
};

/** Pantalla de cierre de nivel: resultados, bonos e insignias nuevas. */
export function LevelResults({
  level,
  summary,
  newBadges,
  hasNextLevel,
  onRetry,
  onNextLevel,
  onBackToMap,
}: Props) {
  const accuracyPercent = Math.round(summary.accuracy * 100);

  return (
    <section className="results" aria-labelledby="results-heading">
      <header className="results__header">
        <span className="results__icon" aria-hidden="true">
          {level.icon}
        </span>
        <h2 id="results-heading">Nivel {level.id} completado</h2>
        <p className="results__subtitle">{level.title}</p>
      </header>

      <p
        className={`results__mastery results__mastery--${summary.mastery.replace(' ', '-')}`}
      >
        {MASTERY_TEXT[summary.mastery]}
      </p>

      <dl className="results__grid">
        <div>
          <dt>Aciertos</dt>
          <dd>
            {summary.correct} de {summary.total} ({accuracyPercent} %)
          </dd>
        </div>
        <div>
          <dt>Puntos de actividades</dt>
          <dd>{summary.rawScore.toLocaleString('es-PR')}</dd>
        </div>
        <div>
          <dt>Bono por completar</dt>
          <dd>+{summary.completionBonus}</dd>
        </div>
        <div>
          <dt>Bono sin pistas</dt>
          <dd>{summary.flawlessBonus > 0 ? `+${summary.flawlessBonus}` : '—'}</dd>
        </div>
        <div>
          <dt>Pistas usadas</dt>
          <dd>{summary.hintsUsed}</dd>
        </div>
        <div className="results__total">
          <dt>Total del nivel</dt>
          <dd>{summary.finalScore.toLocaleString('es-PR')}</dd>
        </div>
      </dl>

      {newBadges.length > 0 && (
        <div className="results__badges" role="status">
          <h3>Insignias desbloqueadas</h3>
          <ul>
            {newBadges.map((id) => {
              const badge = BADGE_BY_ID[id];
              if (!badge) return null;
              return (
                <li key={id}>
                  <span aria-hidden="true">{badge.icon}</span> <strong>{badge.name}</strong>
                  <span className="results__badge-desc"> — {badge.description}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="results__unlock">
        {summary.unlockedNext
          ? hasNextLevel
            ? '¡Has desbloqueado el siguiente nivel!'
            : 'Has completado el último nivel del laboratorio.'
          : 'Necesitas 80 % de aciertos para desbloquear el siguiente nivel. Vuelve a intentarlo: los conceptos ya los tienes.'}
      </p>

      <div className="results__actions">
        {summary.unlockedNext && hasNextLevel && (
          <button type="button" className="btn btn--primary" onClick={onNextLevel}>
            Ir al siguiente nivel
          </button>
        )}
        <button type="button" className="btn" onClick={onRetry}>
          Repetir este nivel
        </button>
        <button type="button" className="btn btn--ghost" onClick={onBackToMap}>
          Volver al mapa
        </button>
      </div>
    </section>
  );
}
