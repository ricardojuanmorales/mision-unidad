import { useRef, useState } from 'react';
import type { GameProgress } from '../types/game';
import {
  exportProgressToJson,
  hasMeaningfulProgress,
  parseImportedProgress,
  suggestedFileName,
  summarize,
  type TransferSummary,
} from '../utils/transfer';

interface Props {
  progress: GameProgress;
  onImport: (incoming: GameProgress, mode: 'replace' | 'merge') => void;
  onAnnounce: (message: string) => void;
}

/** Estado del archivo leído, a la espera de que el usuario decida qué hacer. */
interface PendingImport {
  progress: GameProgress;
  summary: TransferSummary;
  label?: string;
  exportedAt?: string;
  warnings: string[];
  fileName: string;
}

/**
 * Lee un archivo como texto.
 *
 * `Blob.text()` es lo moderno y limpio, pero no existe en navegadores algo
 * más viejos (ni en algunos entornos de prueba). Se intenta primero y se
 * recurre a FileReader, que está disponible en todas partes.
 */
function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    try {
      const result = file.text();
      if (result && typeof result.then === 'function') return result;
    } catch {
      /* sigue con FileReader */
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Error de lectura'));
    reader.readAsText(file);
  });
}

function formatDate(iso?: string): string {
  if (!iso) return 'fecha desconocida';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'fecha desconocida';
  return date.toLocaleDateString('es-PR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Exportar e importar el progreso como archivo JSON.
 *
 * El flujo de importación es deliberadamente de dos pasos: primero se lee y
 * se muestra QUÉ contiene el archivo frente a lo que ya hay, y solo después
 * el usuario decide reemplazar o combinar. Sobrescribir el trabajo de
 * alguien sin que vea antes qué está cambiando sería inaceptable.
 */
export function ProgressTransfer({ progress, onImport, onAnnounce }: Props) {
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = summarize(progress);
  const currentHasProgress = hasMeaningfulProgress(progress);

  function handleExport() {
    const json = exportProgressToJson(progress, label);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedFileName(label);
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Se libera el objeto en el siguiente ciclo, ya iniciada la descarga.
    setTimeout(() => {
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
    }, 0);
    onAnnounce(`Progreso exportado como ${suggestedFileName(label)}.`);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setPending(null);

    let text: string;
    try {
      text = await readFileAsText(file);
    } catch {
      setError('No se pudo leer el archivo. Intenta seleccionarlo de nuevo.');
      return;
    }

    const result = parseImportedProgress(text);

    // El input se limpia siempre, para poder reintentar con el mismo archivo.
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!result.ok) {
      setError(result.error);
      onAnnounce(`Error al importar: ${result.error}`);
      return;
    }

    setPending({
      progress: result.progress,
      summary: result.summary,
      label: result.label,
      exportedAt: result.exportedAt,
      warnings: result.warnings,
      fileName: file.name,
    });
    onAnnounce('Archivo leído. Revisa el resumen y elige cómo aplicarlo.');
  }

  function applyImport(mode: 'replace' | 'merge') {
    if (!pending) return;
    onImport(pending.progress, mode);
    setPending(null);
    setError(null);
  }

  return (
    <section className="transfer" aria-labelledby="transfer-heading">
      <h2 id="transfer-heading">Guardar o trasladar tu progreso</h2>
      <p className="transfer__intro">
        El progreso vive solo en este navegador. Si cambias de computadora, si
        limpian el equipo de la escuela o si quieres entregar evidencia de tu
        trabajo, descarga un archivo y vuelve a cargarlo donde lo necesites.
      </p>

      <div className="transfer__columns">
        {/* ---------------------------- Exportar ---------------------------- */}
        <div className="transfer__panel">
          <h3>Exportar</h3>

          <label htmlFor="transfer-label" className="transfer__field-label">
            Nombre o grupo <span className="transfer__optional">(opcional)</span>
          </label>
          <input
            id="transfer-label"
            className="transfer__input"
            type="text"
            value={label}
            maxLength={60}
            placeholder="Ej.: Ana Rivera — Física 101"
            onChange={(e) => setLabel(e.target.value)}
            aria-describedby="transfer-label-help"
          />
          <p id="transfer-label-help" className="transfer__help">
            Se guarda dentro del archivo y en su nombre, para distinguirlo si tu
            maestro recoge varios.
          </p>

          <dl className="transfer__summary">
            <div>
              <dt>Puntos</dt>
              <dd>{current.totalScore.toLocaleString('es-PR')}</dd>
            </div>
            <div>
              <dt>Actividades</dt>
              <dd>{current.activitiesCompleted}</dd>
            </div>
            <div>
              <dt>Niveles</dt>
              <dd>{current.levelsCompleted}</dd>
            </div>
            <div>
              <dt>Insignias</dt>
              <dd>{current.badges}</dd>
            </div>
          </dl>

          <button type="button" className="btn btn--primary btn--wide" onClick={handleExport}>
            <span aria-hidden="true">⬇</span> Descargar mi progreso (.json)
          </button>
        </div>

        {/* ---------------------------- Importar ---------------------------- */}
        <div className="transfer__panel">
          <h3>Importar</h3>
          <p className="transfer__help">
            Selecciona un archivo <code>.json</code> exportado desde Misión Unidad.
            Verás un resumen antes de aplicar nada.
          </p>

          <label htmlFor="transfer-file" className="btn btn--wide transfer__file-label">
            <span aria-hidden="true">⬆</span> Elegir archivo…
          </label>
          <input
            id="transfer-file"
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
          />

          {error && (
            <p className="form-error transfer__error" role="alert">
              <span aria-hidden="true">⚠</span> {error}
            </p>
          )}
        </div>
      </div>

      {/* ------------------- Decisión: reemplazar o combinar ------------------- */}
      {pending && (
        <div className="transfer__decision" role="dialog" aria-labelledby="decision-heading">
          <h3 id="decision-heading">¿Cómo quieres aplicar este archivo?</h3>

          <p className="transfer__file-info">
            <strong>{pending.fileName}</strong>
            {pending.label && <> · {pending.label}</>} · exportado el{' '}
            {formatDate(pending.exportedAt)}
          </p>

          {pending.warnings.length > 0 && (
            <ul className="transfer__warnings" role="alert">
              {pending.warnings.map((w, i) => (
                <li key={i}>
                  <span aria-hidden="true">⚠</span> {w}
                </li>
              ))}
            </ul>
          )}

          <table className="transfer__table">
            <caption className="visually-hidden">
              Comparación entre el progreso actual de este navegador y el del archivo
            </caption>
            <thead>
              <tr>
                <th scope="col">Dato</th>
                <th scope="col">Ahora en este navegador</th>
                <th scope="col">En el archivo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Puntos</th>
                <td data-label="Ahora">{current.totalScore.toLocaleString('es-PR')}</td>
                <td data-label="En el archivo">{pending.summary.totalScore.toLocaleString('es-PR')}</td>
              </tr>
              <tr>
                <th scope="row">Actividades completadas</th>
                <td data-label="Ahora">{current.activitiesCompleted}</td>
                <td data-label="En el archivo">{pending.summary.activitiesCompleted}</td>
              </tr>
              <tr>
                <th scope="row">Niveles terminados</th>
                <td data-label="Ahora">{current.levelsCompleted}</td>
                <td data-label="En el archivo">{pending.summary.levelsCompleted}</td>
              </tr>
              <tr>
                <th scope="row">Mejor racha</th>
                <td data-label="Ahora">{current.bestStreak}</td>
                <td data-label="En el archivo">{pending.summary.bestStreak}</td>
              </tr>
              <tr>
                <th scope="row">Insignias</th>
                <td data-label="Ahora">{current.badges}</td>
                <td data-label="En el archivo">{pending.summary.badges}</td>
              </tr>
            </tbody>
          </table>

          <div className="transfer__options">
            <div className="transfer__option">
              <h4>Combinar</h4>
              <p>
                Une los dos progresos y conserva lo mejor de cada uno: todos los niveles
                desbloqueados, todas las insignias y el mejor resultado de cada nivel. No
                se pierde nada.
              </p>
              <button
                type="button"
                className="btn btn--primary btn--wide"
                onClick={() => applyImport('merge')}
              >
                Combinar con mi progreso actual
              </button>
            </div>

            <div className="transfer__option">
              <h4>Reemplazar</h4>
              <p>
                {currentHasProgress
                  ? 'Descarta por completo el progreso de este navegador y deja solo el del archivo. Esta acción no se puede deshacer.'
                  : 'Este navegador no tiene progreso que perder, así que reemplazar es seguro.'}
              </p>
              <button
                type="button"
                className={`btn btn--wide ${currentHasProgress ? 'btn--danger-ghost' : 'btn--primary'}`}
                onClick={() => {
                  if (
                    currentHasProgress &&
                    !window.confirm(
                      'Se borrará el progreso actual de este navegador y quedará solo el del archivo. ¿Continuar?'
                    )
                  ) {
                    return;
                  }
                  applyImport('replace');
                }}
              >
                Reemplazar mi progreso
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setPending(null);
              onAnnounce('Importación cancelada. No se cambió nada.');
            }}
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}
