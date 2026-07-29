import type { GameStats } from '../types/game';

interface Props {
  stats: GameStats;
  levelProgress?: { current: number; total: number; label: string };
  compact?: boolean;
}

/**
 * Marcador permanente: puntos, racha actual, mejor racha y progreso.
 *
 * La racha se comunica con número Y con texto ("3 seguidas"), nunca solo
 * con color o con un icono: quien no distinga colores debe recibir
 * exactamente la misma información.
 */
export function ScoreBoard({ stats, levelProgress, compact = false }: Props) {
  const percent =
    levelProgress && levelProgress.total > 0
      ? Math.round((levelProgress.current / levelProgress.total) * 100)
      : 0;

  return (
    <section
      className={`scoreboard ${compact ? 'scoreboard--compact' : ''}`}
      aria-label="Marcador del juego"
    >
      <div className="scoreboard__stats">
        <div className="stat">
          <span className="stat__label" id="stat-puntos">
            Puntos
          </span>
          <span className="stat__value" aria-labelledby="stat-puntos">
            {stats.totalScore.toLocaleString('es-PR')}
          </span>
        </div>

        <div className="stat">
          <span className="stat__label" id="stat-racha">
            Racha actual
          </span>
          <span className="stat__value" aria-labelledby="stat-racha">
            {stats.currentStreak}
            <span className="stat__unit"> seguidas</span>
          </span>
        </div>

        <div className="stat">
          <span className="stat__label" id="stat-mejor">
            Mejor racha
          </span>
          <span className="stat__value" aria-labelledby="stat-mejor">
            {stats.bestStreak}
          </span>
        </div>

        {!compact && (
          <div className="stat">
            <span className="stat__label" id="stat-pistas">
              Pistas usadas
            </span>
            <span className="stat__value" aria-labelledby="stat-pistas">
              {stats.hintsUsed}
            </span>
          </div>
        )}
      </div>

      {levelProgress && (
        <div className="scoreboard__progress">
          <div className="progress__header">
            <span>{levelProgress.label}</span>
            <span>
              {levelProgress.current} de {levelProgress.total} · {percent} %
            </span>
          </div>
          <div
            className="progress__track"
            role="progressbar"
            aria-valuenow={levelProgress.current}
            aria-valuemin={0}
            aria-valuemax={levelProgress.total}
            aria-label={`Progreso del nivel: ${levelProgress.current} de ${levelProgress.total} actividades`}
          >
            <div className="progress__fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}
