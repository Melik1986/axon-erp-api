const cds = require("@sap/cds");

cds.on("bootstrap", (app) => {
  app.use((req, res, next) => {
    if (req.method === "HEAD" && req.path.startsWith("/odata/v4/warehouse")) {
      res.status(200).end();
      return;
    }
    next();
  });
});
