/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("./src/server/config").default;

module.exports = function (app) {
  const port = config.URL_PORT + 10;
  console.log("proxy", { port });
  const middleware = createProxyMiddleware({
    target: `http://localhost:${port}/`,
  });
  app.use("/api", middleware);
  app.use("/api-docs", middleware);
  app.use("/openapi", middleware);
};
