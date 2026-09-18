import { useRef, useState, type DragEvent, type JSX, type ReactNode } from 'react';

interface AssetDropZoneProps {
  children: ReactNode;
  disabled?: boolean;
  onDropFiles: (files: File[]) => void;
}

function hasFileDrag(event: DragEvent<HTMLDivElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

export function AssetDropZone({ children, disabled = false, onDropFiles }: AssetDropZoneProps): JSX.Element {
  const dragDepthRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

  function clearDragState(): void {
    dragDepthRef.current = 0;
    setIsDragActive(false);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>): void {
    if (!hasFileDrag(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;

    if (!disabled) {
      setIsDragActive(true);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    if (!hasFileDrag(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    if (!hasFileDrag(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    if (!hasFileDrag(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearDragState();

    if (disabled) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    onDropFiles(files);
  }

  return (
    <div
      className="fk:relative fk:flex fk:min-h-0 fk:flex-1 fk:flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">{children}</div>
      {isDragActive ? (
        <div
          aria-hidden
          className="fk:pointer-events-none fk:absolute fk:inset-0 fk:z-30 fk:flex fk:items-center fk:justify-center fk:rounded-md fk:border-2 fk:border-dashed fk:border-primary fk:bg-background/80"
        >
          <p className="fk:text-sm fk:font-medium fk:text-foreground">Drop files to upload</p>
        </div>
      ) : null}
    </div>
  );
}
