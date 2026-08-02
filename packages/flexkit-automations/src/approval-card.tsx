import type { JSX } from 'react';
import { useState, useTransition } from 'react';
import { format, formatDistance } from 'date-fns';
import { ArrowRightIcon, CheckIcon, LoaderCircle, MoveRightIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@flexkit/studio/ui';
import type { ApiClient } from './api';
import type {
  AutomationApproval,
  AutomationApprovalOperation,
  AutomationApprovalPreviewOperation,
  AutomationApprovalStatus,
} from './types';

const APPROVAL_STATUS_STYLES: { [status in AutomationApprovalStatus]: string } = {
  approved: 'fk:bg-success/20 fk:text-success',
  cancelled: 'fk:bg-secondary fk:text-secondary-foreground',
  expired: 'fk:bg-secondary fk:text-secondary-foreground',
  pending: 'fk:bg-amber-500/20 fk:text-amber-600',
  rejected: 'fk:bg-destructive/15 fk:text-destructive',
};

export function ApprovalStatusBadge({ status }: { status: AutomationApprovalStatus }): JSX.Element {
  return (
    <Badge
      className={`fk:border-none fk:h-4.75 fk:text-[0.6875rem] fk:leading-4.5 fk:tracking-wide ${APPROVAL_STATUS_STYLES[status]}`}
      variant="secondary"
    >
      {status}
    </Badge>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function DiffCell({ after, before }: { after: unknown; before: unknown }): JSX.Element {
  const beforeText = formatCellValue(before);
  const afterText = formatCellValue(after);

  if (beforeText === afterText) {
    return <span className="fk:text-muted-foreground">{beforeText}</span>;
  }

  return (
    <span className="fk:inline-flex fk:flex-wrap fk:items-center fk:gap-1.5">
      <span className="fk:rounded fk:bg-destructive/10 fk:px-1 fk:text-destructive fk:line-through">{beforeText}</span>
      <MoveRightIcon className="fk:size-3 fk:shrink-0 fk:text-muted-foreground" />
      <span className="fk:rounded fk:bg-success/15 fk:px-1 fk:text-success">{afterText}</span>
    </span>
  );
}

function getOperationTitle(operation: AutomationApprovalPreviewOperation): string {
  const entity = operation.entity ?? 'entities';
  const count = operation.affectedCount !== null ? ` · ${operation.affectedCount.toString()} affected` : '';

  if (operation.kind === 'create') {
    return `Create ${entity}${count}`;
  }

  if (operation.kind === 'update') {
    return `Update ${entity}${count}`;
  }

  if (operation.kind === 'delete') {
    return `Delete ${entity}${count}`;
  }

  return `Mutation on ${entity}${count}`;
}

function OperationPreviewTable({ operation }: { operation: AutomationApprovalPreviewOperation }): JSX.Element | null {
  if (operation.rows.length === 0) {
    return null;
  }

  const contextColumns = (operation.contextColumns ?? []).filter((column) => column !== '_id');

  if (operation.kind === 'delete') {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Records to delete</TableHead>
            {contextColumns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {operation.rows.map((row, index) => (
            <TableRow className="fk:bg-destructive/5" key={row.id ?? index.toString()}>
              <TableCell className="fk:font-mono fk:text-xs fk:text-destructive">
                {row.id ?? formatCellValue(row.before?._id)}
              </TableCell>
              {contextColumns.map((column) => (
                <TableCell className="fk:text-xs fk:text-muted-foreground" key={column}>
                  {formatCellValue(row.before?.[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const columns = operation.columns.filter((column) => column !== '_id' && !contextColumns.includes(column));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          {contextColumns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
          {columns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {operation.rows.map((row, index) => (
          <TableRow key={row.id ?? index.toString()}>
            <TableCell className="fk:font-mono fk:text-xs fk:text-muted-foreground">{row.id ?? '—'}</TableCell>
            {contextColumns.map((column) => (
              <TableCell className="fk:max-w-72 fk:text-xs fk:text-muted-foreground" key={column}>
                <span className="fk:line-clamp-3">{formatCellValue(row.before?.[column])}</span>
              </TableCell>
            ))}
            {columns.map((column) => (
              <TableCell className="fk:text-xs" key={column}>
                {operation.kind === 'create' ? (
                  <span className="fk:rounded fk:bg-success/15 fk:px-1 fk:text-success">
                    {formatCellValue(row.after?.[column])}
                  </span>
                ) : (
                  <DiffCell after={row.after?.[column]} before={row.before?.[column]} />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function OperationDocuments({ operations }: { operations: AutomationApprovalOperation[] }): JSX.Element {
  return (
    <details className="fk:rounded-md fk:border fk:border-border">
      <summary className="fk:cursor-pointer fk:px-3 fk:py-2 fk:text-xs fk:font-medium fk:text-muted-foreground">
        GraphQL documents ({operations.length})
      </summary>
      <div className="fk:space-y-3 fk:border-t fk:border-border fk:p-3">
        {operations.map((operation, index) => (
          <div className="fk:space-y-2" key={index.toString()}>
            <pre className="fk:overflow-x-auto fk:rounded-md fk:bg-muted fk:p-3 fk:text-xs">{operation.query}</pre>
            {operation.variables && Object.keys(operation.variables).length > 0 ? (
              <pre className="fk:overflow-x-auto fk:rounded-md fk:bg-muted/60 fk:p-3 fk:text-xs">
                {JSON.stringify(operation.variables, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

export function ApprovalCard({
  api,
  approval: initialApproval,
  onDecided,
}: {
  api: ApiClient;
  approval: AutomationApproval;
  onDecided?: (_approval: AutomationApproval) => void;
}): JSX.Element {
  const [approval, setApproval] = useState(initialApproval);
  // Keep local state for decide() responses, but adopt fresher parent data when
  // list polling / SWR revalidation replaces the prop (status may stay pending).
  const [prevInitialApproval, setPrevInitialApproval] = useState(initialApproval);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeciding, startDecideTransition] = useTransition();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (initialApproval !== prevInitialApproval) {
    setPrevInitialApproval(initialApproval);
    setApproval(initialApproval);
  }

  const isPending = approval.status === 'pending';
  const { preview } = approval;

  function applyResult(nextApproval: AutomationApproval): void {
    setApproval(nextApproval);
    onDecided?.(nextApproval);
  }

  function decide({ approved, force = false, reason }: { approved: boolean; force?: boolean; reason?: string }): void {
    startDecideTransition(async () => {
      setErrorMessage('');

      try {
        const result = await api.decideApproval(approval.id, { approved, force, reason });

        if (result.errorCode === 'stale_preview') {
          setIsStale(true);

          if (result.approval) {
            setApproval(result.approval);
          }

          return;
        }

        setIsStale(false);
        setIsRejectDialogOpen(false);

        if (result.approval) {
          applyResult(result.approval);
        } else if (result.success) {
          // Successful decide omitted the payload — exit pending using the
          // decision we just submitted (the server accepted it).
          applyResult({
            ...approval,
            decidedAt: approval.decidedAt ?? new Date().toISOString(),
            reason: reason ?? approval.reason,
            status: approved ? 'approved' : 'rejected',
          });
        } else if (result.errorCode === 'already_decided') {
          // Never invent a status from the click — the real decision may differ.
          // Ask the parent to revalidate so the true approval can load.
          onDecided?.(approval);
        }

        // When already_decided includes an approval, the badge reflects truth.
        // Otherwise surface the server message (including already_decided
        // without a payload).
        if (!result.success && (result.errorCode !== 'already_decided' || !result.approval)) {
          setErrorMessage(
            typeof result.errorMessage === 'string' ? result.errorMessage : result.errorMessage.join(', ')
          );
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to submit the decision.');
      }
    });
  }

  return (
    // min-w-0 lets the card shrink inside flex/grid parents (e.g. DialogContent)
    // so wide preview tables scroll inside their own container instead of
    // stretching the layout.
    <div className="fk:min-w-0 fk:max-w-full fk:space-y-4">
      <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-2">
        <ApprovalStatusBadge status={approval.status} />
        <span className="fk:text-sm fk:font-medium">{approval.operationsSummary}</span>
      </div>
      <div className="fk:text-xs fk:text-muted-foreground">
        {approval.automationName ? `${approval.automationName} · ` : ''}
        requested {formatDistance(new Date(approval.requestedAt), new Date(), { addSuffix: true })}
        {isPending ? ` · expires ${formatDistance(new Date(approval.expiresAt), new Date(), { addSuffix: true })}` : ''}
        {approval.decidedAt ? ` · decided ${format(new Date(approval.decidedAt), 'PPpp')}` : ''}
      </div>

      {isStale ? (
        <div className="fk:flex fk:items-start fk:gap-2 fk:rounded-md fk:border fk:border-amber-500/40 fk:bg-amber-500/10 fk:p-3 fk:text-sm">
          <TriangleAlertIcon className="fk:mt-0.5 fk:size-4 fk:shrink-0 fk:text-amber-600" />
          <span>
            The affected data changed since this proposal was created. The preview below has been refreshed — review it
            and approve again to proceed.
          </span>
        </div>
      ) : null}

      {preview && preview.operations.length > 0 ? (
        <div className="fk:space-y-4">
          {preview.operations.map((operation, index) => (
            <div className="fk:space-y-2" key={index.toString()}>
              <div className="fk:text-sm fk:font-medium">{getOperationTitle(operation)}</div>
              {operation.kind === 'delete' && operation.affectedCount !== null ? (
                <div className="fk:rounded-md fk:border fk:border-destructive/30 fk:bg-destructive/5 fk:p-3 fk:text-sm fk:text-destructive">
                  {operation.affectedCount.toString()} record{operation.affectedCount === 1 ? '' : 's'} will be
                  permanently deleted.
                </div>
              ) : null}
              <OperationPreviewTable operation={operation} />
              {operation.truncated ? (
                <div className="fk:text-xs fk:text-muted-foreground">
                  Preview limited to the first {operation.rows.length.toString()} rows.
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="fk:rounded-md fk:border fk:border-dashed fk:p-3 fk:text-xs fk:text-muted-foreground">
          No structured preview is available for this proposal. Review the raw GraphQL documents below.
        </div>
      )}

      <OperationDocuments operations={approval.operations} />

      {approval.reason ? (
        <div className="fk:text-sm">
          <span className="fk:font-medium">Reason:</span> {approval.reason}
        </div>
      ) : null}
      {approval.error ? (
        <div className="fk:rounded-md fk:border fk:border-destructive/30 fk:bg-destructive/5 fk:p-3 fk:text-sm">
          Execution failed: {approval.error}
        </div>
      ) : null}
      {approval.executedAt && !approval.error ? (
        <div className="fk:flex fk:items-center fk:gap-2 fk:text-sm fk:text-success">
          <CheckIcon className="fk:size-4" />
          Executed {format(new Date(approval.executedAt), 'PPpp')}
        </div>
      ) : null}
      {errorMessage ? <div className="fk:text-sm fk:text-destructive">{errorMessage}</div> : null}

      {isPending ? (
        <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-2">
          <Button disabled={isDeciding} size="sm" onClick={() => decide({ approved: true, force: isStale })}>
            {isDeciding ? <LoaderCircle className="fk:size-4 fk:animate-spin" /> : <CheckIcon className="fk:size-4" />}
            {isStale ? 'Approve anyway' : 'Approve'}
          </Button>
          <Button
            disabled={isDeciding}
            size="sm"
            variant="outline"
            onClick={() => {
              setRejectReason('');
              setIsRejectDialogOpen(true);
            }}
          >
            <XIcon className="fk:size-4" />
            Reject
          </Button>
        </div>
      ) : null}

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this proposal?</DialogTitle>
            <DialogDescription>
              The mutation will not be executed. The agent receives your reason and can adapt its plan.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional reason for the agent..."
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          <DialogFooter>
            <Button disabled={isDeciding} size="sm" variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isDeciding}
              size="sm"
              variant="destructive"
              onClick={() => decide({ approved: false, reason: rejectReason.trim() || undefined })}
            >
              {isDeciding ? (
                <LoaderCircle className="fk:size-4 fk:animate-spin" />
              ) : (
                <ArrowRightIcon className="fk:size-4" />
              )}
              Reject proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
