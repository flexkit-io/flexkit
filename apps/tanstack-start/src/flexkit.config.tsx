import { defineConfig } from '@flexkit/studio';
import { AssetManager } from '@flexkit/asset-manager';
import { Desk } from '@flexkit/desk';
import { Explorer } from '@flexkit/explorer';
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
    plugins: [Desk(), AssetManager(), Explorer()],
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
    plugins: [Desk(), AssetManager(), Explorer()],
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
