import {
  Flag as FlagIcon,
  FolderTree as FolderTreeIcon,
  Tag as TagIcon,
  ShoppingCart as ShoppingCartIcon,
  Store as StoreIcon,
  User as UserIcon,
} from 'lucide-react';
import { defineConfig } from '@flexkit/studio/ssr';
import { AssetManager } from '@flexkit/asset-manager';
import { Desk } from '@flexkit/desk';
import { Explorer } from '@flexkit/explorer';
import { CustomTextField } from './app/components/custom-input-field';
import { CustomBooleanPreviewField } from './app/components/custom-boolean-preview-field';
import '@flexkit/explorer/styles.css';

export default defineConfig([
  {
    title: 'Flexkit',
    projectId: 'abcdefghij',
    basePath: '/studio',
    menuGroups: [
      { title: 'Catalog', name: 'catalog' },
      { title: 'Operations', name: 'operations' },
    ],
    plugins: [
      Desk(),
      AssetManager(),
      Explorer(),
      {
        // <-- this is a plugin. It's a function that returns a plugin object. Required fields are `name` and `contributes`.
        name: 'flexkit.desk',
        contributes: {
          apps: [
            // <-- this is a list of apps that will be shown in the sidebar. It's an array, because existing apps can't be overwritten.
            // {
            //   name: 'images',
            //   icon: <Image strokeWidth={1.5} />,
            //   title: 'Images',
            //   component: <div>Images</div>,
            // },
            // {
            //   name: 'products',
            //   icon: <Tag strokeWidth={1.5} />,
            //   title: 'Products',
            //   component: <div>Products</div>,
            // },
            // {
            //   name: 'categories',
            //   icon: <Layers3 strokeWidth={1.5} />,
            //   title: 'Categories',
            //   component: <div>Categories</div>,
            // },
          ],
          formFields: {
            // <-- this is a list of custom form fields that can be used in the desk app. It's an object, because existing fields can be overwritten.
            textWithCounter: {
              component: CustomTextField,
              description: 'An example override of the text field',
            },
          },
          previewFields: {
            customBooleanPreviewField: {
              component: CustomBooleanPreviewField,
              description: 'A boolean field with an icon preview',
            },
          },
          navbar: {
            logo: {
              component: (props) => {
                return (
                  <a className="fk-flex fk-items-center" href="/" title={props.title}>
                    {props.theme === 'light' ? (
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
          // {
          //   name: 'test-plugin',
          //   contributes: {
          //     apps: [
          //       {
          //         name: 'test2',
          //         icon: <Layers3 strokeWidth={1.5} />,
          //         title: 'Categories 2',
          //         component: <div>Categories test 2</div>,
          //       },
          //     ],
          //   },
          //   plugins: [
          //     // another nested plugin
          //     {
          //       name: 'test-plugin-2',
          //       contributes: {},
          //     },
          //   ],
          // },
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
    scopes: [
      {
        name: 'default',
        label: 'Default',
        isDefault: true,
      },
      {
        name: 'es',
        label: 'Naturitas.es',
      },
      {
        name: 'pt',
        label: 'Naturitas.pt',
      },
      {
        name: 'fr',
        label: 'Naturitas.fr',
      },
      {
        name: 'it',
        label: 'Naturitas.it',
      },
      {
        name: 'uk',
        label: 'Naturitas.co.uk',
      },
      {
        name: 'en',
        label: 'Naturitas.us',
      },
      {
        name: 'de',
        label: 'Naturitas.de',
      },
      {
        name: 'lengow',
        label: 'Lengow',
      },
      {
        name: 'fruugo',
        label: 'Fruugo',
      },
    ],
    schema: [
      {
        name: 'product',
        plural: 'products',
        menu: {
          label: 'Products',
          group: 'catalog',
          icon: <TagIcon />,
        },
        attributes: [
          {
            name: 'name',
            label: 'Name',
            scope: 'local',
            options: {
              size: 260,
              comment: 'The name of the product',
            },
            dataType: 'string', // <-- This is the data type of the attribute, it directly affects how the data is saved in the database
            inputType: 'text', // <-- This affects how the data is displayed in the form (text input, select, WYSIWYG editor, textarea, etc)
            previewType: 'text', // <-- This affects how the data is displayed in the list view (text, image, boolean, WYSIWYG preview, etc)
            isSearchable: true,
            isPrimary: true,
            validation: (z) => z.string().min(1, { message: 'Name is required' }),
            defaultValue: '',
          },
          {
            name: 'sku',
            label: 'SKU',
            scope: 'global',
            options: {
              size: 130,
              comment: 'Unique SKU identifier',
            },
            dataType: 'string',
            isSearchable: true,
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
              size: 140,
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
            isSearchable: true,
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
          {
            name: 'category',
            label: 'Category',
            scope: 'relationship',
            options: {
              size: 260,
              comment: 'Each product belongs to one and only one category',
            },
            dataType: 'string',
            inputType: 'relationship',
            isSearchable: true,
            defaultValue: '',
            relationship: {
              mode: 'single',
              field: 'name',
              entity: 'category',
            },
          },
          {
            name: 'mainImage',
            label: 'Main Image',
            options: {
              accept: 'image/*',
              size: 160,
              comment: 'The main image of the product',
            },
            dataType: 'image',
            inputType: 'image',
            scope: 'global', // TODO: Images have global scope. The type should be adjusted to not require a scope when inputType is image
            defaultValue: '',
          },
          {
            name: 'price',
            label: 'Price',
            scope: 'local',
            options: {
              size: 130,
              comment: 'The price of the product',
            },
            dataType: 'float',
            inputType: 'number',
            previewType: 'text',
            isPrimary: true,
            validation: (z) => z.number().min(1, { message: 'Price is required' }),
            defaultValue: '',
          },
          {
            name: 'pvpr',
            label: 'PVPR',
            scope: 'local',
            options: {
              size: 130,
              comment: 'Precio de Venta Público Recomendado',
            },
            dataType: 'float',
            inputType: 'number',
            previewType: 'text',
            isPrimary: true,
            validation: (z) => z.number().min(1, { message: 'PVPR is required' }),
            defaultValue: '',
          },
          {
            name: 'specialPrice',
            label: 'Special Price',
            scope: 'local',
            options: {
              size: 130,
              comment: 'Special price of the product',
            },
            dataType: 'float',
            inputType: 'number',
            isPrimary: true,
            defaultValue: '',
          },
          {
            name: 'specialPriceFrom',
            label: 'Special Price From',
            scope: 'local',
            options: {
              size: 240,
              comment: 'Initial date and time of the special price',
            },
            dataType: 'datetime',
            inputType: 'datetime',
            isPrimary: true,
            defaultValue: '',
          },
          {
            name: 'specialPriceTo',
            label: 'Special Price To',
            scope: 'local',
            options: {
              size: 240,
              comment: 'Final date and time of the special price',
            },
            dataType: 'datetime',
            inputType: 'datetime',
            isPrimary: true,
            defaultValue: '',
          },
        ],
      },
      {
        name: 'category',
        plural: 'categories',
        menu: {
          label: 'Categories',
          group: 'catalog',
          icon: <FolderTreeIcon />,
        },
        attributes: [
          {
            name: 'name',
            label: 'Name',
            scope: 'local',
            options: {
              size: 260,
              comment: 'The name of the category',
            },
            dataType: 'string',
            inputType: 'text',
            isSearchable: true,
            isPrimary: true,
            validation: (z) => z.string().min(1, { message: 'Name is required' }),
            defaultValue: '',
          },
          {
            name: 'description',
            label: 'Description',
            scope: 'local',
            options: {
              size: 260,
              comment: 'A short description of the category',
            },
            dataType: 'string',
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'Description is required' }),
            defaultValue: '',
          },
          {
            name: 'bottomDescription',
            label: 'Bottom Description',
            scope: 'local',
            options: {
              size: 260,
              comment: 'Description shwon at the bottom of the category page',
            },
            dataType: 'string',
            inputType: 'editor',
            defaultValue: '',
          },
          {
            name: 'isInMenu',
            label: 'Is in Menu',
            scope: 'local',
            options: {
              size: 100,
              comment: 'Whether the category is shown in the menu',
            },
            dataType: 'boolean',
            inputType: 'switch',
            previewType: 'customBooleanPreviewField',
          },
          {
            name: 'path',
            label: 'Path',
            scope: 'local',
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
            scope: 'local',
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
              comment: 'The meta-title of the category',
            },
            dataType: 'string',
            inputType: 'textWithCounter',
            isPrimary: true,
            validation: (z) => z.string().optional(),
            defaultValue: '',
          },
          {
            name: 'metaDescription',
            label: 'Meta Description',
            scope: 'local',
            options: {
              size: 260,
              comment: 'The meta-description of the category',
            },
            dataType: 'string',
            inputType: 'textWithCounter',
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
              comment: 'Products related to this flag',
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
      {
        name: 'flag',
        plural: 'flags',
        menu: {
          label: 'Flags',
          group: 'catalog',
          icon: <FlagIcon />,
        },
        attributes: [
          {
            name: 'name',
            label: 'Name',
            scope: 'local',
            options: {
              size: 200,
              comment: 'A characteristic or benefit of a product',
            },
            dataType: 'string',
            inputType: 'text',
            isSearchable: true,
            isPrimary: true,
            validation: (z) => z.string().min(1, { message: 'Name is required' }),
            defaultValue: '',
          },
          {
            name: 'tooltip',
            label: 'Tooltip',
            scope: 'local',
            options: {
              size: 450,
              comment: 'The tooltip text to display when hovering over the flag',
            },
            dataType: 'string',
            inputType: 'textarea',
            validation: (z) => z.string().min(1, { message: 'Tooltip is required' }),
            defaultValue: '',
          },
          {
            name: 'products',
            label: 'Products',
            scope: 'relationship',
            options: {
              size: 260,
              comment: 'Products related to this flag',
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
          {
            name: 'image',
            label: 'Image',
            options: {
              accept: 'image/svg+xml',
              size: 160,
              comment: 'An SVG image representing the flag',
            },
            dataType: 'image',
            inputType: 'image',
            scope: 'global',
            defaultValue: '',
          },
        ],
      },
      {
        name: 'brand',
        plural: 'brands',
        menu: {
          label: 'Brands',
          group: 'catalog',
          icon: <StoreIcon />,
        },
        attributes: [
          {
            name: 'name',
            label: 'Name',
            scope: 'global',
            options: {
              size: 200,
              comment: 'The name of the brand',
            },
            dataType: 'string',
            isPrimary: true,
            isUnique: true,
            isSearchable: true,
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
      {
        name: 'customer',
        plural: 'customers',
        menu: {
          label: 'Customers',
          group: 'operations',
          icon: <UserIcon />,
        },
        attributes: [
          {
            name: 'email',
            label: 'Email',
            scope: 'global',
            options: {
              size: 260,
              comment: 'The email of the customer',
            },
            dataType: 'string',
            inputType: 'text',
            isSearchable: true,
            isPrimary: true,
            validation: (z) => z.string().min(1, { message: 'Email is required' }),
            defaultValue: '',
          },
          {
            name: 'name',
            label: 'Name',
            scope: 'global',
            options: {
              size: 200,
              comment: 'The name of the customer',
            },
            dataType: 'string',
            inputType: 'text',
            isSearchable: true,
            validation: (z) => z.string().min(1, { message: 'Name is required' }),
            defaultValue: '',
          },
          {
            name: 'lastname',
            label: 'Last Name',
            scope: 'global',
            options: {
              size: 200,
              comment: 'The last name of the customer',
            },
            dataType: 'string',
            inputType: 'text',
            isSearchable: true,
            validation: (z) => z.string().min(1, { message: 'Last name is required' }),
            defaultValue: '',
          },
          {
            name: 'phone',
            label: 'Phone',
            scope: 'global',
            options: {
              size: 120,
              comment: 'The phone number of the customer',
            },
            dataType: 'string',
            inputType: 'text',
            isSearchable: true,
            validation: (z) => z.string().min(1, { message: 'Phone is required' }),
            defaultValue: '',
          },
          {
            name: 'addresses',
            label: 'Addresses',
            scope: 'relationship',
            options: {
              size: 260,
              comment: 'Addresses of the customer',
            },
            dataType: 'string',
            inputType: 'relationship',
            defaultValue: '',
            relationship: {
              mode: 'multiple',
              field: 'address',
              entity: 'customerAddress',
            },
          },
        ],
      },
      {
        name: 'customerAddress',
        plural: 'customerAddresses',
        menu: {
          hidden: true,
        },
        attributes: [
          {
            name: 'name',
            label: 'Name',
            scope: 'global',
            options: {
              size: 200,
              comment: 'The name of the customer receiving the order',
            },
            dataType: 'string',
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'Name is required' }),
            defaultValue: '',
          },
          {
            name: 'lastname',
            label: 'Last Name',
            scope: 'global',
            options: {
              size: 200,
              comment: 'The last name of the customer receiving the order',
            },
            dataType: 'string',
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'Last name is required' }),
            defaultValue: '',
          },
          {
            name: 'address',
            label: 'Full Address',
            scope: 'global',
            options: {
              size: 400,
              comment: 'The full address of the customer',
            },
            dataType: 'string',
            inputType: 'textarea',
            isPrimary: true,
            validation: (z) => z.string().min(1, { message: 'Address is required' }),
            defaultValue: '',
          },
          {
            name: 'zipcode',
            label: 'Zipcode',
            scope: 'global',
            options: {
              size: 120,
              comment: 'The zipcode of the customer',
            },
            dataType: 'string',
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'Zipcode is required' }),
            defaultValue: '',
          },
          {
            name: 'city',
            label: 'City',
            scope: 'global',
            options: {
              size: 120,
              comment: 'The city of the customer',
            },
            dataType: 'string',
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'City is required' }),
            defaultValue: '',
          },
          {
            name: 'phone',
            label: 'Phone',
            scope: 'global',
            options: {
              size: 120,
              comment: 'The phone number of the customer',
            },
            dataType: 'string',
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'Phone is required' }),
            defaultValue: '',
          },
          {
            name: 'country',
            label: 'Country',
            scope: 'global',
            options: {
              size: 120,
              comment: 'The country of the customer',
            },
            dataType: 'string',
            inputType: 'text',
            validation: (z) => z.string().min(1, { message: 'Country is required' }),
            defaultValue: '',
          },
          {
            name: 'customers',
            label: 'Customers',
            scope: 'relationship',
            options: {
              size: 260,
              comment: 'Customer associated with this address',
            },
            dataType: 'string',
            inputType: 'relationship',
            defaultValue: '',
            relationship: {
              mode: 'single',
              field: 'email',
              entity: 'customer',
            },
          },
        ],
      },
      {
        name: 'salesOrder',
        plural: 'salesOrders',
        menu: {
          label: 'Sales Orders',
          group: 'operations',
          icon: <ShoppingCartIcon />,
        },
        attributes: [
          {
            name: 'state',
            label: 'State',
            scope: 'global',
            options: {
              size: 130,
              comment: 'The state of the order',
              list: [
                {
                  label: 'Completed',
                  value: 'completed',
                },
                {
                  label: 'In Progress',
                  value: 'inProgress',
                },
                {
                  label: 'Cancelled',
                  value: 'cancelled',
                },
              ],
              placeholder: 'Select a state',
            },
            dataType: 'string',
            inputType: 'select',
            isPrimary: true,
            validation: (z) => z.string().min(1, { message: 'State is required' }),
            defaultValue: '',
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
