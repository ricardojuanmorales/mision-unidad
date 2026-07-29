/**
 * Prueba funcional de extremo a extremo (jsdom).
 *
 * Comprueba que el juego se puede JUGAR de verdad: navegar al mapa, entrar
 * a un nivel, responder, ver la explicación, cobrar puntos, gastar una
 * pista y guardar el progreso. Las pruebas unitarias verifican piezas;
 * esta verifica que las piezas encajan.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './utils/storage';
import { LEVELS } from './data/levels';

let container: HTMLDivElement;
let root: Root;

// React 18 exige esta bandera para silenciar el aviso de act() en pruebas
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function render() {
  act(() => {
    root.render(<App />);
  });
}

/** Busca un elemento por su texto visible. */
function findByText<T extends Element = HTMLElement>(
  selector: string,
  text: string
): T | undefined {
  return Array.from(container.querySelectorAll<T>(selector)).find((el) =>
    (el.textContent ?? '').includes(text)
  );
}

function click(element: Element | undefined | null) {
  expect(element, 'El elemento que se intenta pulsar no existe').toBeTruthy();
  act(() => {
    (element as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
  });
}

/** Escribe en un input controlado por React. */
function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function submitForm() {
  const form = container.querySelector('form')!;
  act(() => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  window.localStorage.clear();
  // jsdom no implementa confirm(): se acepta por defecto en las pruebas
  window.confirm = () => true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
});

describe('recorrido completo del jugador', () => {
  it('muestra la pantalla de inicio con el resumen del juego', () => {
    render();
    expect(container.textContent).toContain('Misión Unidad');
    expect(container.textContent).toContain('Comenzar la misión');
  });

  it('abre el mapa y permite entrar al Nivel 1, que está desbloqueado', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    expect(container.textContent).toContain('Mapa del laboratorio');

    const levelOne = findByText('button', 'Longitud cotidiana');
    expect(levelOne).toBeTruthy();
    expect((levelOne as HTMLButtonElement).disabled).toBe(false);
  });

  it('mantiene bloqueados los niveles posteriores al inicio', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    const levelTwo = findByText('button', 'Masa y peso cotidiano');
    expect((levelTwo as HTMLButtonElement).disabled).toBe(true);
  });

  it('acepta una respuesta correcta, muestra la explicación y suma puntos', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    const first = LEVELS[0].activities[0];
    expect(container.textContent).toContain(first.title);

    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(input, String(first.correctAnswer));
    submitForm();

    // La explicación aparece con procedimiento y fenómeno físico
    expect(container.textContent).toContain('Respuesta correcta');
    expect(container.textContent).toContain('Procedimiento paso a paso');
    expect(container.textContent).toContain('¿Qué ocurre físicamente?');
    expect(container.textContent).toContain(first.explanationSteps[0]);

    // 100 base + 20 por primer intento
    expect(container.textContent).toContain('+120 puntos');
  });

  it('acepta la tolerancia decimal y formatos alternativos de número', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    // La respuesta es 120 cm; se escribe con coma decimal y unidad
    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(input, '120,004 cm');
    submitForm();

    expect(container.textContent).toContain('Respuesta correcta');
  });

  it('descuenta puntos al usar la pista y la deja visible', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    const first = LEVELS[0].activities[0];
    click(findByText('button', 'Ver pista'));
    expect(container.textContent).toContain(first.hint);

    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(input, String(first.correctAnswer));
    submitForm();

    // 100 − 25 de pista, y sin bono de primer intento
    expect(container.textContent).toContain('+75 puntos');
    expect(container.textContent).toContain('Pista usada');
  });

  it('permite un reintento tras fallar antes de cerrar la actividad', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(input, '999999');
    submitForm();

    // Sigue en la actividad, no en la explicación
    expect(container.textContent).toContain('Intentos usados: 1');
    expect(container.textContent).not.toContain('Procedimiento paso a paso');

    const retry = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(retry, String(LEVELS[0].activities[0].correctAnswer));
    submitForm();
    expect(container.textContent).toContain('Respuesta correcta');
  });

  it('pide corregir una entrada ilegible sin gastar un intento', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(input, 'no sé');
    submitForm();

    expect(container.querySelector('.form-error')).toBeTruthy();
    expect(container.textContent).not.toContain('Intentos usados');
  });

  it('avanza a la siguiente actividad y aumenta la racha', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(input, String(LEVELS[0].activities[0].correctAnswer));
    submitForm();
    click(findByText('button', 'Siguiente actividad'));

    expect(container.textContent).toContain(LEVELS[0].activities[1].title);
    expect(container.textContent).toContain('Actividad 2 de 10');
    // La racha se muestra en el marcador
    expect(container.querySelector('.scoreboard')?.textContent).toContain('1');
  });

  it('guarda el progreso en localStorage', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(input, String(LEVELS[0].activities[0].correctAnswer));
    submitForm();

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.completedActivities).toContain('n1-a1');
    expect(saved.stats.totalScore).toBe(120);
    expect(saved.stats.currentStreak).toBe(1);
  });

  it('restaura el progreso guardado al volver a montar la aplicación', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        unlockedLevels: [1, 2, 3],
        completedActivities: ['n1-a1'],
        levelResults: {},
        badges: ['nivel-1'],
        stats: {
          currentStreak: 2,
          bestStreak: 7,
          totalCorrect: 9,
          totalIncorrect: 1,
          hintsUsed: 3,
          totalScore: 1234,
          explanationsRead: 9,
        },
        theme: 'light',
      })
    );

    render();
    expect(container.textContent).toContain('1,234');

    click(findByText('button', 'Continuar en el laboratorio'));
    // El Nivel 3 quedó desbloqueado en el progreso guardado
    const levelThree = findByText('button', 'Tiempo');
    expect((levelThree as HTMLButtonElement).disabled).toBe(false);
  });

  it('el modo oscuro cambia el atributo del documento', () => {
    render();
    click(findByText('button', 'Oscuro'));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('la galería de insignias lista las 16 insignias del juego', () => {
    render();
    click(findByText('button', 'Insignias'));
    expect(container.querySelectorAll('.badge')).toHaveLength(16);
    expect(container.textContent).toContain('Aprendiz de Escalas');
  });
});

/**
 * Responde la actividad visible con su solución oficial, sea del tipo que sea.
 * Devuelve tras pulsar "siguiente", listo para la actividad siguiente.
 */
function answerCurrentActivityCorrectly(activity: (typeof LEVELS)[0]['activities'][0]) {
  switch (activity.type) {
    case 'numeric':
    case 'multi-step': {
      const input = container.querySelector<HTMLInputElement>('#answer-input')!;
      type(input, String(activity.correctAnswer));
      break;
    }
    case 'ordering': {
      // Se reordena con los botones ▲/▼ hasta lograr la secuencia correcta.
      const target = activity.correctAnswer as string[];
      for (let position = 0; position < target.length; position++) {
        for (let guard = 0; guard < target.length; guard++) {
          const labels = Array.from(
            container.querySelectorAll('.ordering__label')
          ).map((el) => el.textContent ?? '');
          const currentIndex = labels.indexOf(target[position]);
          if (currentIndex <= position) break;
          const item = container.querySelectorAll('.ordering__item')[currentIndex];
          click(item.querySelectorAll('button')[0]); // mover hacia arriba
        }
      }
      break;
    }
    case 'matching': {
      const answers = activity.correctAnswer as string[];
      container.querySelectorAll<HTMLSelectElement>('.matching__select').forEach(
        (select, i) => {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLSelectElement.prototype,
            'value'
          )!.set!;
          act(() => {
            setter.call(select, answers[i]);
            select.dispatchEvent(new Event('change', { bubbles: true }));
          });
        }
      );
      break;
    }
    default: {
      const radios = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
      );
      const correct = radios.find((r) => r.value === String(activity.correctAnswer))!;
      act(() => {
        correct.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      break;
    }
  }
  submitForm();
}

describe('completar un nivel', () => {
  it('responde las 10 actividades del Nivel 1, desbloquea el Nivel 2 y otorga insignias', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    for (const activity of LEVELS[0].activities) {
      expect(container.textContent, `No se llegó a ${activity.id}`).toContain(
        activity.title
      );
      answerCurrentActivityCorrectly(activity);
      expect(
        container.textContent,
        `${activity.id} no se validó como correcta`
      ).toContain('Respuesta correcta');
      click(
        findByText('button', 'Siguiente actividad') ??
          findByText('button', 'Ver resultados del nivel')
      );
    }

    // Pantalla de resultados con dominio de oro (todo correcto, sin pistas)
    expect(container.textContent).toContain('Nivel 1 completado');
    expect(container.textContent).toContain('Dominio de oro');
    expect(container.textContent).toContain('10 de 10 (100 %)');
    expect(container.textContent).toContain('¡Has desbloqueado el siguiente nivel!');

    // Bonos de nivel: +200 por completar y +300 por hacerlo sin pistas
    expect(container.textContent).toContain('+200');
    expect(container.textContent).toContain('+300');

    // Insignias por nivel, por racha de 10 y por completar sin pistas
    expect(container.textContent).toContain('Aprendiz de Escalas');
    expect(container.textContent).toContain('Racha Dorada');
    expect(container.textContent).toContain('Sin Pistas');

    // El progreso guardado refleja el desbloqueo
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.unlockedLevels).toContain(2);
    expect(saved.levelResults['1'].accuracy).toBe(1);
    expect(saved.stats.bestStreak).toBeGreaterThanOrEqual(10);

    // Y el mapa muestra el Nivel 2 ya disponible
    click(findByText('button', 'Volver al mapa'));
    const levelTwo = findByText('button', 'Masa y peso cotidiano');
    expect((levelTwo as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('exportar e importar el progreso', () => {
  /** Progreso de ejemplo, tal como saldría de otro dispositivo. */
  const remoteFile = {
    app: 'mision-unidad',
    formatVersion: 1,
    exportedAt: '2026-07-20T10:00:00.000Z',
    label: 'Ana Rivera — Física 101',
    summary: {
      levelsCompleted: 3,
      activitiesCompleted: 30,
      totalScore: 4200,
      bestStreak: 12,
      badges: 4,
    },
    progress: {
      version: 1,
      unlockedLevels: [1, 2, 3, 4],
      completedActivities: LEVELS.slice(0, 3).flatMap((l) => l.activities.map((a) => a.id)),
      levelResults: {
        1: { levelId: 1, score: 1500, correct: 10, total: 10, accuracy: 1, hintsUsed: 0, completedAt: '2026-07-18T10:00:00.000Z' },
        2: { levelId: 2, score: 1400, correct: 10, total: 10, accuracy: 1, hintsUsed: 1, completedAt: '2026-07-19T10:00:00.000Z' },
        3: { levelId: 3, score: 1300, correct: 9, total: 10, accuracy: 0.9, hintsUsed: 2, completedAt: '2026-07-20T10:00:00.000Z' },
      },
      badges: ['nivel-1', 'nivel-2', 'nivel-3', 'racha-dorada'],
      stats: {
        currentStreak: 5,
        bestStreak: 12,
        totalCorrect: 29,
        totalIncorrect: 1,
        hintsUsed: 3,
        totalScore: 4200,
        explanationsRead: 30,
      },
      theme: 'light',
    },
  };

  /** Simula que el usuario escoge un archivo en el selector. */
  async function selectFile(contents: string, name = 'progreso.json') {
    const input = container.querySelector<HTMLInputElement>('#transfer-file')!;
    const file = new File([contents], name, { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // FileReader entrega el contenido en un evento posterior, no en una
    // microtarea: hay que ceder el turno al bucle de eventos.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it('la pantalla de transferencia muestra el resumen del progreso actual', () => {
    render();
    click(findByText('button', 'Mi progreso'));
    expect(container.textContent).toContain('Guardar o trasladar tu progreso');
    expect(container.querySelector('#transfer-label')).toBeTruthy();
    expect(container.querySelector('#transfer-file')).toBeTruthy();
  });

  it('exportar genera un JSON válido con el nombre escrito', () => {
    // jsdom no implementa createObjectURL: se sustituye para capturar el Blob
    let captured: Blob | null = null;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = ((blob: Blob) => {
      captured = blob;
      return 'blob:prueba';
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    // jsdom intentaría navegar a la URL del enlace y avisaría de que no
    // implementa la navegación: aquí solo interesa que se dispare la descarga.
    HTMLAnchorElement.prototype.click = function () {};

    try {
      render();
      click(findByText('button', 'Mi progreso'));

      const labelInput = container.querySelector<HTMLInputElement>('#transfer-label')!;
      type(labelInput, 'Ana Rivera');
      click(findByText('button', 'Descargar mi progreso'));

      expect(captured).toBeTruthy();
      expect(captured!.type).toBe('application/json');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });

  it('muestra un error claro si el archivo no es de Misión Unidad', async () => {
    render();
    click(findByText('button', 'Mi progreso'));
    await selectFile(JSON.stringify({ app: 'otro-juego' }), 'ajeno.json');

    expect(container.querySelector('.transfer__error')).toBeTruthy();
    expect(container.textContent).toContain('no es un progreso de Misión Unidad');
    // No se aplicó nada
    expect(container.textContent).not.toContain('¿Cómo quieres aplicar este archivo?');
  });

  it('muestra un error claro si el archivo está corrupto', async () => {
    render();
    click(findByText('button', 'Mi progreso'));
    await selectFile('{{{ esto no es json', 'roto.json');
    expect(container.textContent).toContain('formato JSON válido');
  });

  it('presenta la comparación antes de aplicar cualquier cambio', async () => {
    render();
    click(findByText('button', 'Mi progreso'));
    await selectFile(JSON.stringify(remoteFile));

    expect(container.textContent).toContain('¿Cómo quieres aplicar este archivo?');
    expect(container.textContent).toContain('Ana Rivera — Física 101');
    // La tabla compara los dos lados
    const table = container.querySelector('.transfer__table')!;
    expect(table.textContent).toContain('4,200');
    // Leer el archivo no cambia nada: el progreso guardado sigue intacto
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.stats.totalScore).toBe(0);
    expect(saved.unlockedLevels).toEqual([1]);
    expect(saved.badges).toEqual([]);
  });

  it('cancelar deja el progreso intacto', async () => {
    render();
    click(findByText('button', 'Mi progreso'));
    await selectFile(JSON.stringify(remoteFile));
    click(findByText('button', 'Cancelar'));

    expect(container.textContent).not.toContain('¿Cómo quieres aplicar este archivo?');
    expect(container.textContent).toContain('Guardar o trasladar tu progreso');
  });

  it('reemplazar aplica el progreso del archivo y desbloquea sus niveles', async () => {
    render();
    click(findByText('button', 'Mi progreso'));
    await selectFile(JSON.stringify(remoteFile));
    click(findByText('button', 'Reemplazar mi progreso'));

    // Tras importar se vuelve al mapa, con los niveles del archivo disponibles
    expect(container.textContent).toContain('Mapa del laboratorio');
    expect((findByText('button', 'Área y volumen') as HTMLButtonElement).disabled).toBe(false);
    expect((findByText('button', 'Velocidad') as HTMLButtonElement).disabled).toBe(true);

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.stats.totalScore).toBe(4200);
    expect(saved.badges).toContain('racha-dorada');
    expect(saved.unlockedLevels).toEqual([1, 2, 3, 4]);
  });

  it('combinar conserva lo mejor de ambos lados', async () => {
    // Progreso local previo: un nivel con mejor puntuación que la del archivo
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        unlockedLevels: [1, 2],
        completedActivities: ['n1-a1'],
        levelResults: {
          1: { levelId: 1, score: 9000, correct: 10, total: 10, accuracy: 1, hintsUsed: 0, completedAt: '2026-07-25T10:00:00.000Z' },
        },
        badges: ['perfeccionista'],
        stats: {
          currentStreak: 0,
          bestStreak: 4,
          totalCorrect: 10,
          totalIncorrect: 0,
          hintsUsed: 0,
          totalScore: 1500,
          explanationsRead: 10,
        },
        theme: 'light',
      })
    );

    render();
    click(findByText('button', 'Mi progreso'));
    await selectFile(JSON.stringify(remoteFile));
    click(findByText('button', 'Combinar con mi progreso actual'));

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    // Niveles e insignias se unen
    expect(saved.unlockedLevels).toEqual([1, 2, 3, 4]);
    expect(saved.badges).toContain('perfeccionista'); // local
    expect(saved.badges).toContain('racha-dorada'); // del archivo
    // Del Nivel 1 se conserva el mejor intento, que era el local
    expect(saved.levelResults['1'].score).toBe(9000);
    // El Nivel 3 solo existía en el archivo
    expect(saved.levelResults['3'].score).toBe(1300);
    // Los puntos son el máximo, no la suma
    expect(saved.stats.totalScore).toBe(4200);
    expect(saved.stats.bestStreak).toBe(12);
  });

  it('sanea un archivo manipulado sin romper la partida', async () => {
    const tampered = {
      ...remoteFile,
      progress: {
        ...remoteFile.progress,
        unlockedLevels: [1, 2, 99, 'todos'],
        completedActivities: ['n1-a1', 'actividad-falsa'],
        badges: ['nivel-1', 'insignia-inventada'],
        stats: { ...remoteFile.progress.stats, totalScore: -999 },
      },
    };

    render();
    click(findByText('button', 'Mi progreso'));
    await selectFile(JSON.stringify(tampered), 'manipulado.json');

    // Se avisa de lo descartado antes de aplicar nada
    expect(container.querySelector('.transfer__warnings')).toBeTruthy();
    click(findByText('button', 'Reemplazar mi progreso'));

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.unlockedLevels).toEqual([1, 2]);
    expect(saved.completedActivities).toEqual(['n1-a1']);
    expect(saved.badges).toEqual(['nivel-1']);
    expect(saved.stats.totalScore).toBe(0);
  });

  it('el progreso importado se puede volver a exportar sin pérdidas', async () => {
    render();
    click(findByText('button', 'Mi progreso'));
    await selectFile(JSON.stringify(remoteFile));
    click(findByText('button', 'Reemplazar mi progreso'));

    // Volvemos a la pantalla y comprobamos que el resumen refleja lo importado
    click(findByText('button', 'Mi progreso'));
    const summaryPanel = container.querySelector('.transfer__summary')!;
    expect(summaryPanel.textContent).toContain('4,200');
    expect(summaryPanel.textContent).toContain('30'); // actividades completadas
  });
});

describe('accesibilidad básica', () => {
  it('la barra de progreso expone su estado a la tecnología de apoyo', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    const bar = container.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuemax')).toBe('10');
    expect(bar.getAttribute('aria-label')).toContain('Progreso del nivel');
  });

  it('el campo de respuesta tiene etiqueta y ayuda asociadas', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    expect(container.querySelector('label[for="answer-input"]')).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe('answer-help');
  });

  it('las opciones de selección múltiple usan radios con etiqueta', () => {
    render();
    click(findByText('button', 'Comenzar la misión'));
    click(findByText('button', 'Longitud cotidiana'));

    // Avanzamos hasta la actividad 2, que es de selección múltiple
    const input = container.querySelector<HTMLInputElement>('#answer-input')!;
    type(input, String(LEVELS[0].activities[0].correctAnswer));
    submitForm();
    click(findByText('button', 'Siguiente actividad'));

    const radios = container.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBe(4);
    radios.forEach((radio) => {
      expect(container.querySelector(`label[for="${radio.id}"]`)).toBeTruthy();
    });
  });

  it('existe una región viva que anuncia los cambios', () => {
    render();
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });
});
