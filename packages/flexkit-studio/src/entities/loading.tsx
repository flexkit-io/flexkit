import { Skeleton } from '../ui/primitives/skeleton';

export default function Loading(): JSX.Element {
  const numberOfSkeletonFields = 10;

  return (
    <>
      {/* eslint-disable-next-line no-param-reassign -- allowed for simplicity */}
      {Array.from({ length: numberOfSkeletonFields }, (_, i) => i++).map((i) => (
        <div className="fk-mt-3 fk-mb-[1.625rem]" key={i}>
          <Skeleton className="fk-w-full fk-h-[45px]" />
          <div className="fk-flex fk-mt-2 fk-ml-4">
            <Skeleton className="fk-w-5 fk-w-5 fk-mr-2" />
            <Skeleton className="fk-w-[140px] fk-h-[20px]" />
          </div>
        </div>
      ))}
    </>
  );
}
