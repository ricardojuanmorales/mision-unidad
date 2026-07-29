import { BADGES } from '../data/badges';

interface Props {
  earned: string[];
  compact?: boolean;
}

/**
 * Galería de insignias. Las no obtenidas se muestran en gris CON su
 * descripción: una insignia bloqueada solo motiva si se sabe cómo ganarla.
 */
export function BadgeGallery({ earned, compact = false }: Props) {
  const owned = new Set(earned);

  return (
    <section className="badges" aria-labelledby="badges-heading">
      <h2 id="badges-heading">
        Insignias{' '}
        <span className="badges__count">
          {owned.size} de {BADGES.length}
        </span>
      </h2>

      <ul className={`badges__grid ${compact ? 'badges__grid--compact' : ''}`}>
        {BADGES.map((badge) => {
          const has = owned.has(badge.id);
          return (
            <li
              key={badge.id}
              className={`badge ${has ? 'badge--earned' : 'badge--locked'}`}
            >
              <span className="badge__icon" aria-hidden="true">
                {badge.icon}
              </span>
              <span className="badge__body">
                <span className="badge__name">
                  {badge.name}
                  <span className="visually-hidden">
                    {has ? ' (obtenida)' : ' (aún no obtenida)'}
                  </span>
                </span>
                <span className="badge__description">{badge.description}</span>
              </span>
              <span className="badge__state" aria-hidden="true">
                {has ? '✓' : '—'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
