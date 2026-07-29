import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityCard } from './components/ActivityCard';
import { BadgeGallery } from './components/BadgeGallery';
import { ExplanationPanel } from './components/ExplanationPanel';
import { LevelResults } from './components/LevelResults';
import { LevelSelector } from './components/LevelSelector';
import { ProgressTransfer } from './components/ProgressTransfer';
import { ScoreBoard } from './components/ScoreBoard';
import { LEVELS, TOTAL_ACTIVITIES, TOTAL_LEVELS, getLevel } from './data/levels';
import { evaluateBadges } from './data/badges';
import type { AttemptOutcome, GameProgress } from './types/game';
import {
  ENCOURAGEMENT,
  applyOutcomeToStats,
  nextStreak,
  pickMessage,
  scoreActivity,
  summarizeLevel,
  type LevelSummary,
} from './utils/scoring';
import { clearProgress, defaultProgress, loadProgress, saveProgress } from './utils/storage';
import { mergeProgress } from './utils/transfer';
import { validateAnswer } from './utils/validation';

type Screen = 'home' | 'map' | 'play' | 'results' | 'badges' | 'transfer';

/** Estado de la partida en curso dentro de un nivel. */
interface LevelSession {
  levelId: number;
  activityIndex: number;
  attempts: number;
  hintRevealed: boolean;
  parseError?: string;
  lastOutcome?: AttemptOutcome & { message: string; diagnosis?: string };
  outcomes: AttemptOutcome[];
  explanationsRead: number;
}

function newSession(levelId: number): LevelSession {
  return {
    levelId,
    activityIndex: 0,
    attempts: 0,
    hintRevealed: false,
    outcomes: [],
    explanationsRead: 0,
  };
}

export default function App() {
  const [progress, setProgress] = useState<GameProgress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<LevelSession | null>(null);
  const [summary, setSummary] = useState<LevelSummary | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');

  // Persistencia automática: cualquier cambio de progreso se guarda.
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // Tema claro/oscuro aplicado al documento.
  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme;
  }, [progress.theme]);

  const level = session ? getLevel(session.levelId) : undefined;
  const activity = level?.activities[session?.activityIndex ?? 0];

  const startLevel = useCallback((levelId: number) => {
    setSession(newSession(levelId));
    setSummary(null);
    setNewBadges([]);
    setScreen('play');
  }, []);

  /* ---------------------------------------------------------------- */
  /* Responder una actividad                                          */
  /* ---------------------------------------------------------------- */
  const handleSubmit = useCallback(
    (answer: string | string[]) => {
      if (!session || !activity) return;

      const result = validateAnswer(activity, answer);

      // Entrada ilegible: no cuenta como intento, solo se pide corregirla.
      if (result.parseError) {
        setSession({ ...session, parseError: result.parseError });
        return;
      }

      const attempts = session.attempts + 1;

      // Respuesta incorrecta: se permite reintentar sin cerrar la actividad,
      // salvo que ya se hayan agotado los dos intentos.
      if (!result.correct && attempts < 2) {
        setSession({
          ...session,
          attempts,
          parseError: undefined,
        });
        setAnnouncement(
          `${pickMessage(ENCOURAGEMENT.incorrect, attempts)} Te queda un intento.`
        );
        return;
      }

      const streakAfter = nextStreak(progress.stats.currentStreak, result.correct);
      const breakdown = scoreActivity({
        activity,
        correct: result.correct,
        attempts,
        usedHint: session.hintRevealed,
        streakAfter,
      });

      const outcome: AttemptOutcome = {
        activityId: activity.id,
        correct: result.correct,
        attempts,
        usedHint: session.hintRevealed,
        pointsEarned: breakdown.points,
        bonuses: breakdown.bonuses,
      };

      const message = result.correct
        ? pickMessage(ENCOURAGEMENT.correct, attempts + activity.id.length)
        : pickMessage(ENCOURAGEMENT.incorrect, attempts + activity.id.length);

      setProgress((prev) => ({
        ...prev,
        completedActivities: prev.completedActivities.includes(activity.id)
          ? prev.completedActivities
          : [...prev.completedActivities, activity.id],
        stats: applyOutcomeToStats(prev.stats, {
          correct: result.correct,
          usedHint: session.hintRevealed,
          points: breakdown.points,
        }),
      }));

      setSession({
        ...session,
        attempts,
        parseError: undefined,
        outcomes: [...session.outcomes, outcome],
        lastOutcome: { ...outcome, message, diagnosis: result.diagnosis },
      });

      setAnnouncement(
        `${result.correct ? 'Correcto' : 'Incorrecto'}. ${message} ${breakdown.points} puntos.`
      );
    },
    [session, activity, progress.stats.currentStreak]
  );

  /* ---------------------------------------------------------------- */
  /* Avanzar a la siguiente actividad o cerrar el nivel               */
  /* ---------------------------------------------------------------- */
  const handleNext = useCallback(() => {
    if (!session || !level) return;

    const isLast = session.activityIndex >= level.activities.length - 1;
    const explanationsRead = session.explanationsRead + 1;

    if (!isLast) {
      setSession({
        ...session,
        activityIndex: session.activityIndex + 1,
        attempts: 0,
        hintRevealed: false,
        parseError: undefined,
        lastOutcome: undefined,
        explanationsRead,
      });
      return;
    }

    // Cierre del nivel: se calculan bonos, desbloqueo e insignias.
    const outcomes = session.outcomes;
    const correct = outcomes.filter((o) => o.correct).length;
    const rawScore = outcomes.reduce((sum, o) => sum + o.pointsEarned, 0);
    const hintsUsed = outcomes.filter((o) => o.usedHint).length;

    const levelSummary = summarizeLevel({
      rawScore,
      correct,
      total: level.activities.length,
      hintsUsed,
    });

    // El cálculo se hace fuera del actualizador de estado: así podemos
    // derivar las insignias y guardarlas sin provocar efectos secundarios
    // dentro de un updater (que React puede ejecutar más de una vez).
    const bonusPoints = levelSummary.completionBonus + levelSummary.flawlessBonus;
    const nextLevelId = level.id + 1;
    const unlocked =
      levelSummary.unlockedNext && nextLevelId <= TOTAL_LEVELS
        ? Array.from(new Set([...progress.unlockedLevels, nextLevelId]))
        : progress.unlockedLevels;

    const updated: GameProgress = {
      ...progress,
      unlockedLevels: [...unlocked].sort((a, b) => a - b),
      levelResults: {
        ...progress.levelResults,
        [level.id]: {
          levelId: level.id,
          score: levelSummary.finalScore,
          correct,
          total: level.activities.length,
          accuracy: levelSummary.accuracy,
          hintsUsed,
          completedAt: new Date().toISOString(),
        },
      },
      stats: {
        ...progress.stats,
        totalScore: progress.stats.totalScore + bonusPoints,
        explanationsRead: progress.stats.explanationsRead + explanationsRead,
      },
    };

    const earned = evaluateBadges({
      progress: updated,
      justFinishedLevel: level.id,
      levelAccuracy: levelSummary.accuracy,
      levelHintsUsed: hintsUsed,
      levelExplanationsRead: explanationsRead,
      levelActivityCount: level.activities.length,
      totalActivityCount: TOTAL_ACTIVITIES,
    });

    setProgress({ ...updated, badges: [...updated.badges, ...earned] });
    setNewBadges(earned);
    setSummary(levelSummary);
    setScreen('results');
  }, [session, level, progress]);

  const handleRevealHint = useCallback(() => {
    if (!session) return;
    setSession({ ...session, hintRevealed: true });
    setAnnouncement('Pista revelada. Se descontarán 25 puntos de esta actividad.');
  }, [session]);

  const handleResetProgress = useCallback(() => {
    const confirmed = window.confirm(
      '¿Seguro que quieres borrar todo tu progreso? Se perderán los puntos, las insignias y los niveles desbloqueados. Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    clearProgress();
    setProgress(defaultProgress());
    setSession(null);
    setSummary(null);
    setScreen('home');
    setAnnouncement('Progreso borrado. Empiezas de nuevo desde el Nivel 1.');
  }, []);

  /**
   * Aplica un progreso importado desde un archivo. Se sale de cualquier
   * nivel en curso: seguir jugando sobre un estado que acaba de cambiar
   * bajo los pies daría resultados incoherentes.
   */
  const handleImport = useCallback(
    (incoming: GameProgress, mode: 'replace' | 'merge') => {
      const applied =
        mode === 'merge'
          ? mergeProgress(progress, incoming)
          : { ...incoming, theme: progress.theme };

      setProgress(applied);
      setSession(null);
      setSummary(null);
      setNewBadges([]);
      setScreen('map');
      setAnnouncement(
        mode === 'merge'
          ? `Progreso combinado. Ahora tienes ${applied.stats.totalScore} puntos y ${applied.unlockedLevels.length} niveles disponibles.`
          : `Progreso reemplazado. Ahora tienes ${applied.stats.totalScore} puntos y ${applied.unlockedLevels.length} niveles disponibles.`
      );
    },
    [progress]
  );

  const toggleTheme = useCallback(() => {
    setProgress((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const completedCount = progress.completedActivities.length;
  const overallPercent = Math.round((completedCount / TOTAL_ACTIVITIES) * 100);

  const inspiration = useMemo(
    () => pickMessage(ENCOURAGEMENT.inspiration, completedCount),
    [completedCount]
  );

  return (
    <div className="app">
      {/* Región viva: comunica los cambios a los lectores de pantalla */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      <header className="topbar">
        <button
          type="button"
          className="topbar__brand"
          onClick={() => setScreen('home')}
          aria-label="Ir a la pantalla de inicio de Misión Unidad"
        >
          <span aria-hidden="true">🧪</span>
          <span>
            <strong>Misión Unidad</strong>
            <span className="topbar__tagline">Laboratorio de Conversiones Físicas</span>
          </span>
        </button>

        <nav className="topbar__nav" aria-label="Navegación principal">
          <button type="button" className="btn btn--ghost" onClick={() => setScreen('map')}>
            Niveles
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setScreen('badges')}>
            Insignias
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setScreen('transfer')}>
            Mi progreso
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={toggleTheme}
            aria-label={`Cambiar a modo ${progress.theme === 'dark' ? 'claro' : 'oscuro'}`}
          >
            <span aria-hidden="true">{progress.theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="btn__label-desktop">
              {progress.theme === 'dark' ? 'Claro' : 'Oscuro'}
            </span>
          </button>
        </nav>
      </header>

      <main className="main" id="contenido">
        {screen === 'home' && (
          <section className="home" aria-labelledby="home-heading">
            <h1 id="home-heading">
              Misión Unidad
              <span className="home__sub">Laboratorio de Conversiones Físicas</span>
            </h1>

            <p className="home__lead">
              Diez niveles. Cien actividades. Desde medir un lápiz hasta calcular cuánto
              tarda en llenarse una piscina. Aquí no se trata de memorizar tablas, sino de
              entender por qué convertir unidades es cambiar de escala sin perder de vista
              la realidad.
            </p>

            <blockquote className="home__quote">{inspiration}</blockquote>

            <div className="home__stats">
              <div>
                <strong>{progress.stats.totalScore.toLocaleString('es-PR')}</strong>
                <span>puntos acumulados</span>
              </div>
              <div>
                <strong>
                  {completedCount} / {TOTAL_ACTIVITIES}
                </strong>
                <span>actividades ({overallPercent} %)</span>
              </div>
              <div>
                <strong>{progress.stats.bestStreak}</strong>
                <span>mejor racha</span>
              </div>
              <div>
                <strong>{progress.badges.length}</strong>
                <span>insignias</span>
              </div>
            </div>

            <div className="home__actions">
              <button
                type="button"
                className="btn btn--primary btn--large"
                onClick={() => setScreen('map')}
              >
                {completedCount > 0 ? 'Continuar en el laboratorio' : 'Comenzar la misión'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setScreen('transfer')}
              >
                Guardar o trasladar progreso
              </button>
              <button
                type="button"
                className="btn btn--danger-ghost"
                onClick={handleResetProgress}
              >
                Borrar progreso
              </button>
            </div>

            <section className="home__how" aria-labelledby="how-heading">
              <h2 id="how-heading">Cómo funciona</h2>
              <ul>
                <li>
                  <strong>100 puntos</strong> por actividad, más <strong>20</strong> si
                  aciertas al primer intento.
                </li>
                <li>
                  Las <strong>pistas cuestan 25 puntos</strong>, pero nunca te dan la
                  respuesta: te dan el primer paso.
                </li>
                <li>
                  Las <strong>rachas</strong> suman: +30 a las 3 seguidas, +75 a las 5, +150
                  a las 10.
                </li>
                <li>
                  Necesitas <strong>80 % de aciertos</strong> para desbloquear el siguiente
                  nivel.
                </li>
                <li>
                  Después de cada respuesta verás el <strong>procedimiento completo</strong>{' '}
                  y qué ocurre físicamente. Esa parte es la que de verdad enseña.
                </li>
              </ul>
            </section>
          </section>
        )}

        {screen === 'map' && (
          <>
            <ScoreBoard stats={progress.stats} />
            <LevelSelector progress={progress} onSelectLevel={startLevel} />
          </>
        )}

        {screen === 'play' && level && activity && session && (
          <>
            <ScoreBoard
              stats={progress.stats}
              compact
              levelProgress={{
                current: session.activityIndex + (session.lastOutcome ? 1 : 0),
                total: level.activities.length,
                label: `Nivel ${level.id}: ${level.title}`,
              }}
            />

            {session.lastOutcome ? (
              <ExplanationPanel
                activity={activity}
                correct={session.lastOutcome.correct}
                message={session.lastOutcome.message}
                diagnosis={session.lastOutcome.diagnosis}
                pointsEarned={session.lastOutcome.pointsEarned}
                bonuses={session.lastOutcome.bonuses}
                isLastActivity={session.activityIndex >= level.activities.length - 1}
                onNext={handleNext}
              />
            ) : (
              <ActivityCard
                activity={activity}
                index={session.activityIndex}
                total={level.activities.length}
                hintRevealed={session.hintRevealed}
                attempts={session.attempts}
                parseError={session.parseError}
                onRevealHint={handleRevealHint}
                onSubmit={handleSubmit}
              />
            )}

            <p className="play__footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setSession(null);
                  setScreen('map');
                }}
              >
                Salir al mapa (se pierde el avance de este nivel)
              </button>
            </p>
          </>
        )}

        {screen === 'results' && level && summary && (
          <LevelResults
            level={level}
            summary={summary}
            newBadges={newBadges}
            hasNextLevel={level.id < TOTAL_LEVELS}
            onRetry={() => startLevel(level.id)}
            onNextLevel={() => startLevel(level.id + 1)}
            onBackToMap={() => {
              setSession(null);
              setScreen('map');
            }}
          />
        )}

        {screen === 'badges' && (
          <>
            <ScoreBoard stats={progress.stats} />
            <BadgeGallery earned={progress.badges} />
            <p className="badges__reset">
              <button type="button" className="btn btn--danger-ghost" onClick={handleResetProgress}>
                Borrar todo el progreso
              </button>
            </p>
          </>
        )}

        {screen === 'transfer' && (
          <>
            <ProgressTransfer
              progress={progress}
              onImport={handleImport}
              onAnnounce={setAnnouncement}
            />
            <p className="badges__reset">
              <button type="button" className="btn btn--danger-ghost" onClick={handleResetProgress}>
                Borrar todo el progreso de este navegador
              </button>
            </p>
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Misión Unidad · {TOTAL_LEVELS} niveles · {TOTAL_ACTIVITIES} actividades · Tu
          progreso se guarda en este navegador.
        </p>
      </footer>
    </div>
  );
}

/** Export auxiliar para pruebas: lista de niveles disponible desde App. */
export { LEVELS };
