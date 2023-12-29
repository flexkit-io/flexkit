import { useTheme } from 'next-themes';

export function Logo({ title }: { title: string }): JSX.Element {
  const { resolvedTheme } = useTheme();

  return (
    <a className="fk-flex fk-items-center" href="/" title={title}>
      {resolvedTheme === 'light' ? (
        <svg className="fk-h-8 fk-w-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 8H41V40H7V8Z" fill="white" />
          <path
            d="M24 0C42 0 48 6 48 24C48 42 42 48 24 48C6 48 0 42 0 24C0 6 6 0 24 0ZM17.7494 9.52381H8.7619L19.2833 23.8313L8.7619 38.7078H17.7494L21.0499 33.6639V14.2549L17.7494 9.52381ZM38.9577 9.52381H29.9542L26.2857 14.8229V33.0406L29.9542 38.7078H38.9577L28.3908 23.8313L38.9577 9.52381Z"
            fill="#020817"
          />
        </svg>
      ) : (
        <svg className="fk-h-8 fk-w-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 8H41V40H7V8Z" fill="#020817" />
          <path
            d="M24 0C42 0 48 6 48 24C48 42 42 48 24 48C6 48 0 42 0 24C0 6 6 0 24 0ZM17.7494 9.52381H8.7619L19.2833 23.8313L8.7619 38.7078H17.7494L21.0499 33.6639V14.2549L17.7494 9.52381ZM38.9577 9.52381H29.9542L26.2857 14.8229V33.0406L29.9542 38.7078H38.9577L28.3908 23.8313L38.9577 9.52381Z"
            fill="white"
          />
        </svg>
      )}
    </a>
  );
}
