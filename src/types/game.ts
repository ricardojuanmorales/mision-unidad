/**
 * Modelo de datos de "Misión Unidad: Laboratorio de Conversiones Físicas".
 *
 * Todo el contenido educativo del juego se describe con estos tipos.
 * Mantener el contenido separado de la lógica permite que un docente
 * pueda añadir o corregir actividades sin tocar los componentes.
 */

/** Formatos lúdicos disponibles para una actividad. */
export type ActivityType =
  | 'numeric' // respuesta numérica con tolerancia
  | 'multiple-choice' // una opción correcta
  | 'true-false' // verdadero o falso razonado
  | 'ordering' // ordenar de menor a mayor
  | 'matching' // emparejar magnitud con unidad
  | 'error-correction' // corregir el error de un personaje
  | 'multi-step'; // problema numérico de varios pasos

/** Etiqueta pedagógica: nivel cognitivo predominante de la actividad. */
export type CognitiveLevel =
  | 'recordar'
  | 'comprender'
  | 'aplicar'
  | 'analizar'
  | 'evaluar'
  | 'crear';

/** Sabor narrativo del reto, usado para el subtítulo visible al estudiante. */
export type ActivityFlavor =
  | 'reto'
  | 'laboratorio'
  | 'misión'
  | 'relámpago'
  | 'estimación'
  | 'inversa'
  | 'caso'
  | 'detective';

export interface Activity {
  id: string;
  levelId: number;
  title: string;
  type: ActivityType;
  flavor: ActivityFlavor;
  cognitiveLevel: CognitiveLevel;
  /** Magnitud física trabajada, p. ej. "Longitud" o "Densidad". */
  physicalQuantity: string;
  /** Contexto narrativo o situación real que enmarca el problema. */
  context: string;
  /** Pregunta o reto concreto. */
  prompt: string;
  /** Unidades involucradas, mostradas como etiquetas. */
  unitsInvolved: string[];
  /**
   * Respuesta correcta.
   * - numeric / multi-step: number
   * - multiple-choice / true-false / error-correction: string (texto exacto de la opción)
   * - ordering: string[] en el orden correcto (de menor a mayor)
   * - matching: string[] con la unidad correcta para cada par, en orden
   */
  correctAnswer: number | string | string[];
  /** Tolerancia absoluta o relativa aceptada en respuestas numéricas. */
  acceptedTolerance?: number;
  /** Si es true, la tolerancia se interpreta como fracción del valor correcto. */
  relativeTolerance?: boolean;
  /** Unidad de la respuesta numérica, mostrada junto al campo de entrada. */
  answerUnit?: string;
  /** Opciones para multiple-choice, true-false y error-correction. */
  choices?: string[];
  /** Elementos a ordenar (se barajan al presentarse) para ordering. */
  orderingItems?: string[];
  /** Pares izquierda→opciones para matching. */
  matchingPairs?: { left: string; options: string[] }[];
  /** Ayuda que orienta sin revelar el resultado. */
  hint: string;
  /** Puntos base de la actividad. */
  basePoints: number;
  /** Dificultad interna dentro del nivel (1 = suave, 5 = exigente). */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Procedimiento paso a paso mostrado tras responder. */
  explanationSteps: string[];
  /** Factor o fórmula de conversión empleada. */
  conversionFactor: string;
  /** Explicación breve del fenómeno físico relacionado. */
  phenomenonExplanation: string;
  /** Frase de reflexión científica de cierre. */
  reflection: string;
}

export interface Level {
  id: number;
  title: string;
  subtitle: string;
  /** Meta conceptual del nivel, en lenguaje de estudiante. */
  conceptualGoal: string;
  /** Requisito de desbloqueo legible. */
  unlockRequirement: string;
  /** Emoji/símbolo identificador del nivel. */
  icon: string;
  /** Color de acento del nivel (variable CSS). */
  accent: string;
  activities: Activity[];
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/** Estadísticas acumuladas de la partida. */
export interface GameStats {
  currentStreak: number;
  bestStreak: number;
  totalCorrect: number;
  totalIncorrect: number;
  hintsUsed: number;
  totalScore: number;
  explanationsRead: number;
}

/** Resultado guardado de un nivel completado. */
export interface LevelResult {
  levelId: number;
  score: number;
  correct: number;
  total: number;
  accuracy: number;
  hintsUsed: number;
  completedAt: string;
}

/** Estado persistido en localStorage. */
export interface GameProgress {
  version: number;
  unlockedLevels: number[];
  completedActivities: string[];
  levelResults: Record<number, LevelResult>;
  badges: string[];
  stats: GameStats;
  theme: 'light' | 'dark';
}

/** Registro en vivo de la respuesta a una actividad. */
export interface AttemptOutcome {
  activityId: string;
  correct: boolean;
  attempts: number;
  usedHint: boolean;
  pointsEarned: number;
  bonuses: { label: string; points: number }[];
}
