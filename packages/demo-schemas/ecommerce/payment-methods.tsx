import { CreditCard as CreditCardIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const paymentMethods = defineEntity({
  name: 'paymentMethod',
  plural: 'paymentMethods',
  display: 'name',
  menu: {
    label: 'Payment Methods',
    group: 'finance',
    icon: <CreditCardIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 250,
        comment: 'The name of the payment method',
      },
      dataType: 'string',
      inputType: 'text',
      searchable: true,
      validation: (z) => z.string().min(1, { error: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'adminRef',
      label: 'Admin Ref',
      scope: 'global',
      options: {
        size: 250,
        comment: 'A reference number used to identify the payment method',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { error: 'Admin Ref is required' }),
      defaultValue: '',
    },
    {
      name: 'erpId',
      label: 'ERP ID',
      scope: 'global',
      options: {
        size: 150,
        comment: 'The ERP ID of the payment method',
      },
      dataType: 'int',
      inputType: 'number',
      validation: (z) => z.number().min(0, { error: 'ERP ID is required' }),
      defaultValue: 0,
    },
  ],
});
