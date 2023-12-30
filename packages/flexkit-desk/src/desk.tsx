import { useAuth } from '@flexkit/studio';

export function DeskApp() {
  const [, auth] = useAuth();

  return (
    <div>
      <h1 className="text-xl">Desk App</h1>
      <h2 className="text-lg">
        TODO: move schema from Auth to Config Context since the menu should be defined in flexkig.config.tsx
      </h2>
      <p>{JSON.stringify(auth)}</p>
    </div>
  );
}
