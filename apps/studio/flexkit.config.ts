import { defineConfig } from '@flexkit/studio/server';

export default defineConfig({
  name: 'Flexkit',
  projectId: 'uwerfsxskp',
  dataset: 'production',
  basePath: '/studio',
  plugins: [
    {
      // <-- this is a plugin. It's a function that returns a plugin object. Required fields are `name` and `contributes`.
      name: 'flexkit.desk',
      title: 'Desk',
      contributes: {
        apps: [
          // <-- this is a list of apps that will be shown in the sidebar. It's an array, because existing apps can't be overwritten.
          {
            name: 'flexkit.desk',
            title: 'Desk',
            icon: 'desk',
            component: 'some/component',
          },
        ],
        formFields: {
          // <-- this is a list of custom form fields that can be used in the desk app. It's an object, because existing fields can be overwritten.
          input: {
            name: 'customField',
            component: 'someCustomFieldComponent',
          },
        },
      },
      plugins: [
        // nested plugins are allowed. For example, the `desk` plugin could have a `gridList` plugin.
        // gridList()
      ],
    },
    {
      name: 'flexkit.hello',
      title: 'Hello',
      contributes: {
        commands: [
          {
            title: 'Hello World',
            command: (flexkit) => {
              flexkit.showInformationMessage('Hello World!');
            },
          },
        ],
      },
    },
  ],
});
