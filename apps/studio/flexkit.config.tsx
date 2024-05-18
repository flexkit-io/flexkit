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
    schema: [
      {
        name: 'product',
        plural: 'products',
        attributes: [
          {
            name: 'name',
            label: 'Name',
            scope: 'local',
            options: {
              size: 260,
              comment: 'The name of the product',
            },
            dataType: 'string',
            inputType: 'text',
            isPrimary: true,
            validation: (z) => z.string().min(1, { message: 'Name is required' }),
            defaultValue: '',
          },
          {
            name: 'sku',
            label: 'SKU',
            scope: 'global',
            options: {
              size: 260,
              comment: 'Unique SKU identifier',
            },
            dataType: 'string',
            isUnique: true,
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'SKU is required' }),
            defaultValue: '',
          },
          {
            name: 'productType',
            label: 'Product Type',
            scope: 'global',
            options: {
              list: [
                {
                  label: 'Simple',
                  value: 'simple',
                },
                {
                  label: 'Configurable',
                  value: 'configurable',
                },
                // For grouped lists with a label for each group:
                // {
                //   groupLabel: 'Type II',
                //   items: [
                //     {
                //       label: 'Grouped',
                //       value: 'grouped',
                //     },
                //     {
                //       label: 'Another',
                //       value: 'another',
                //     },
                //   ],
                // },
              ],
              placeholder: 'Select a product type',
              size: 260,
              comment: 'Type of Magento product: simple or configurable',
            },
            dataType: 'string',
            isUnique: false,
            inputType: 'select',
            validation: (z) => z.string().min(1, { message: 'Product type is required' }),
            defaultValue: 'simple',
          },
          {
            name: 'brand',
            label: 'Brand',
            scope: 'relationship',
            options: {
              size: 260,
              comment: 'Brand of the product (i.e. Solgar, Naturitas Essentials, etc)',
            },
            dataType: 'string',
            inputType: 'relationship',
            defaultValue: '',
            relationship: {
              mode: 'single',
              field: 'name',
              entity: 'brand',
            },
            // TODO: figure out how to validate relationship fields
            // validation: (z) => z.string().min(1, { message: 'Brand is required' }),
          },
          {
            name: 'flags',
            label: 'Flags',
            scope: 'relationship',
            options: {
              size: 260,
              comment: 'Product flags (Bio, 100% Natural, etc)',
            },
            dataType: 'string',
            inputType: 'relationship',
            defaultValue: '',
            relationship: {
              mode: 'multiple',
              field: 'name',
              entity: 'flag',
            },
          },
        ],
      },
      {
        name: 'flag',
        plural: 'flags',
        attributes: [
          {
            name: 'name',
            label: 'Name',
            scope: 'local',
            options: {
              size: 260,
              comment: 'A characteristic or benefit of a product',
            },
            dataType: 'string',
            inputType: 'text',
            isPrimary: true,
            validation: (z) => z.string().min(1, { message: 'Name is required' }),
            defaultValue: '',
          },
          {
            name: 'tooltip',
            label: 'Tooltip',
            scope: 'local',
            options: {
              size: 260,
              comment: 'The tooltip text to display when hovering over the flag',
            },
            dataType: 'string',
            inputType: 'textarea',
            validation: (z) => z.string().min(1, { message: 'Tooltip is required' }),
            defaultValue: '',
          },
        ],
      },
      {
        name: 'brand',
        plural: 'brands',
        attributes: [
          {
            name: 'name',
            label: 'Name',
            scope: 'global',
            options: {
              size: 120,
              comment: 'The name of the brand',
            },
            dataType: 'string',
            isPrimary: true,
            isUnique: true,
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'Name is required' }),
            defaultValue: '',
          },
          {
            name: 'path',
            label: 'Path',
            scope: 'global',
            options: {
              size: 260,
              comment: 'URL path',
            },
            dataType: 'string',
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'Path is required' }),
            defaultValue: '',
          },
          {
            name: 'pathSegment',
            label: 'Path Segment',
            scope: 'global',
            options: {
              size: 260,
              comment: 'URL path segment',
            },
            dataType: 'string',
            inputType: 'text',
            isPrimary: true,
            validation: (z) => z.string(),
            defaultValue: '',
          },
          {
            name: 'metaTitle',
            label: 'Meta Title',
            scope: 'local',
            options: {
              size: 260,
              comment: 'The meta-title of the brand',
            },
            dataType: 'string',
            inputType: 'text',
            isPrimary: true,
            validation: (z) => z.string().optional(),
            defaultValue: '',
          },
          {
            name: 'products',
            label: 'Products',
            scope: 'relationship',
            options: {
              size: 260,
              comment: 'Products of this brand',
            },
            dataType: 'string',
            inputType: 'relationship',
            defaultValue: '',
            relationship: {
              mode: 'multiple',
              field: 'name',
              entity: 'product',
            },
          },
        ],
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
    schema: [],
  },
]);
