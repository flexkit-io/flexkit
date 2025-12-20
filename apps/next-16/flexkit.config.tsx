import Link from 'next/link';
import { defineConfig } from '@flexkit/studio';
import { AssetManager } from '@flexkit/asset-manager';
import { Desk } from '@flexkit/desk';
import { Explorer } from '@flexkit/explorer';
import { CustomTextField } from './app/components/custom-input-field';
import { CustomBooleanPreviewField } from './app/components/custom-boolean-preview-field';
import { RatePreviewField } from './app/components/rate-preview-field';
import { products } from 'demo-schemas/naturitas/products';
import { categories } from 'demo-schemas/naturitas/categories';
import { flags } from 'demo-schemas/naturitas/flags';
import { brands } from 'demo-schemas/naturitas/brands';
import { customers } from 'demo-schemas/naturitas/customers';
import { customerAddresses } from 'demo-schemas/naturitas/customer-addresses';
import { salesOrders } from 'demo-schemas/naturitas/sales-orders';
import { salesOrderItems } from 'demo-schemas/naturitas/sales-order-items';
import { channels } from 'demo-schemas/naturitas/channels';
import { taxes } from 'demo-schemas/naturitas/taxes';
import { countries } from 'demo-schemas/naturitas/countries';
import { paymentMethods } from 'demo-schemas/naturitas/payment-methods';
import { paymentTerms } from 'demo-schemas/naturitas/payment-terms';
import { currencies } from 'demo-schemas/naturitas/currencies';
import { languages } from 'demo-schemas/naturitas/languages';
import { contacts } from 'demo-schemas/flexkit-crm/contacts';
import { companies } from 'demo-schemas/flexkit-crm/companies';
import { addresses } from 'demo-schemas/flexkit-crm/addresses';
import { deals } from 'demo-schemas/flexkit-crm/deals';
import { pipelineStages } from 'demo-schemas/flexkit-crm/pipeline-stages';
import { leadSources } from 'demo-schemas/flexkit-crm/lead-sources';
import { accountManagers } from 'demo-schemas/flexkit-crm/account-managers';
import { crmCurrencies } from 'demo-schemas/flexkit-crm/currencies';
import { crmProducts } from 'demo-schemas/flexkit-crm/products';
import { crmCountries } from 'demo-schemas/flexkit-crm/countries';
import { crmTags } from 'demo-schemas/flexkit-crm/tags';

export default defineConfig([
  {
    title: 'Naturitas',
    projectId: 'abcdefghij',
    basePath: '/studio',
    menuGroups: [
      { title: 'Catalog', name: 'catalog' },
      { title: 'Operations', name: 'operations' },
      { title: 'Finance', name: 'finance' },
      { title: 'Config', name: 'config' },
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
            ratePreviewField: {
              component: RatePreviewField,
              description: 'A tax rate preview field',
            },
          },
          navbar: {
            logo: {
              component: (props) => {
                return (
                  <Link className="fk-flex fk-items-center" href="/" title={props.title}>
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
                  </Link>
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
      // {
      //   name: "flexkit.hello",
      //   title: "Hello",
      //   contributes: {
      //     commands: [
      //       {
      //         title: "Hello World",
      //         command: (flexkit) => {
      //           flexkit;
      //           // flexkit.showInformationMessage('Hello World!');
      //         },
      //       },
      //     ],
      //   },
      // },
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
      products,
      categories,
      flags,
      brands,
      customers,
      customerAddresses,
      salesOrders,
      salesOrderItems,
      taxes,
      countries,
      channels,
      paymentMethods,
      paymentTerms,
      currencies,
      languages,
    ],
  },
  {
    title: 'Flexkit CRM',
    projectId: 'uwerfsxskp',
    basePath: '/studio',
    menuGroups: [
      { title: 'Contacts', name: 'contacts' },
      { title: 'Sales', name: 'sales' },
      { title: 'Marketing', name: 'marketing' },
      { title: 'Activities', name: 'activities' },
      { title: 'Config', name: 'config' },
    ],
    scopes: [
      {
        name: 'default',
        label: 'Global',
        isDefault: true,
      },
      {
        name: 'na',
        label: 'North America',
      },
      {
        name: 'emea',
        label: 'Europe, Middle East & Africa',
      },
      {
        name: 'apac',
        label: 'Asia Pacific',
      },
      {
        name: 'latam',
        label: 'Latin America',
      },
      {
        name: 'enterprise',
        label: 'Enterprise Division',
      },
      {
        name: 'smb',
        label: 'SMB Division',
      },
      {
        name: 'government',
        label: 'Government',
      },
    ],
    plugins: [
      Desk(),
      AssetManager(),
      Explorer(),
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
    schema: [
      contacts,
      companies,
      addresses,
      deals,
      pipelineStages,
      leadSources,
      accountManagers,
      crmCurrencies,
      crmProducts,
      crmCountries,
      crmTags,
    ],
  },
]);
