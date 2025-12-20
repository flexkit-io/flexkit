import { ListTodo } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const pipelineStages = defineEntity({
  name: 'pipelineStage',
  plural: 'pipelineStages',
  menu: {
    label: 'Pipeline Stages',
    group: 'config',
    icon: <ListTodo />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Stage Name',
      scope: 'global',
      options: {
        size: 200,
        comment: 'Name of the pipeline stage',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Stage name is required' }),
      defaultValue: '',
    },
    {
      name: 'pipeline',
      label: 'Pipeline',
      scope: 'global',
      options: {
        list: [
          { label: 'Sales Pipeline', value: 'sales' },
          { label: 'Support Pipeline', value: 'support' },
          { label: 'Recruitment Pipeline', value: 'recruitment' },
        ],
        size: 180,
        comment: 'Pipeline this stage belongs to',
      },
      dataType: 'string',
      inputType: 'select',
      defaultValue: 'sales',
    },
    {
      name: 'position',
      label: 'Position',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Order position in the pipeline (lower numbers appear first)',
      },
      dataType: 'float',
      inputType: 'number',
      validation: (z) => z.number().int().min(0, { message: 'Position must be a positive number' }),
      defaultValue: '',
    },
    {
      name: 'probability',
      label: 'Win Probability (%)',
      scope: 'global',
      options: {
        size: 170,
        comment: 'Probability of winning a deal at this stage (percentage)',
        min: 0,
        max: 100,
      },
      dataType: 'float',
      inputType: 'number',
      defaultValue: '',
    },
    {
      name: 'color',
      label: 'Color',
      scope: 'global',
      options: {
        size: 160,
        comment: 'Color representing this stage',
      },
      dataType: 'string',
      inputType: 'color',
      defaultValue: '',
    },
    {
      name: 'isActive',
      label: 'Active',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Whether this stage is active',
      },
      dataType: 'boolean',
      inputType: 'switch',
      defaultValue: '',
    },
    {
      name: 'description',
      label: 'Description',
      scope: 'global',
      options: {
        size: 260,
        comment: 'Description of this pipeline stage',
      },
      dataType: 'string',
      inputType: 'textarea',
      defaultValue: '',
    },
  ],
});
