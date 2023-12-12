'use client';

import { useEffect, useState } from 'react';
import { Image, Layers3, Layout, Tag } from 'lucide-react';
import { AuthProvider } from '../auth/auth-context';
import { ThemeProvider } from '../ui/theme-context';
import { AppView } from '../ui/containers/app-view';
import { Navbar } from '../ui/containers/navbar';
import type { AppOptions, Config } from './config/types';

export function FlexkitStudio({ config }: { config: Config }): JSX.Element {
  const [selectedConfig, setSelectedConfig] = useState(Array.isArray(config) ? config[0] : config);

  useEffect(() => {
    const plugins = selectedConfig.plugins?.map((plugin) => {
      return plugin;
    });
    console.log(plugins); // eslint-disable-line no-console -- temporary
  }, [selectedConfig]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      <AuthProvider>
        {/* TODO: add a context with the data for the Apps (tools) to be used by the NavBar and main content area */}
        <div className="flex flex-col h-full">
          <Navbar />
          <div className="h-full border-t grow shrink">
            {/* TODO: The main content area should be wrappable in a custom context of the user: https://www.sanity.io/docs/studio-components-reference */}
            <div className="h-full grow shrink">
              <AppView apps={getApps()} version={{ current: '1.0.0', latest: '1.0.0', isCurrent: true }} />
            </div>
          </div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

function getApps(): AppOptions[] {
  return [
    {
      name: 'desk',
      icon: <Layout strokeWidth={1.5} />,
      title: 'Desk',
      component: () => <div>Desk</div>,
    },
    {
      name: 'images',
      icon: <Image strokeWidth={1.5} />,
      title: 'Images',
      component: () => <div>Images</div>,
    },
    {
      name: 'products',
      icon: <Tag strokeWidth={1.5} />,
      title: 'Products',
      component: () => <div>Products</div>,
    },
    {
      name: 'categories',
      icon: <Layers3 strokeWidth={1.5} />,
      title: 'Categories',
      component: () => <div>Categories</div>,
    },
  ];
}
