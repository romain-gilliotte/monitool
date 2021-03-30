const Ajv = require('ajv');
const addFormats = require('ajv-formats');

module.exports = name => {
    const ajv = new Ajv();
    addFormats(ajv);

    let schemaFn = ajv.compile(require(`../storage/schema/${name}`));
    let customFn;
    try {
        customFn = require(`../storage/validator/${name}`);
    } catch (e) {
        customFn = () => [];
    }

    return async (ctx, next) => {
        const schemaPassed = schemaFn(ctx.request.body);
        if (!schemaPassed) {
            ctx.response.status = 400;
            ctx.response.body = formatAjvErrors(schemaFn.errors);
            return;
        }

        const errors = customFn(ctx.request.body);
        if (errors.length) {
            ctx.response.status = 400;
            ctx.response.body = errors;
            return;
        }

        await next();
    };
};

function formatAjvErrors(errors) {
    return errors.map(error => {
        let path = error.instancePath;
        if (error.keyword === 'additionalProperties') {
            path += `.${error.params.additionalProperty}`;
        }

        return { path: path, code: error.keyword, message: error.message };
    });
}
