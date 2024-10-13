import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { FormFieldValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Input } from '../../ui/primitives/input';
import type { FormFieldParams } from '../types';
import { apiPaths } from '../../core/api-paths';

export function Uploader({ control, fieldSchema, setValue }: FormFieldParams<'image'>): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;
  const { projectId } = useParams();
  const inputFile = useRef<HTMLInputElement>(null);
  const [base64PreviewImage, setBase64PreviewImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleInput(
    event: React.ChangeEvent<HTMLInputElement>,
    previousValue: FormFieldValue | undefined
  ): Promise<void> {
    const file = event.currentTarget.files && event.currentTarget.files[0];

    if (!file) {
      return;
    }

    if (file.size / 1024 / 1024 > 50) {
      console.log('File size too big (max 50MB)');
      // toast.error("File size too big (max 50MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setBase64PreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setSaving(true);

    try {
      const response = await fetch(apiPaths(projectId).upload, {
        method: 'POST',
        headers: { 'content-type': file?.type || 'application/octet-stream' },
        body: file,
      });

      const data = await response.json();

      setValue(name, {
        ...previousValue,
        value: data.pathname,
      });
    } catch (error) {
      console.error(error);
      setBase64PreviewImage(null);
      setValue(name, {
        ...previousValue,
        value: '',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }: { field: { value?: FormFieldValue } }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl>
            <>
              {base64PreviewImage && (
                <img src={base64PreviewImage} alt="Preview" className="fk-h-12 fk-w-12 rounded-md object-cover" />
              )}
              <Input
                className={`fk-w-full fk-mt-[0.1875rem] ${
                  !field.value?.scope || field.value.scope === 'default' ? 'fk-mb-3' : ''
                }`}
                disabled={isEditable === false || field.value?.disabled}
                {...field}
                onChange={(event) => {
                  handleInput(event, field.value);
                }}
                value={(field.value?.value as string) || ''}
              />
            </>
          </FormControl>
          <input
            accept={options?.accept ? options.accept : 'image/*'}
            className="hidden"
            id={`file-upload-${name}`}
            onChange={(e) => {
              // handleUpload(e, uppy);
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
