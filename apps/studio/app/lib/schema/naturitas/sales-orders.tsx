import { ShoppingCart as ShoppingCartIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const salesOrders = defineEntity({
  name: 'salesOrder',
  plural: 'salesOrders',
  menu: {
    label: 'Sales Orders',
    group: 'operations',
    icon: <ShoppingCartIcon />,
  },
  attributes: [
    {
      name: 'date',
      label: 'Date',
      scope: 'global',
      options: {
        size: 150,
        comment: 'Date and time of the order',
      },
      dataType: 'datetime',
      inputType: 'datetime',
      defaultValue: '',
    },
    {
      name: 'channel',
      label: 'Channel',
      scope: 'relationship',
      options: {
        size: 150,
        comment: 'Channel of the order (i.e. naturitas.es, fruugo, etc)',
      },
      dataType: 'string',
      inputType: 'relationship',
      isSearchable: true,
      defaultValue: '',
      relationship: {
        mode: 'single',
        field: 'name',
        entity: 'channel',
      },
    },
    {
      name: 'customer',
      label: 'Customer',
      scope: 'relationship',
      options: {
        size: 160,
        comment: 'Customer who made the order',
      },
      dataType: 'string',
      inputType: 'relationship',
      isPrimary: true,
      isSearchable: true,
      defaultValue: '',
      relationship: {
        mode: 'single',
        field: 'email',
        entity: 'customer',
      },
    },
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
      validation: (z) => z.string().min(1, { message: 'State is required' }),
      defaultValue: '',
    },
    {
      name: 'paymentMethod',
      label: 'Payment Method',
      scope: 'global',
      options: {
        size: 130,
        comment: 'The payment method of the order',
        list: [
          {
            label: 'Adyen',
            value: 'adyen',
          },
          {
            label: 'Paypal',
            value: 'paypal',
          },
          {
            label: 'Bizum',
            value: 'bizum',
          },
          {
            label: 'Fruugo',
            value: 'fruugo',
          },
        ],
        placeholder: 'Select a payment method',
      },
      dataType: 'string',
      inputType: 'select',
      validation: (z) => z.string().min(1, { message: 'Payment method is required' }),
      defaultValue: '',
    },
    {
      name: 'currency',
      label: 'Currency',
      scope: 'global',
      options: {
        size: 130,
        comment: 'The currency of the order',
        list: [
          {
            label: 'EUR',
            value: 'EUR',
          },
          {
            label: 'USD',
            value: 'USD',
          },
        ],
        placeholder: 'Select a currency',
      },
      dataType: 'string',
      inputType: 'select',
      validation: (z) => z.string().min(1, { message: 'Currency is required' }),
      defaultValue: '',
    },
    {
      name: 'total',
      label: 'Total',
      scope: 'local',
      options: {
        size: 130,
        comment: 'The total amount of the order',
      },
      dataType: 'float',
      inputType: 'number',
      previewType: 'text',
      validation: (z) => z.number().min(1, { message: 'Total is required' }),
      defaultValue: '',
    },
    {
      name: 'salesOrderItems',
      label: 'Sales Order Items',
      scope: 'relationship',
      options: {
        size: 160,
        comment: 'Items of the order',
      },
      dataType: 'string',
      inputType: 'relationship',
      isPrimary: true,
      isSearchable: true,
      defaultValue: '',
      relationship: {
        mode: 'multiple',
        field: 'name',
        entity: 'salesOrderItem',
      },
    },
  ],
});
