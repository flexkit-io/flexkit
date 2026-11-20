import type { JSX } from 'react';
import { CheckIcon, ChevronDownIcon, ImageIcon, XIcon } from 'lucide-react';
import { AGENT_IMAGE_ASPECT_RATIOS, AGENT_IMAGE_MODELS, DEFAULT_AGENT_IMAGE_MODEL_ID } from '@flexkit/agent-protocol';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui';
import { getImageModeLabel, type AgentImageRequest } from './image-mode';

/**
 * The composer's Create Image chip: the next message creates an image. The
 * caret opens the image model and aspect ratio; the cross turns the mode off.
 */
export function ImageModeChip({
  disabled,
  onChange,
  onClear,
  request,
}: {
  disabled?: boolean;
  onChange: (_request: AgentImageRequest) => void;
  onClear: () => void;
  request: AgentImageRequest;
}): JSX.Element {
  const selectedModel = request.model ?? DEFAULT_AGENT_IMAGE_MODEL_ID;

  return (
    <div className="fk:flex fk:h-8 fk:items-center fk:rounded-full fk:bg-primary/10 fk:text-primary fk:text-sm fk:corner-round">
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Image options"
            className="fk:flex fk:h-full fk:items-center fk:gap-1.5 fk:rounded-l-full fk:pl-3 fk:pr-1.5 fk:font-medium fk:hover:bg-primary/10 fk:disabled:opacity-50"
            disabled={disabled}
            type="button"
          >
            <ImageIcon className="fk:size-4" />
            <span className="fk:whitespace-nowrap">{getImageModeLabel(request)}</span>
            <ChevronDownIcon className="fk:size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="fk:w-80 fk:p-2">
          <div className="fk:px-2 fk:pb-1 fk:pt-1 fk:text-xs fk:font-medium fk:text-muted-foreground">Image model</div>
          <div role="radiogroup" aria-label="Image model">
            {AGENT_IMAGE_MODELS.map((model) => {
              const checked = model.id === selectedModel;

              return (
                <button
                  aria-checked={checked}
                  className="fk:flex fk:w-full fk:items-center fk:gap-2 fk:rounded-md fk:px-2 fk:py-1.5 fk:text-left fk:text-sm fk:hover:bg-accent"
                  key={model.id}
                  role="radio"
                  type="button"
                  onClick={() => onChange({ ...request, model: model.id })}
                >
                  <CheckIcon className={`fk:size-4 fk:shrink-0 ${checked ? '' : 'fk:invisible'}`} />
                  <span className="fk:font-medium">{model.name}</span>
                  <span className="fk:ml-auto fk:text-xs fk:text-muted-foreground">{model.description}</span>
                </button>
              );
            })}
          </div>
          <div className="fk:my-2 fk:border-t fk:border-border" />
          <div className="fk:px-2 fk:pb-1 fk:text-xs fk:font-medium fk:text-muted-foreground">Aspect ratio</div>
          <div aria-label="Aspect ratio" className="fk:flex fk:flex-wrap fk:gap-1 fk:px-2 fk:pb-1" role="radiogroup">
            {[undefined, ...AGENT_IMAGE_ASPECT_RATIOS].map((ratio) => {
              const checked = request.aspectRatio === ratio;

              return (
                <button
                  aria-checked={checked}
                  className={`fk:rounded-md fk:border fk:px-2 fk:py-1 fk:text-xs ${
                    checked
                      ? 'fk:border-primary fk:bg-primary/10 fk:text-primary'
                      : 'fk:border-border fk:hover:bg-accent'
                  }`}
                  key={ratio ?? 'auto'}
                  role="radio"
                  type="button"
                  onClick={() => {
                    const { aspectRatio: _previous, ...rest } = request;

                    onChange(ratio ? { ...rest, aspectRatio: ratio } : rest);
                  }}
                >
                  {ratio ?? 'Auto'}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      <button
        aria-label="Turn off Create image"
        className="fk:flex fk:h-full fk:items-center fk:rounded-r-full fk:pl-1 fk:pr-2.5 fk:hover:bg-primary/10 fk:disabled:opacity-50"
        disabled={disabled}
        type="button"
        onClick={onClear}
      >
        <XIcon className="fk:size-3.5" />
      </button>
    </div>
  );
}
