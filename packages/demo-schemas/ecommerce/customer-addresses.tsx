import { defineEntity } from '@flexkit/studio';

export const customerAddresses = defineEntity({
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
});
