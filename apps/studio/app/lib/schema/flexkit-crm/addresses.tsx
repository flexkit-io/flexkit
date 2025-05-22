import { MapPin } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const addresses = defineEntity({
  name: 'address',
  plural: 'addresses',
  menu: {
    label: 'Addresses',
    group: 'contacts',
    icon: <MapPin />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Address Name',
      scope: 'global',
      options: {
        size: 200,
        comment: 'Name for this address (e.g. "Headquarters", "Branch Office")',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      defaultValue: '',
    },
    {
      name: 'street',
      label: 'Street',
      scope: 'global',
      options: {
        size: 260,
        comment: 'Street address',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Street is required' }),
      defaultValue: '',
    },
    {
      name: 'street2',
      label: 'Street 2',
      scope: 'global',
      options: {
        size: 260,
        comment: 'Additional street address information',
      },
      dataType: 'string',
      inputType: 'text',
      defaultValue: '',
    },
    {
      name: 'city',
      label: 'City',
      scope: 'global',
      options: {
        size: 200,
        comment: 'City',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      validation: (z) => z.string().min(1, { message: 'City is required' }),
      defaultValue: '',
    },
    {
      name: 'state',
      label: 'State/Province',
      scope: 'global',
      options: {
        size: 200,
        comment: 'State or province',
      },
      dataType: 'string',
      inputType: 'text',
      defaultValue: '',
    },
    {
      name: 'postalCode',
      label: 'Postal Code',
      scope: 'global',
      options: {
        size: 120,
        comment: 'ZIP or postal code',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Postal code is required' }),
      defaultValue: '',
    },
    {
      name: 'country',
      label: 'Country',
      scope: 'relationship',
      options: {
        size: 200,
        comment: 'Country',
      },
      dataType: 'string',
      inputType: 'relationship',
      isSearchable: true,
      defaultValue: '',
      relationship: {
        mode: 'single',
        field: 'name',
        entity: 'country',
      },
      validation: (z) =>
        z.object({
          _id: z.string().min(1, { message: 'Country is required' }),
        }),
    },
    {
      name: 'type',
      label: 'Address Type',
      scope: 'global',
      options: {
        list: [
          { label: 'Billing', value: 'billing' },
          { label: 'Shipping', value: 'shipping' },
          { label: 'Home', value: 'home' },
          { label: 'Work', value: 'work' },
          { label: 'Other', value: 'other' },
        ],
        size: 140,
        comment: 'Type of address',
      },
      dataType: 'string',
      inputType: 'select',
      defaultValue: 'work',
    },
    {
      name: 'isDefault',
      label: 'Default Address',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Whether this is the default address',
      },
      dataType: 'boolean',
      inputType: 'switch',
      defaultValue: '',
    },
    {
      name: 'phone',
      label: 'Phone',
      scope: 'global',
      options: {
        size: 160,
        comment: 'Phone number at this address',
      },
      dataType: 'string',
      inputType: 'text',
      defaultValue: '',
    },
  ],
});
