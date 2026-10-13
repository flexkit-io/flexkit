import { defineConfig } from '@flexkit/schema';
import { products } from 'demo-schemas/ecommerce/products';
import { categories } from 'demo-schemas/ecommerce/categories';
import { flags } from 'demo-schemas/ecommerce/flags';
import { brands } from 'demo-schemas/ecommerce/brands';
import { customers } from 'demo-schemas/ecommerce/customers';
import { customerAddresses } from 'demo-schemas/ecommerce/customer-addresses';
import { salesOrders } from 'demo-schemas/ecommerce/sales-orders';
import { salesOrderItems } from 'demo-schemas/ecommerce/sales-order-items';
import { shipments } from 'demo-schemas/ecommerce/shipments';
import { shipmentItems } from 'demo-schemas/ecommerce/shipment-items';
import { channels } from 'demo-schemas/ecommerce/channels';
import { taxes } from 'demo-schemas/ecommerce/taxes';
import { countries } from 'demo-schemas/ecommerce/countries';
import { paymentMethods } from 'demo-schemas/ecommerce/payment-methods';
import { paymentTerms } from 'demo-schemas/ecommerce/payment-terms';
import { currencies } from 'demo-schemas/ecommerce/currencies';
import { languages } from 'demo-schemas/ecommerce/languages';
import { flavours } from 'demo-schemas/ecommerce/flavours';
import { essenses } from 'demo-schemas/ecommerce/essenses';
import { uses } from 'demo-schemas/ecommerce/uses';
import { promoTags } from 'demo-schemas/ecommerce/promo-tags';
import { promoCodes } from 'demo-schemas/ecommerce/promo-codes';
import { contentFormats } from 'demo-schemas/ecommerce/content-formats';
import { reviews } from 'demo-schemas/ecommerce/reviews';
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
    title: 'Atlas Commerce',
    projectId: 'abcdefghij',
    menuGroups: [
      { title: 'Catalog', name: 'catalog' },
      { title: 'UGC', name: 'ugc' },
      { title: 'Operations', name: 'operations' },
      { title: 'Finance', name: 'finance' },
      { title: 'Config', name: 'config' },
    ],
    spaces: [
      { code: 'gtm', label: 'GTM' },
      { code: 'mkt', label: 'Marketing' },
      { code: 'finance', label: 'Finance' },
      { code: 'ops', label: 'Operations' },
      { code: 'cx', label: 'Customer Support' },
      { code: 'legal', label: 'Legal' },
      { code: 'people', label: 'People' },
      { code: 'data', label: 'Data & Analytics' },
      { code: 'it', label: 'IT' },
    ],
    scopes: [
      { name: 'default', label: 'Default', isDefault: true },
      { name: 'es', label: 'Spain' },
      { name: 'pt', label: 'Portugal' },
      { name: 'fr', label: 'France' },
      { name: 'it', label: 'Italy' },
      { name: 'uk', label: 'United Kingdom' },
      { name: 'en', label: 'United States' },
      { name: 'de', label: 'Germany' },
      { name: 'sk', label: 'Slovakia' },
      { name: 'nl', label: 'Netherlands' },
      { name: 'ro', label: 'Romania' },
      { name: 'hu', label: 'Hungary' },
      { name: 'pl', label: 'Poland' },
      { name: 'fi', label: 'Finland' },
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
      shipments,
      shipmentItems,
      taxes,
      countries,
      channels,
      paymentMethods,
      paymentTerms,
      currencies,
      languages,
      flavours,
      essenses,
      uses,
      promoTags,
      promoCodes,
      contentFormats,
      reviews,
    ],
  },
  {
    title: 'Flexkit CRM',
    projectId: 'uwerfsxskp',
    menuGroups: [
      { title: 'Contacts', name: 'contacts' },
      { title: 'Sales', name: 'sales' },
      { title: 'Marketing', name: 'marketing' },
      { title: 'Activities', name: 'activities' },
      { title: 'Config', name: 'config' },
    ],
    scopes: [
      { name: 'default', label: 'Global', isDefault: true },
      { name: 'na', label: 'North America' },
      { name: 'emea', label: 'Europe, Middle East & Africa' },
      { name: 'apac', label: 'Asia Pacific' },
      { name: 'latam', label: 'Latin America' },
      { name: 'enterprise', label: 'Enterprise Division' },
      { name: 'smb', label: 'SMB Division' },
      { name: 'government', label: 'Government' },
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
