import { Loader2 } from 'lucide-react';
import { Button } from '../ui/primitives/button';
import { useDrawerModalContext } from '../ui/drawer-modal-context';

export default function SaveButton({ handleSave, isLoading }: { handleSave: () => void; isLoading: boolean }) {
  const { isDirty } = useDrawerModalContext();
  return (
    <Button
      className="fk-px-8"
      disabled={!isDirty}
      onClick={() => {
        handleSave();
      }}
      variant="default"
    >
      {isLoading ? <Loader2 className="fk-h-4 fk-w-4 fk-mr-2 fk-animate-spin" /> : null}
      Save
    </Button>
  );
}
