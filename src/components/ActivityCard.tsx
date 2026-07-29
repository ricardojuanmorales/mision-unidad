import { useEffect, useMemo, useRef, useState } from 'react';
import type { Activity } from '../types/game';
import { FLAVOR_LABELS, TYPE_LABELS } from '../data/levels';
import { seedFromId, seededShuffle } from '../utils/validation';
import { HintButton } from './HintButton';

interface Props {
  activity: Activity;
  index: number;
  total: number;
  hintRevealed: boolean;
  attempts: number;
  parseError?: string;
  onRevealHint: () => void;
  onSubmit: (answer: string | string[]) => void;
}

/**
 * Tarjeta de actividad: presenta el reto y recoge la respuesta.
 *
 * Cada tipo de actividad usa el control nativo más accesible posible:
 * radios para opciones, listas con botones para ordenar y <select> para
 * emparejar. Se evita el arrastrar-y-soltar a propósito, porque no funciona
 * con teclado ni con lectores de pantalla.
 */
export function ActivityCard({
  activity,
  index,
  total,
  hintRevealed,
  attempts,
  parseError,
  onRevealHint,
  onSubmit,
}: Props) {
  const [numericValue, setNumericValue] = useState('');
  const [choice, setChoice] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const [matches, setMatches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const seed = useMemo(() => seedFromId(activity.id), [activity.id]);

  // Reinicia el formulario al cambiar de actividad y mueve el foco al título,
  // para que quien navegue con lector de pantalla sepa que hubo un cambio.
  useEffect(() => {
    setNumericValue('');
    setChoice('');
    setOrder(activity.orderingItems ? seededShuffle(activity.orderingItems, seed) : []);
    setMatches(activity.matchingPairs ? activity.matchingPairs.map(() => '') : []);
    headingRef.current?.focus();
    if (activity.type === 'numeric' || activity.type === 'multi-step') {
      inputRef.current?.focus();
    }
  }, [activity, seed]);

  const shuffledChoices = useMemo(() => {
    if (!activity.choices) return [];
    // Verdadero/Falso conserva su orden natural; el resto se baraja.
    if (activity.type === 'true-false') return activity.choices;
    return seededShuffle(activity.choices, seed);
  }, [activity, seed]);

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    switch (activity.type) {
      case 'numeric':
      case 'multi-step':
        onSubmit(numericValue);
        break;
      case 'ordering':
        onSubmit(order);
        break;
      case 'matching':
        onSubmit(matches);
        break;
      default:
        onSubmit(choice);
    }
  }

  const canSubmit = (() => {
    switch (activity.type) {
      case 'numeric':
      case 'multi-step':
        return numericValue.trim() !== '';
      case 'ordering':
        return order.length > 0;
      case 'matching':
        return matches.every((m) => m !== '');
      default:
        return choice !== '';
    }
  })();

  return (
    <article className="activity" aria-labelledby="activity-title">
      <header className="activity__header">
        <p className="activity__meta">
          <span className="chip chip--index">
            Actividad {index + 1} de {total}
          </span>
          <span className="chip">{FLAVOR_LABELS[activity.flavor]}</span>
          <span className="chip">{TYPE_LABELS[activity.type]}</span>
          <span className="chip chip--quantity">{activity.physicalQuantity}</span>
          <span className="chip chip--difficulty">
            Dificultad {activity.difficulty} de 5
          </span>
        </p>
        <h2 id="activity-title" ref={headingRef} tabIndex={-1}>
          {activity.title}
        </h2>
        <p className="activity__context">{activity.context}</p>
      </header>

      <p className="activity__units">
        <span className="activity__units-label">Unidades:</span>
        {activity.unitsInvolved.map((u) => (
          <span key={u} className="unit-tag">
            {u}
          </span>
        ))}
      </p>

      <form onSubmit={handleSubmit} className="activity__form">
        <fieldset className="activity__fieldset">
          <legend className="activity__prompt">{activity.prompt}</legend>

          {(activity.type === 'numeric' || activity.type === 'multi-step') && (
            <div className="answer-row">
              <label htmlFor="answer-input" className="visually-hidden">
                Escribe tu respuesta numérica
                {activity.answerUnit ? ` en ${activity.answerUnit}` : ''}
              </label>
              <input
                id="answer-input"
                ref={inputRef}
                className="answer-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
                placeholder="Ej.: 3500 o 3.5e3"
                aria-describedby={parseError ? 'answer-error' : 'answer-help'}
                aria-invalid={parseError ? true : undefined}
              />
              {activity.answerUnit && (
                <span className="answer-unit" aria-hidden="true">
                  {activity.answerUnit}
                </span>
              )}
            </div>
          )}

          {(activity.type === 'numeric' || activity.type === 'multi-step') && (
            <p id="answer-help" className="answer-help">
              Puedes escribir decimales con punto o coma, y usar notación científica
              (3.5e3).
            </p>
          )}

          {(activity.type === 'multiple-choice' ||
            activity.type === 'true-false' ||
            activity.type === 'error-correction') && (
            <ul className="choices">
              {shuffledChoices.map((option, i) => {
                const id = `choice-${i}`;
                return (
                  <li key={option}>
                    <input
                      type="radio"
                      id={id}
                      name="choice"
                      value={option}
                      checked={choice === option}
                      onChange={() => setChoice(option)}
                    />
                    <label htmlFor={id} className="choice">
                      <span className="choice__marker" aria-hidden="true">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="choice__text">{option}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {activity.type === 'ordering' && (
            <ol className="ordering">
              {order.map((item, i) => (
                <li key={item} className="ordering__item">
                  <span className="ordering__position" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="ordering__label">{item}</span>
                  <span className="ordering__controls">
                    <button
                      type="button"
                      className="btn btn--icon"
                      onClick={() => moveItem(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`Mover ${item} hacia arriba, posición ${i}`}
                    >
                      <span aria-hidden="true">▲</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn--icon"
                      onClick={() => moveItem(i, i + 1)}
                      disabled={i === order.length - 1}
                      aria-label={`Mover ${item} hacia abajo, posición ${i + 2}`}
                    >
                      <span aria-hidden="true">▼</span>
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {activity.type === 'matching' && activity.matchingPairs && (
            <ul className="matching">
              {activity.matchingPairs.map((pair, i) => {
                const id = `match-${i}`;
                return (
                  <li key={pair.left} className="matching__row">
                    <label htmlFor={id} className="matching__left">
                      {pair.left}
                    </label>
                    <select
                      id={id}
                      className="matching__select"
                      value={matches[i] ?? ''}
                      onChange={(e) => {
                        const next = [...matches];
                        next[i] = e.target.value;
                        setMatches(next);
                      }}
                    >
                      <option value="">Elige…</option>
                      {pair.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        {parseError && (
          <p id="answer-error" className="form-error" role="alert">
            <span aria-hidden="true">⚠</span> {parseError}
          </p>
        )}

        {attempts > 0 && !parseError && (
          <p className="attempts-note" role="status">
            Intentos usados: {attempts}. Puedes volver a intentarlo.
          </p>
        )}

        <div className="activity__actions">
          <HintButton
            hint={activity.hint}
            revealed={hintRevealed}
            onReveal={onRevealHint}
          />
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            Verificar respuesta
          </button>
        </div>
      </form>
    </article>
  );
}
