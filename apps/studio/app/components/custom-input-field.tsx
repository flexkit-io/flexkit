import type { FormFieldProps } from '@flexkit/studio';

export default function CustomTextField({ renderDefault, ...props }: FormFieldProps): JSX.Element {
  // const { defaultValue } = props;
  // const count = defaultValue?.value?.length ?? 0;

  return (
    <div className="flex w-full flex-col">
      {renderDefault({ ...props })}
      {/* <div className="">{count}</div> */}
    </div>
  );
}
