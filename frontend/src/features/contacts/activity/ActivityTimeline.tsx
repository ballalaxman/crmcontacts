import { useId } from 'react';
import { Badge, Chip, ErrorState, Icon, RelativeTime, Skeleton, Truncate, type IconName, type Tone } from '../../../components/ui';
import type { ActivityDto, ActivityType } from '../../../contracts/api-types';
import { fieldLabel, formatValue } from '../../../lib/format';

const TYPE_STYLE: Record<ActivityType, { label: string; tone: Tone; icon: IconName }> = {
  CONTACT_UPDATED: { label: 'Updated', tone: 'info', icon: 'edit' },
  TAG_ADDED: { label: 'Tag added', tone: 'success', icon: 'tag' },
  TAG_REMOVED: { label: 'Tag removed', tone: 'neutral', icon: 'minus' },
};

interface ActivityTimelineProps {
  activities: ActivityDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ActivityTimeline({ activities, isLoading, isError, onRetry }: ActivityTimelineProps) {
  const headingId = useId();
  return (
    <section className="card stack" aria-labelledby={headingId}>
      <div className="card__header">
        <h2 id={headingId}>Recent activity</h2>
      </div>

      {isLoading && (
        <div className="stack-sm" role="status" aria-label="Loading activity">
          <Skeleton width="lg" />
          <Skeleton width="md" />
          <Skeleton width="lg" />
        </div>
      )}
      {isError && <ErrorState message="Couldn't load activity." onRetry={onRetry} />}
      {activities?.length === 0 && (
        <p className="timeline__empty muted">
          <Icon name="clock" size="sm" /> No activity yet. Edits and tag changes will show up here.
        </p>
      )}
      {activities && activities.length > 0 && (
        <ol className="timeline">
          {activities.map((a) => <ActivityItem key={a.id} activity={a} />)}
        </ol>
      )}
    </section>
  );
}

function ActivityItem({ activity: a }: { activity: ActivityDto }) {
  const style = TYPE_STYLE[a.type];
  return (
    <li className="timeline__item" data-type={a.type}>
      <span className={`timeline__marker timeline__marker--${style.tone}`}>
        <Icon name={style.icon} size="sm" />
      </span>
      <div className="timeline__content">
        <div className="timeline__head">
          <span className="timeline__actor">{a.actor ?? 'Someone'}</span>
          <Badge tone={style.tone}>{style.label}</Badge>
          <RelativeTime iso={a.createdAt} className="timeline__time muted" />
        </div>
        {a.type === 'CONTACT_UPDATED' ? (
          <ul className="timeline__changes">
            {(a.changes ?? []).map((c) => (
              <li key={c.field}>
                <span className="timeline__field">{fieldLabel(c.field)}</span>
                <span className="timeline__value timeline__value--from"><Truncate text={formatValue(c.from)} /></span>
                <span aria-hidden="true">→</span>
                <span className="sr-only">changed to</span>
                <span className="timeline__value timeline__value--to"><Truncate text={formatValue(c.to)} /></span>
              </li>
            ))}
          </ul>
        ) : (
          a.tag && <Chip>{a.tag}</Chip>
        )}
      </div>
    </li>
  );
}
