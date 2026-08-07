import { Loader2 } from 'lucide-react';
import { Button } from '../ui/primitives/button';
import { PermissionTooltip } from '../ui/components/permission-tooltip';
import { useDrawerModalContext } from '../ui/drawer-modal-context';
import { useCanMutate } from '../core/permissions';

export default function SaveButton({ handleSave, isLoading }: { handleSave: () => void; isLoading: boolean }) {
  const { isDirty } = useDrawerModalContext();
  const canMutate = useCanMutate();

  return (
    <PermissionTooltip disabled={!canMutate}>
      <Button
        className="fk:px-8 fk:min-w-32"
        disabled={!isDirty || !canMutate}
        onClick={() => {
          handleSave();
        }}
        variant="default"
      >
        {isLoading ? <Loader2 className="fk:h-4 fk:w-4 fk:mr-2 fk:animate-spin" /> : null}
        Save
      </Button>
    </PermissionTooltip>
  );
}
