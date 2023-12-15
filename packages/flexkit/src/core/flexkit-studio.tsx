'use client';

import { useEffect, useState } from 'react';
import { Image, Layers3, Layout, Tag } from 'lucide-react';
import { debug } from 'debug';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../auth/auth-context';
import { ThemeProvider } from '../ui/theme-context';
import { AppView } from '../ui/containers/app-view';
import { Navbar } from '../ui/containers/navbar';
import type { AppOptions, Config } from './config/types';

export function FlexkitStudio({ config }: { config: Config }): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const log = debug('core:flexkit-studio');

  useEffect(() => {
    // ensure the DOM is available to prevent "document is not defined" error with react-router
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const router = createBrowserRouter([
    {
      path: '/studio/',
      element: (
        <AppView
          activeAppName={getApps()[0].name} // comes from the router
          apps={getApps()}
          version={{ current: '1.0.0', latest: '1.0.0', isCurrent: true }}
        />
      ),
      children: [
        {
          path: '/studio/desk',
          element: <div>Desk</div>,
        },
        {
          path: '/studio/images',
          element: <div>Images</div>,
        },
        {
          path: '/studio/products',
          element: <div>Products</div>,
        },
        {
          path: '/studio/categories',
          element: <div>Categories</div>,
        },
      ],
    },
  ]);

  log('Init Studio');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      <AuthProvider>
        {/* TODO: add a context with the data for the Apps (tools) to be used by the NavBar and main content area */}
        <div className="flex flex-col h-full">
          <Navbar />
          <div className="h-full border-t grow shrink">
            {/* TODO: The main content area should be wrappable in a custom context of the user: https://www.sanity.io/docs/studio-components-reference */}
            <div className="h-full grow shrink">
              <RouterProvider router={router} />
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
