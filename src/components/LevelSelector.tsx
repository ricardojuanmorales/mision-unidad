import { LEVELS } from '../data/levels';
import type { GameProgress } from '../types/game';
import { SCORING_CONFIG } from '../utils/scoring';

interface Props {
  progress: GameProgress;
  onSelectLevel: (levelId: number) => void;
}

const MASTERY_LABEL: Record<string, string> = {
  oro: 'Dominio de oro',
  plata: 'Dominio de plata',
  bronce: 'Dominio de bronce',
};

/**
 * Mapa de niveles. Los bloqueados se muestran igualmente, con su requisito
 * visible: saber qué falta motiva más que una tarjeta opaca.
 */
export function LevelSelector({ progress, onSelectLevel }: Props) {
  const unlocked = new Set(progress.unlockedLevels);

  return (
    <section className="levels" aria-labelledby="levels-heading">
      <h2 id="levels-heading">Mapa del laboratorio</h2>
      <p className="levels__intro">
        Diez niveles, diez actividades cada uno. Necesitas{' '}
        {Math.round(SCORING_CONFIG.unlockThreshold * 100)} % de aciertos para abrir el
        siguiente.
      </p>

      <ul className="levels__grid">
        {LEVELS.map((level) => {
          const isUnlocked = unlocked.has(level.id);
          const result = progress.levelResults[level.id];
          const accuracy = result ? Math.round(result.accuracy * 100) : null;
          const mastery = result
            ? result.accuracy === 1 && result.hintsUsed === 0
              ? 'oro'
              : result.accuracy >= 0.9
                ? 'plata'
                : 'bronce'
            : null;

          return (
            <li key={level.id}>
              <button
                type="button"
                className={`level-card ${isUnlocked ? '' : 'level-card--locked'} ${
                  result ? 'level-card--done' : ''
                }`}
                style={{ ['--card-accent' as string]: `var(${level.accent})` }}
                onClick={() => isUnlocked && onSelectLevel(level.id)}
                disabled={!isUnlocked}
                aria-label={
                  isUnlocked
                    ? `Nivel ${level.id}: ${level.title}. ${
                        result
                          ? `Completado con ${accuracy} por ciento de aciertos.`
                          : 'Sin empezar.'
                      }`
                    : `Nivel ${level.id}: ${level.title}. Bloqueado. ${level.unlockRequirement}`
                }
              >
                <span className="level-card__top">
                  <span className="level-card__icon" aria-hidden="true">
                    {isUnlocked ? level.icon : '🔒'}
                  </span>
                  <span className="level-card__number">Nivel {level.id}</span>
                </span>
                <span className="level-card__title">{level.title}</span>
                <span className="level-card__subtitle">{level.subtitle}</span>

                <span className="level-card__status">
                  {!isUnlocked && (
                    <span className="level-card__lock-note">{level.unlockRequirement}</span>
                  )}
                  {isUnlocked && !result && <span className="badge-pill">Disponible</span>}
                  {result && (
                    <>
                      <span className="badge-pill badge-pill--done">
                        {accuracy} % de aciertos
                      </span>
                      {mastery && (
                        <span className={`badge-pill badge-pill--${mastery}`}>
                          {MASTERY_LABEL[mastery]}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
