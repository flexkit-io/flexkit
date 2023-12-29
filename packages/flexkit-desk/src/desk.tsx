import { useAuth } from '@flexkit/studio';

export function DeskApp() {
  const [, auth] = useAuth();

  return (
    <div>
      <h1 className="text-xl">Desk App</h1>
      <p>{JSON.stringify(auth)}</p>
    </div>
  );
}
