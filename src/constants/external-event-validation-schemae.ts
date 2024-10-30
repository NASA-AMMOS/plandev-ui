export const derivationGroupSchema = {
    additionalProperties: false,
    properties: {
        entries: {
            items: {
                additionalProperties: false,
                properties: {
                    name: { type: 'string' },
                    source_type_name: { type: 'string' },
                },
                required: ['name', 'source_type_name'],
                type: 'object',
            },
            type: 'array',
        },
    },
    required: ['entries'],
    type: 'object',
};

export const externalEventTypeSchema = {
    additionalProperties: false,
    properties: {
        entries: {
            items: {
                additionalProperties: false,
                properties: {
                    metadata: {
                        items: {
                            additionalProperties: false,
                            properties: {
                                isRequired: { type: 'boolean' },
                                name: { type: 'string' },
                                schema: {
                                    additionalProperties: false,
                                    properties: { type: { type: 'string' } },
                                    required: ['type'],
                                    type: 'object',
                                },
                            },
                            required: ['name', 'isRequired', 'schema'],
                            type: 'object',
                        },
                        type: 'array',
                    },
                    name: { type: 'string' },
                },
                required: ['name', 'metadata'],
                type: 'object',
            },
            type: 'array',
        },
    },
    required: ['entries'],
    type: 'object',
};
export const externalSourceTypeSchema = {
    additionalProperties: false,
    properties: {
        entries: {
            items: {
                additionalProperties: false,
                properties: {
                    metadata: {
                        items: {
                            additionalProperties: false,
                            properties: {
                                isRequired: { type: 'boolean' },
                                name: { type: 'string' },
                                schema: {
                                    additionalProperties: false,
                                    properties: { type: { type: 'string' } },
                                    required: ['type'],
                                    type: 'object',
                                },
                            },
                            required: ['name', 'isRequired', 'schema'],
                            type: 'object',
                        },
                        type: 'array',
                    },
                    name: { type: 'string' },
                },
                required: ['name', 'metadata'],
                type: 'object',
            },
            type: 'array',
        },
    },
    required: ['entries'],
    type: 'object',
};