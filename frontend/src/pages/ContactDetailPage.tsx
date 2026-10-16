import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { SlowServerNotice } from '../components/layout/Notices';
import { Badge, EmptyState, ErrorState, Icon, RelativeTime, buttonClassName } from '../components/ui';
import { ActivityTimeline } from '../features/contacts/activity/ActivityTimeline';
import { ConflictDialog } from '../features/contacts/detail/ConflictDialog';
import { ContactForm } from '../features/contacts/detail/ContactForm';
import { DetailSkeleton } from '../features/contacts/detail/DetailSkeleton';
import { UnsavedChangesGuard } from '../features/contacts/detail/UnsavedChangesGuard';
import { useContactDetail } from '../features/contacts/detail/useContactDetail';
import { TagsCard } from '../features/contacts/tags/TagsCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSlowFlag } from '../hooks/useSlowFlag';
import { describeError } from '../lib/error-messages';
import { formatDate, formatDateTime, fullName } from '../lib/format';
import { readBackSearch } from '../lib/navigation';

/** Composes the contact page: header, form, tags, activity, and the two dialogs. */
export function ContactDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const back = { pathname: '/', search: readBackSearch(location.state) };

  const detail = useContactDetail(id);
  const [dirty, setDirty] = useState(false);
  const slow = useSlowFlag(detail.isLoading);
  const { contact } = detail;
  useDocumentTitle(contact ? fullName(contact) : 'Contact');

  const backLink = (
    <Link to={back} className="back-link">
      <Icon name="arrowLeft" size="sm" /> Back to contacts
    </Link>
  );

  if (detail.isLoading) {
    return (
      <>
        {backLink}
        {slow && <SlowServerNotice />}
        <DetailSkeleton />
      </>
    );
  }

  if (detail.notFound) {
    return (
      <EmptyState
        icon="userX"
        title="Contact not found"
        description="It may have been removed, or the link is wrong."
        action={<Link to={back} className={buttonClassName({ variant: 'primary' })}>Back to contacts</Link>}
      />
    );
  }

  if (!contact) {
    return (
      <>
        {backLink}
        <ErrorState
          variant="block"
          title="Couldn't load this contact"
          message={describeError(detail.loadError)}
          onRetry={detail.retryLoad}
          retrying={detail.reloading}
        />
      </>
    );
  }

  return (
    <>
      {backLink}
      <PageHeader
        title={fullName(contact)}
        meta={
          <>
            <span>version {contact.version}</span>
            <span aria-hidden="true">·</span>
            <span>
              created{' '}
              <time dateTime={contact.createdAt} title={formatDateTime(contact.createdAt)}>
                {formatDate(contact.createdAt)}
              </time>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              updated <RelativeTime iso={contact.updatedAt} />
            </span>
            {dirty && <Badge tone="warning" icon="edit">Unsaved changes</Badge>}
          </>
        }
      />

      {detail.saveError && (
        <ErrorState
          title="Couldn't save your changes"
          message={`${describeError(detail.saveError)} Your edits are still in the form.`}
          onRetry={detail.retrySave}
          retrying={detail.saving}
        />
      )}

      <div className="detail-layout">
        <ContactForm
          contact={contact}
          onSubmit={detail.save}
          saving={detail.saving}
          serverErrors={detail.serverErrors}
          onDirtyChange={setDirty}
        />
        <div className="detail-layout__aside">
          <TagsCard
            tags={contact.tags}
            suggestions={detail.tags.suggestions}
            adding={detail.tags.adding}
            removing={detail.tags.removing}
            onAdd={detail.tags.add}
            onRemove={detail.tags.remove}
          />
          <ActivityTimeline
            activities={detail.activities.items}
            isLoading={detail.activities.isLoading}
            isError={detail.activities.isError}
            onRetry={detail.activities.retry}
          />
        </div>
      </div>

      {detail.conflict && (
        <ConflictDialog
          mine={detail.conflict.mine}
          latest={detail.conflict.latest}
          base={detail.conflict.base}
          busy={detail.saving}
          onDiscard={detail.resolveConflict.discardMine}
          onApplyMine={detail.resolveConflict.applyMine}
          onKeepEditing={detail.resolveConflict.keepEditing}
        />
      )}

      {dirty && <UnsavedChangesGuard subject={fullName(contact)} />}
    </>
  );
}
