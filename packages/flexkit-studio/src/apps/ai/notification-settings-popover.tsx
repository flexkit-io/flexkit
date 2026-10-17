import type { JSX } from 'react';
import { useId, useState } from 'react';
import { Settings2Icon } from 'lucide-react';
import { Button, Popover, PopoverContent, PopoverTrigger, Switch, toast } from '../../ui';
import { useConfig } from '../../core/config/config-context';
import { saveNotificationPreferences, useNotificationPreferences, type NotificationPreferences } from './notification-settings';
import type { ActivityItemKind } from './types';

const DESKTOP_KINDS: { kind: ActivityItemKind; label: string }[] = [
  { kind: 'approval_request', label: 'Approval requests' },
  { kind: 'automation_failure', label: 'Automation failures' },
  { kind: 'automation_result', label: 'Automation results' },
  { kind: 'monitor_event', label: 'Chat monitors' },
];

function SettingSwitch({
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onCheckedChange: (_checked: boolean) => void;
}): JSX.Element {
  const id = useId();

  return (
    <div className="fk:flex fk:items-center fk:justify-between fk:gap-3">
      <label className="fk:text-sm" htmlFor={id}>
        {label}
      </label>
      <Switch checked={checked} disabled={disabled} id={id} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/** Activity's notification settings: desktop notifications per kind and the approval email. Shared by every project. */
export function NotificationSettingsButton(): JSX.Element {
  const { mode } = useConfig();
  const { isLoaded, mutate, preferences } = useNotificationPreferences();
  const [isSaving, setIsSaving] = useState(false);

  async function save(next: NotificationPreferences): Promise<void> {
    setIsSaving(true);

    try {
      await mutate(saveNotificationPreferences(next), { optimisticData: { preferences: next }, rollbackOnError: true });
    } catch {
      toast.error('Unable to save your notification settings.');
    } finally {
      setIsSaving(false);
    }
  }

  function toggleDesktopKind(kind: ActivityItemKind, enabled: boolean): void {
    const muted = new Set(preferences.desktopMutedKinds);

    if (enabled) {
      muted.delete(kind);
    } else {
      muted.add(kind);
    }

    void save({ ...preferences, desktopMutedKinds: [...muted] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button aria-label="Notification settings" className="fk:ml-auto" size="icon" variant="ghost">
          <Settings2Icon className="fk:size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="fk:w-80 fk:space-y-4">
        <div className="fk:space-y-2">
          <p className="fk:text-sm fk:font-medium">Desktop notifications</p>
          <p className="fk:text-xs fk:text-muted-foreground">
            {mode === 'hosted'
              ? 'Shown while Studio is in the background, and while your browser runs with no Studio tab open.'
              : 'Shown while Studio is open in the background.'}{' '}
            Activity always keeps every item.
          </p>
          {DESKTOP_KINDS.map(({ kind, label }) => (
            <SettingSwitch
              checked={!preferences.desktopMutedKinds.includes(kind)}
              disabled={isSaving || !isLoaded}
              key={kind}
              label={label}
              onCheckedChange={(checked) => toggleDesktopKind(kind, checked)}
            />
          ))}
        </div>
        <div className="fk:space-y-2">
          <p className="fk:text-sm fk:font-medium">Email</p>
          <SettingSwitch
            checked={preferences.approvalEmail}
            disabled={isSaving || !isLoaded}
            label="Approval requests I haven’t read"
            onCheckedChange={(checked) => void save({ ...preferences, approvalEmail: checked })}
          />
        </div>
        <p className="fk:text-xs fk:text-muted-foreground">These settings apply to every project you open.</p>
      </PopoverContent>
    </Popover>
  );
}
