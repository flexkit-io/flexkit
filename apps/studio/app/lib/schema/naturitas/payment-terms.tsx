import { Timer as TimerIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const paymentTerms = defineEntity({
  name: 'paymentTerm',
  plural: 'paymentTerms',
  menu: {
    label: 'Payment Terms',
    group: 'finance',
    icon: <TimerIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 250,
        comment: 'The name of the payment term',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'adminRef',
      label: 'Admin Ref',
      scope: 'global',
      options: {
        size: 250,
        comment: 'A reference number used to identify the payment term',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Admin Ref is required' }),
      defaultValue: '',
    },
    {
      name: 'erpId',
      label: 'ERP ID',
      scope: 'global',
      options: {
        size: 150,
        comment: 'The ERP ID of the payment term',
      },
      dataType: 'int',
      inputType: 'number',
      validation: (z) => z.number().min(0, { message: 'ERP ID is required' }),
      defaultValue: '0',
    },
  ],
});
