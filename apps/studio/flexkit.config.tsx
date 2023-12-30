import { defineConfig } from '@flexkit/studio/server';
import { Desk } from '@flexkit/desk';
import { Image, Layers3, Tag } from 'lucide-react';

export default defineConfig([
  {
    title: 'Flexkit',
    projectId: 'abcdefghij',
    basePath: '/studio',
    plugins: [
      Desk(),
      {
        // <-- this is a plugin. It's a function that returns a plugin object. Required fields are `name` and `contributes`.
        name: 'flexkit.desk',
        contributes: {
          apps: [
            // <-- this is a list of apps that will be shown in the sidebar. It's an array, because existing apps can't be overwritten.
            {
              name: 'images',
              icon: <Image strokeWidth={1.5} />,
              title: 'Images',
              component: <div>Images</div>,
            },
            {
              name: 'products',
              icon: <Tag strokeWidth={1.5} />,
              title: 'Products',
              component: <div>Products</div>,
            },
            {
              name: 'categories',
              icon: <Layers3 strokeWidth={1.5} />,
              title: 'Categories',
              component: <div>Categories</div>,
            },
          ],
          formFields: {
            // <-- this is a list of custom form fields that can be used in the desk app. It's an object, because existing fields can be overwritten.
            'field-name': {
              component: 'someCustomFieldComponent',
            },
          },
          navbar: {
            logo: {
              component: ({ renderDefault, ...props }) => {
                return <>{renderDefault({ ...props, title: 'Title overwritten from a plugin' })}</>;
              },
            },
            // search: {
            //   component: ({ renderDefault, ...props }) => {
            //     return <div className="border border-red-500">{renderDefault(props)}</div>;
            //   },
            // },
          },
        },
        plugins: [
          // nested plugins are allowed. For example, the `desk` plugin could have a `gridList` plugin.
          // gridList()
          {
            name: 'test-plugin',
            contributes: {
              apps: [
                {
                  name: 'test2',
                  icon: <Layers3 strokeWidth={1.5} />,
                  title: 'Categories 2',
                  component: <div>Categories test 2</div>,
                },
              ],
            },
            plugins: [
              // another nested plugin
              {
                name: 'test-plugin-2',
                contributes: {},
              },
            ],
          },
        ],
      },
      {
        name: 'flexkit.hello',
        title: 'Hello',
        contributes: {
          commands: [
            {
              title: 'Hello World',
              command: (flexkit) => {
                flexkit;
                // flexkit.showInformationMessage('Hello World!');
              },
            },
          ],
        },
      },
    ],
  },
  {
    title: 'Demo 2',
    projectId: 'uwerfsxskp',
    basePath: '/studio',
    plugins: [
      {
        name: 'demo.2.plugin',
        title: 'Demo 2 plugin',
        contributes: {
          // apps: [
          //   // <-- this is a list of apps that will be shown in the sidebar. It's an array, because existing apps can't be overwritten.
          //   {
          //     name: 'images',
          //     icon: <Image strokeWidth={1.5} />,
          //     title: 'Images',
          //     component: <div>Images</div>,
          //   },
          // ],
          // navbar: {
          //   logo: {
          //     component: ({ title, next, ...props }) => {
          //       return <div title={title}>{next({ ...props, title: '🚀 🌈 🦄 💀' })}</div>;
          //     },
          //   },
          // },
        },
      },
    ],
  },
]);
