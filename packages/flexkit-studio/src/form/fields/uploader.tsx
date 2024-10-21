import { useId, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { useParams } from 'react-router-dom';
import bytes from 'bytes';
import {
  Copy as CopyIcon,
  Download as DownloadIcon,
  Ellipsis as EllipsisIcon,
  Image as ImageIcon,
  Maximize2,
  RefreshCwOff as ClearFieldIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  X as ClearIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { FormFieldValue, ImageValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Button } from '../../ui/primitives/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/primitives/tooltip';
import { Collapsible, CollapsibleContent } from '../../ui/primitives/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/primitives/dropdown-menu';
import { apiPaths, IMAGES_BASE_URL } from '../../core/api-paths';
import { useOuterClick } from '../../ui/hooks/use-outer-click';
import type { FormFieldParams } from '../types';

export function Uploader({ control, fieldSchema, getValues, setValue }: FormFieldParams<'image'>): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;
  const { projectId } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [base64PreviewImage, setBase64PreviewImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const id = useId();
  useOuterClick(wrapperRef, setIsOpen, '[data-radix-popper-content-wrapper]');

  async function handleInput(file: File | null, previousValue: FormFieldValue | undefined): Promise<void> {
    if (!file) {
      return;
    }

    if (file.size > bytes('4MB')) {
      toast.error('File size too big (max 4MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      setBase64PreviewImage(e.target?.result as string);

      img.onload = function () {
        setValue(name, {
          ...(getValues(name)?.value as ImageValue),
          value: {
            ...(getValues(name)?.value as ImageValue),
            width: img.width,
            height: img.height,
          },
        });
      };

      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    setSaving(true);

    try {
      const response = await fetch(apiPaths(projectId).upload, {
        method: 'POST',
        headers: { 'Content-Type': file?.type || 'application/octet-stream' },
        body: file,
      });

      const data = await response.json();

      console.log('data', data);

      setValue(name, {
        ...(getValues(name)?.value as ImageValue),
        value: {
          ...(getValues(name)?.value as ImageValue),
          path: data.pathname,
          originalFilename: file.name,
          size: file.size,
          mimeType: file.type,
          lqip: data.lqip,
        },
      });
    } catch (error) {
      console.error(error);
      setBase64PreviewImage(null);
      setValue(name, {
        ...(getValues(name)?.value as ImageValue),
        value: {
          _id: (previousValue?.value as ImageValue)?._id,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  function handleClearing(event: SyntheticEvent): void {
    event.stopPropagation();
    setValue(name, {
      ...getValues(name),
      _id: '',
      value: {
        _id: (getValues(name)?.value as ImageValue)?._id,
      },
    });
  }

  function handleCopyUrl(event: SyntheticEvent, fieldValue: FormFieldValue | undefined): void {
    event.stopPropagation();

    if (fieldValue?.value && typeof fieldValue.value === 'object' && 'path' in fieldValue.value) {
      navigator.clipboard.writeText(`${IMAGES_BASE_URL}${fieldValue.value.path}`);
    }
  }

  function handleUpload(event: SyntheticEvent): void {
    event.preventDefault();
    event.stopPropagation();
    inputFile.current?.click();
  }

  function handleDownload(event: SyntheticEvent, fieldValue: FormFieldValue | undefined): void {
    event.stopPropagation();

    if (fieldValue?.value && typeof fieldValue.value === 'object' && 'path' in fieldValue.value) {
      window.open(`${IMAGES_BASE_URL}${fieldValue.value.path}?download=1`, '_blank');
    }
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }: { field: { value?: FormFieldValue } }) => (
        <FormItem>
          <FormLabel htmlFor={id}>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl className="fk-flex fk-flex-col fk-w-full fk-min-h-[2.5rem] fk-text-sm">
            <div
              aria-controls={`image-dropdown-${name}`}
              aria-expanded={isOpen}
              className={`fk-relative fk-flex fk-w-full fk-items-start fk-space-x-2 fk-rounded-md fk-border fk-overflow-hidden focus-visible:fk-outline-none focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 ${
                isOpen ? 'fk-outline-none fk-ring-2 fk-ring-ring fk-ring-offset-2' : ''
              } ${dragActive ? 'fk-border-dashed fk-border-2 fk-border-green-500 fk-bg-green-50' : 'fk-border-input fk-bg-background'}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                wrapperRef.current?.focus();
                wrapperRef.current?.click();
                setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsOpen(true);
                }

                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  wrapperRef.current?.blur();
                  setIsOpen(false);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);

                const file = e.dataTransfer.files && e.dataTransfer.files[0];

                handleInput(file, field.value);
              }}
              ref={wrapperRef}
              role="combobox"
              tabIndex={0}
            >
              <div className="fk-flex fk-w-full fk-space-x-2">
                {/* Initial empty state when there is no image */}
                {!(field.value?.value as ImageValue)?.path && !base64PreviewImage ? (
                  <div className="fk-flex fk-h-9 fk-w-full fk-px-3 fk-pt-0.5 fk-items-center">
                    <div className="fk-flex fk-h-full fk-items-center fk-text-muted-foreground fk-text-sm fk-font-light">
                      <ImageIcon className="fk-mr-2 fk-h-4 fk-w-4" /> Drag or paste image here
                    </div>
                    <Button
                      className="fk-ml-auto fk-h-7 fk-rounded fk-text-muted-foreground"
                      id={id}
                      onClick={handleUpload}
                      variant="ghost"
                    >
                      <UploadIcon className="fk-mr-2 fk-h-4 fk-w-4" />
                      Upload
                    </Button>
                    <Button className="fk-ml-2 fk-h-7 fk-rounded fk-text-muted-foreground" variant="ghost">
                      <SearchIcon className="fk-mr-2 fk-h-4 fk-w-4" />
                      Select
                    </Button>
                  </div>
                ) : null}
                {/* When there is an image, show the image and its metadata */}
                {(field.value?.value as ImageValue | undefined)?.path && !isOpen ? (
                  <div className="fk-flex fk-h-9 fk-w-full fk-px-3 fk-pt-0.5 fk-items-center">
                    <img
                      className="fk-w-8 fk-h-8 fk-mr-2 fk-rounded fk-object-scale-down"
                      src={`${IMAGES_BASE_URL}${(field.value?.value as ImageValue).path}?w=128&h=128&f=webp`}
                      alt="Uploaded"
                    />
                    {bytes((field.value?.value as ImageValue).size)}
                    <span className="fk-block fk-w-px fk-h-5 fk-mx-2 fk-bg-border" />
                    {(field.value?.value as ImageValue).mimeType}
                    {(field.value?.value as ImageValue).width && (field.value?.value as ImageValue).height ? (
                      <>
                        <span className="fk-block fk-w-px fk-h-5 fk-mx-2 fk-bg-border" />
                        {(field.value?.value as ImageValue).width}x{(field.value?.value as ImageValue).height}px
                      </>
                    ) : null}
                  </div>
                ) : null}
                {!(field.value?.value as ImageValue)?.path && base64PreviewImage && (
                  <div className="fk-flex fk-h-9 fk-w-full fk-px-3 fk-pt-0.5 fk-items-center">
                    <img
                      src={base64PreviewImage}
                      alt="Preview"
                      className="fk-mr-2 fk-mt-0.5 fk-rounded fk-h-7 fk-w-7 rounded-md object-cover"
                    />
                    Loading image...
                  </div>
                )}
                {/* When there is an image, show the dropdown menu */}
                {(field.value?.value as ImageValue)?.path ? (
                  <div className="fk-absolute fk-top-0 fk-right-10">
                    <DropdownMenu>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button
                                className="fk-h-8 fk-w-8 fk-ml-auto fk-mt-[0.1875rem] fk-rounded"
                                size="icon"
                                variant="ghost"
                              >
                                <EllipsisIcon className="fk-h-4 fk-w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Show actions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenuContent className="fk-w-48">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={handleUpload}>
                            <UploadIcon className="fk-mr-2 fk-h-4 fk-w-4" />
                            <span>Upload</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ImageIcon className="fk-mr-2 fk-h-4 fk-w-4" />
                            <span>Select image</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={(e) => handleDownload(e, field.value)}>
                            <DownloadIcon className="fk-mr-2 fk-h-4 fk-w-4" />
                            <span>Download</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleCopyUrl(e, field.value)}>
                            <CopyIcon className="fk-mr-2 fk-h-4 fk-w-4" />
                            <span>Copy URL</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleClearing}>
                          <ClearFieldIcon className="fk-mr-2 fk-h-4 fk-w-4" />
                          <span>Clear field</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
                <>
                  {!isOpen && ((field.value?.value as ImageValue)?.path || base64PreviewImage) ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="fk-absolute fk-right-[0.1875rem] fk-top-[0.1875rem] fk-h-8 fk-w-8 fk-rounded fk-text-muted-foreground"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                wrapperRef.current?.focus();
                                wrapperRef.current?.click();
                              }
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Maximize2 className="fk-h-4 fk-w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Expand field</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </>
                {isOpen && ((field.value?.value as ImageValue)?.path || base64PreviewImage) ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="fk-absolute fk-right-[0.1875rem] fk-top-[0.1875rem] fk-h-8 fk-w-8 fk-rounded fk-text-muted-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            wrapperRef.current?.blur();
                            setIsOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              wrapperRef.current?.blur();
                              setIsOpen(false);
                            }
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <ClearIcon className="fk-h-4 fk-w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Close</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
              <Collapsible
                className="fk-w-full fk-space-y-2 !fk-ml-0"
                onOpenChange={setIsOpen}
                open={isOpen && (Boolean((field.value?.value as ImageValue)?.path) || Boolean(base64PreviewImage))}
              >
                <CollapsibleContent className="fk-w-full">
                  <div className="fk-flex fk-w-full fk-h-[30vh]" id={`image-dropdown-${name}`}>
                    {(field.value?.value as ImageValue | undefined)?.path ? (
                      <img
                        className="fk-w-full fk-rounded-md fk-object-scale-down"
                        src={`${IMAGES_BASE_URL}${(field.value?.value as ImageValue).path}?w=624&h=624&f=webp`}
                        alt="Uploaded"
                      />
                    ) : null}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              {saving ? (
                <div className="fk-absolute !fk-m-0 fk-top-0 fk-left-0 fk-right-0 fk-bottom-0 fk-w-full fk-bg-muted-foreground/5 fk-overflow-hidden">
                  <div className="fk-animate-progress fk-w-full fk-h-full fk-bg-muted-foreground/10" />
                </div>
              ) : null}
            </div>
          </FormControl>
          <input
            accept={options?.accept ? options.accept : 'image/*'}
            className="fk-hidden"
            id={`file-upload-${name}`}
            onChange={(e) => {
              const file = e.currentTarget.files && e.currentTarget.files[0];

              handleInput(file, field.value);
            }}
            ref={inputFile}
            type="file"
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
