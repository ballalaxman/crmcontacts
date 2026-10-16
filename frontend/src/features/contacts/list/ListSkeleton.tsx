import { Skeleton, skeletonWidth } from '../../../components/ui';

const ROWS = 8;

/** Placeholder shaped like the real layout, so nothing jumps when the data arrives. */
export function ListSkeleton({ compact }: { compact: boolean }) {
  return (
    <div role="status" aria-label="Loading contacts" className={compact ? 'contact-cards' : 'table-wrap'}>
      {compact ? (
        <ul className="contact-cards__list">
          {Array.from({ length: ROWS / 2 }, (_, i) => (
            <li key={i} className="contact-card contact-card--skeleton">
              <Skeleton variant="circle" />
              <div className="contact-card__body">
                <Skeleton variant="title" width={skeletonWidth(i)} />
                <Skeleton width="md" />
                <Skeleton width="sm" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <table className="contacts-table" aria-hidden="true">
          <tbody>
            {Array.from({ length: ROWS }, (_, r) => (
              <tr key={r}>
                <td><Skeleton variant="circle" /></td>
                {Array.from({ length: 6 }, (_, c) => (
                  <td key={c}><Skeleton width={skeletonWidth(r + c)} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
