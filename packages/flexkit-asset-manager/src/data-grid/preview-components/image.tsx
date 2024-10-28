import { IMAGES_BASE_URL } from '@flexkit/studio';

export type Image = {
  _id: string;
  path: string;
};

export function Image({ value }: { value: Image }): JSX.Element | null {
  if (!value) {
    return null;
  }

  return (
    <div className="fk-z-10 fk-mix-blend-multiply">
      <img src={`${IMAGES_BASE_URL}${value}?w=624&h=624&f=webp`} alt="image" className="fk-w-20 fk-h-20" />
    </div>
  );
}
