module.exports = {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'name', 'goal', 'entities', 'start', 'end', 'indicators', 'purposes'],
    properties: {
        id: {
            $ref: '#/definitions/uuid',
        },
        name: {
            type: 'string',
        },
        goal: {
            type: 'string',
        },
        entities: {
            type: 'array',
            items: {
                $ref: '#/definitions/uuid',
            },
        },
        start: {
            oneOf: [
                {
                    type: 'null',
                },
                {
                    type: 'string',
                    format: 'date',
                },
            ],
        },
        end: {
            oneOf: [
                {
                    type: 'null',
                },
                {
                    type: 'string',
                    format: 'date',
                },
            ],
        },
        indicators: {
            $ref: '#/definitions/indicators',
        },
        purposes: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['description', 'assumptions', 'indicators', 'outputs'],
                properties: {
                    description: {
                        type: 'string',
                    },
                    assumptions: {
                        type: 'string',
                    },
                    indicators: {
                        $ref: '#/definitions/indicators',
                    },
                    outputs: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['description', 'assumptions', 'indicators', 'activities'],
                            properties: {
                                description: {
                                    type: 'string',
                                },
                                assumptions: {
                                    type: 'string',
                                },
                                indicators: {
                                    $ref: '#/definitions/indicators',
                                },
                                activities: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        additionalProperties: false,
                                        required: ['description', 'indicators'],
                                        properties: {
                                            description: {
                                                type: 'string',
                                            },
                                            indicators: {
                                                $ref: '#/definitions/indicators',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
