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
      // validation: (z) => z.string().min(1, { error: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'code',
      label: 'Code',
      scope: 'global',
      options: {
        size: 180,
        comment: 'Source payment method code used for import lookups',
      },
      dataType: 'string',
      inputType: 'text',
      unique: true,
      searchable: true,
      validation: (z) => z.string().min(1, { error: 'Code is required' }),
      defaultValue: '',
    },
  ],
});
