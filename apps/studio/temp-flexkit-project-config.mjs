import { defineConfig } from '@flexkit/studio/ssr';
// import { Image, Layers3, Tag } from 'lucide-react';
export default defineConfig([
    {
        projectId: 'abcdefghij',
        scopes: [
            {
                name: 'default',
                label: 'Default',
                isDefault: true
            },
            {
                name: 'en',
                label: 'EN'
            },
            {
                name: 'es',
                label: 'ES'
            }
        ],
        schema: [
            {
                name: 'product',
                plural: 'products',
                attributes: [
                    {
                        name: 'name',
                        label: 'Name',
                        scope: 'local',
                        options: {
                            size: 260,
                            comment: 'The name of the product'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        isPrimary: true,
                        defaultValue: ''
                    },
                    {
                        name: 'sku',
                        label: 'SKU',
                        scope: 'global',
                        options: {
                            size: 260,
                            comment: 'Unique SKU identifier'
                        },
                        dataType: 'string',
                        isSearchable: true,
                        isUnique: true,
                        inputType: 'text',
                        defaultValue: ''
                    },
                    {
                        name: 'productType',
                        label: 'Product Type',
                        scope: 'global',
                        options: {
                            list: [
                                {
                                    label: 'Simple',
                                    value: 'simple'
                                },
                                {
                                    label: 'Configurable',
                                    value: 'configurable'
                                }
                            ],
                            placeholder: 'Select a product type',
                            size: 260,
                            comment: 'Type of Magento product: simple or configurable'
                        },
                        dataType: 'string',
                        isUnique: false,
                        inputType: 'select',
                        defaultValue: 'simple'
                    },
                    {
                        name: 'brand',
                        label: 'Brand',
                        scope: 'relationship',
                        options: {
                            size: 260,
                            comment: 'Brand of the product (i.e. Solgar, Naturitas Essentials, etc)'
                        },
                        dataType: 'string',
                        inputType: 'relationship',
                        isSearchable: true,
                        defaultValue: '',
                        relationship: {
                            mode: 'single',
                            field: 'name',
                            entity: 'brand'
                        }
                    },
                    {
                        name: 'flags',
                        label: 'Flags',
                        scope: 'relationship',
                        options: {
                            size: 260,
                            comment: 'Product flags (Bio, 100% Natural, etc)'
                        },
                        dataType: 'string',
                        inputType: 'relationship',
                        defaultValue: '',
                        relationship: {
                            mode: 'multiple',
                            field: 'name',
                            entity: 'flag'
                        }
                    },
                    {
                        name: 'category',
                        label: 'Category',
                        scope: 'relationship',
                        options: {
                            size: 260,
                            comment: 'Each product belongs to one and only one category'
                        },
                        dataType: 'string',
                        inputType: 'relationship',
                        isSearchable: true,
                        defaultValue: '',
                        relationship: {
                            mode: 'single',
                            field: 'name',
                            entity: 'category'
                        }
                    }
                ]
            },
            {
                name: 'category',
                plural: 'categories',
                attributes: [
                    {
                        name: 'name',
                        label: 'Name',
                        scope: 'local',
                        options: {
                            size: 260,
                            comment: 'The name of the category'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        isPrimary: true,
                        defaultValue: ''
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        scope: 'local',
                        options: {
                            size: 260,
                            comment: 'A short description of the category'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        defaultValue: ''
                    },
                    {
                        name: 'bottomDescription',
                        label: 'Bottom Description',
                        scope: 'local',
                        options: {
                            size: 260,
                            comment: 'Description shwon at the bottom of the category page'
                        },
                        dataType: 'string',
                        inputType: 'editor',
                        defaultValue: ''
                    },
                    {
                        name: 'isInMenu',
                        label: 'Is in Menu',
                        scope: 'local',
                        options: {
                            size: 100,
                            comment: 'Whether the category is shown in the menu'
                        },
                        dataType: 'boolean',
                        inputType: 'switch'
                    },
                    {
                        name: 'path',
                        label: 'Path',
                        scope: 'global',
                        options: {
                            size: 260,
                            comment: 'URL path'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        defaultValue: ''
                    },
                    {
                        name: 'pathSegment',
                        label: 'Path Segment',
                        scope: 'global',
                        options: {
                            size: 260,
                            comment: 'URL path segment'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        isPrimary: true,
                        defaultValue: ''
                    },
                    {
                        name: 'metaTitle',
                        label: 'Meta Title',
                        scope: 'local',
                        options: {
                            size: 260,
                            comment: 'The meta-title of the category'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        isPrimary: true,
                        defaultValue: ''
                    },
                    {
                        name: 'metaDescription',
                        label: 'Meta Description',
                        scope: 'local',
                        options: {
                            size: 260,
                            comment: 'The meta-description of the category'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        isPrimary: true,
                        defaultValue: ''
                    }
                ]
            },
            {
                name: 'flag',
                plural: 'flags',
                attributes: [
                    {
                        name: 'name',
                        label: 'Name',
                        scope: 'local',
                        options: {
                            size: 260,
                            comment: 'A characteristic or benefit of a product'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        isPrimary: true,
                        defaultValue: ''
                    },
                    {
                        name: 'tooltip',
                        label: 'Tooltip',
                        scope: 'local',
                        options: {
                            size: 360,
                            comment: 'The tooltip text to display when hovering over the flag'
                        },
                        dataType: 'string',
                        inputType: 'textarea',
                        defaultValue: ''
                    },
                    {
                        name: 'products',
                        label: 'Products',
                        scope: 'relationship',
                        options: {
                            size: 260,
                            comment: 'Products related to this flag'
                        },
                        dataType: 'string',
                        inputType: 'relationship',
                        defaultValue: '',
                        relationship: {
                            mode: 'multiple',
                            field: 'name',
                            entity: 'product'
                        }
                    }
                ]
            },
            {
                name: 'brand',
                plural: 'brands',
                attributes: [
                    {
                        name: 'name',
                        label: 'Name',
                        scope: 'global',
                        options: {
                            size: 120,
                            comment: 'The name of the brand'
                        },
                        dataType: 'string',
                        isPrimary: true,
                        isUnique: true,
                        inputType: 'text',
                        defaultValue: ''
                    },
                    {
                        name: 'path',
                        label: 'Path',
                        scope: 'global',
                        options: {
                            size: 260,
                            comment: 'URL path'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        defaultValue: ''
                    },
                    {
                        name: 'pathSegment',
                        label: 'Path Segment',
                        scope: 'global',
                        options: {
                            size: 260,
                            comment: 'URL path segment'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        isPrimary: true,
                        defaultValue: ''
                    },
                    {
                        name: 'metaTitle',
                        label: 'Meta Title',
                        scope: 'local',
                        options: {
                            size: 260,
                            comment: 'The meta-title of the brand'
                        },
                        dataType: 'string',
                        inputType: 'text',
                        isPrimary: true,
                        defaultValue: ''
                    },
                    {
                        name: 'products',
                        label: 'Products',
                        scope: 'relationship',
                        options: {
                            size: 260,
                            comment: 'Products of this brand'
                        },
                        dataType: 'string',
                        inputType: 'relationship',
                        defaultValue: '',
                        relationship: {
                            mode: 'multiple',
                            field: 'name',
                            entity: 'product'
                        }
                    }
                ]
            }
        ]
    },
    {
        projectId: 'uwerfsxskp',
        schema: []
    }
]);
