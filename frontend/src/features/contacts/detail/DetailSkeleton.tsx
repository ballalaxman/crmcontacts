import { Skeleton, skeletonWidth } from '../../../components/ui';
import { EDITABLE_FIELDS } from '../../../contracts/api-types';

/** Same layout as the loaded page: header, form card, tags and activity cards. */
export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading contact">
      <div className="page-header">
        <div className="page-header__titles detail-skeleton__title">
          <Skeleton variant="title" width="md" />
          <Skeleton width="sm" />
        </div>
      </div>
      <div className="detail-layout">
        <div className="card stack">
          <Skeleton variant="title" width="xs" />
          {EDITABLE_FIELDS.map((f, i) => (
            <div key={f} className="stack-sm">
              <Skeleton width={i % 2 ? 'xs' : 'sm'} />
              <Skeleton variant="control" />
            </div>
          ))}
        </div>
        <div className="detail-layout__aside">
          <div className="card stack">
            <Skeleton variant="title" width="xs" />
            <Skeleton width="md" />
            <Skeleton variant="control" />
          </div>
          <div className="card stack">
            <Skeleton variant="title" width="sm" />
            {[0, 1, 2].map((i) => <Skeleton key={i} width={skeletonWidth(i)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
