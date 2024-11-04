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

export const externalSourceSchema = {
    additionalProperties: false,
    properties: {
        events: {
            items: {
                additionalProperties: false,
                properties: {
                    duration: { type: 'string' },
                    event_type: { type: 'string' },
                    key: { type: 'string' },
                    properties: {
                        additionalProperties: true,
                        properties: {},
                        required: [],
                        type: 'object'
                    },
                    start_time: { type: 'string' },
                },
                required: ['duration', 'event_type', 'key', 'properties', 'start_time'],
                type: 'object'
            },
            type: 'array'
        },
        source: {
            additionalProperties: false,
            properties: {
              key: { type: 'string' },
              metadata: {
                additionalProperties: true,
                properties: {}, // constrained by type, checked by DB trigger on upload. TODO: CHECK LOCALLY?
                required: [],
                type: 'object'
              },
              period:  {
                additionalProperties: false,
                properties: {
                    end_time: {
                        pattern: '^(\\d){4}-([0-3][0-9][0-9])T([0-1][0-9]):([0-1][0-9]):([0-1][0-9])Z$',
                        type: 'string'
                    },
                    start_time: {
                        pattern: '^(\\d){4}-([0-3][0-9][0-9])T([0-1][0-9]):([0-1][0-9]):([0-1][0-9])Z$',
                        type: 'string'
                    }
                },
                required: ['start_time', 'end_time'],
                type: 'object'
              },
              source_type: { type: "string" },
              valid_at: {
                pattern: '^(\\d){4}-([0-3][0-9][0-9])T([0-1][0-9]):([0-1][0-9]):([0-1][0-9])Z$',
                type: "string"
            }
            },
            required: ["key", "source_type", "valid_at", "period", "metadata"],
            type: 'object'
        }
    },
    required: ['source', 'events'],
    type: 'object'
}