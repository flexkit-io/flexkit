import { JSX } from "react";

export function RatePreviewField({
  value,
}: {
  value: number | undefined;
}): JSX.Element {
  return (
    <div className="fk-flex fk-w-full fk-justify-center">
      {value?.toFixed(3) ?? ""}
    </div>
  );
}
