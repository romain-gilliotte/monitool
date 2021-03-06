module.exports = {
    definitions: require('./_definitions'),
    $id: 'http://monitool.org/schemas/schema.json',
    type: 'object',
    additionalProperties: false,
    required: [
        'owner',
        'country',
        'name',
        'start',
        'end',
        'active',
        'entities',
        'groups',
        'forms',
        'logicalFrames',
        'extraIndicators',
    ],
    properties: {
        owner: {
            type: 'string',
            minLength: 1,
        },
        country: {
            type: 'string',
            minLength: 1,
        },
        name: {
            type: 'string',
            minLength: 1,
        },
        start: {
            type: 'string',
            format: 'date',
        },
        end: {
            type: 'string',
            format: 'date',
        },
        active: {
            type: 'boolean',
        },
        entities: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'name', 'active'],
                properties: {
                    id: {
                        $ref: '#/definitions/uuid',
                    },
                    name: {
                        type: 'string',
                        minLength: 1,
                    },
                    active: {
                        type: 'boolean',
                    },
                },
            },
        },
        groups: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'name', 'members'],
                properties: {
                    id: {
                        $ref: '#/definitions/uuid',
                    },
                    name: {
                        type: 'string',
                        minLength: 1,
                    },
                    members: {
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            $ref: '#/definitions/uuid',
                        },
                    },
                },
            },
        },
        forms: {
            type: 'array',
            items: require('./data-source'),
        },
        logicalFrames: {
            type: 'array',
            items: require('./logical-framework'),
        },
        extraIndicators: {
            type: 'array',
            items: {
                $ref: '#/definitions/indicator',
            },
        },
    },
};
