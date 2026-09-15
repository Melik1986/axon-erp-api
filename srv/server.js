const cds = require("@sap/cds");
const {
  buildB1CookieHeaders,
  createB1Session,
  getB1Session,
  isValidB1Credentials,
} = require("./b1-session");

function readCookie(header, name) {
  const cookie = (header || "").split(";").map((part) => part.trim());
  const value = cookie.find((part) => part.startsWith(`${name}=`));
  return value ? value.slice(name.length + 1) : undefined;
}

function rewriteStockAdjust(url) {
  return url
    .replace(/\/StockLevels\/adjust(\?|$)/, "/adjust$1")
    .replace(/\/Stocks\/adjust(\?|$)/, "/adjust$1");
}

cds.on("bootstrap", (app) => {
  // Local Fiori / $fiori-preview: without Basic the FE AppComponent dies on 401 $metadata
  // ("Failed to load UI5 component for #preview-app"). Dev-only demo identity.
  if (!cds.env.production) {
    app.use((req, _res, next) => {
      if (!req.headers.authorization && !readCookie(req.headers.cookie, "B1SESSION")) {
        req.headers.authorization =
          `Basic ${Buffer.from("vstah_agent:demo-password").toString("base64")}`;
      }
      next();
    });
  }

  // Optional SL-compatible Login for integrators — not the Vstah entry path.
  app.post("/b1s/v2/Login", (req, res) => {
    const { CompanyDB, UserName, Password } = req.body || {};
    if (!isValidB1Credentials({ CompanyDB, UserName, Password })) {
      res.status(401).json({
        error: { code: "-1000", message: "Invalid SAP Business One credentials" },
      });
      return;
    }
    const sessionId = createB1Session(UserName);
    res.setHeader("Set-Cookie", buildB1CookieHeaders(sessionId));
    res.status(200).json({ CompanyDB, UserName, SessionId: sessionId, Version: "1.0" });
  });

  app.use("/b1s/v2", (req, _res, next) => {
    const session = getB1Session(readCookie(req.headers.cookie, "B1SESSION"));
    if (session && !req.user) req.user = new cds.User(session);
    next();
  });

  app.use((req, _res, next) => {
    if (req.url === "/b1s/v2" || req.url.startsWith("/b1s/v2/")) {
      req.url = `/odata/v4${req.url}`;
    }
    req.url = rewriteStockAdjust(req.url);
    next();
  });

  // Vstah CSRF preflight: HEAD/GET on service roots must succeed without token.
  app.use((req, res, next) => {
    const odataRoot =
      req.path.startsWith("/odata/v4/warehouse") ||
      req.path.startsWith("/odata/v4/b1s/v2");
    if (odataRoot && (req.method === "HEAD" || req.headers["x-csrf-token"] === "Fetch")) {
      if (req.method === "HEAD") {
        res.status(200).end();
        return;
      }
      res.setHeader("x-csrf-token", "required");
    }
    next();
  });
});
