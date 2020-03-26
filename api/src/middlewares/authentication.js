const jwt = require('koa-jwt');
const jwksRsa = require('jwks-rsa');
const config = require('../config');

module.exports = jwt({
    secret: jwksRsa.koaJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 2,
        jwksUri: `https://${config.jwt.jwksHost}/.well-known/jwks.json`
    }),
    audience: config.jwt.audience,
    issuer: config.jwt.issuer,
    algorithms: ['RS256'],
    getToken: function (ctx) {
        const token = (ctx.request.header.authorization || ctx.request.query.token);
        return token ? token.replace(/^Bearer /, '') : undefined;
    }
});