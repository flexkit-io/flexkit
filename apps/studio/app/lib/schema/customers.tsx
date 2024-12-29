import { User as UserIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const customers = defineEntity({
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
    {
      name: 'orders',
      label: 'Orders',
      scope: 'relationship',
      options: {
        size: 160,
        comment: 'Orders of the customer',
      },
      dataType: 'string',
      inputType: 'relationship',
      defaultValue: '',
      relationship: {
        mode: 'multiple',
        field: 'date',
        entity: 'salesOrder',
      },
    },
  ],
});
