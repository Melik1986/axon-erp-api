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

cds.on("bootstrap", (app) => {
  app.post("/b1s/v2/Login", (req, res) => {
    const { CompanyDB, UserName, Password } = req.body || {};
    if (!isValidB1Credentials({ CompanyDB, UserName, Password })) {
      res.status(401).json({
        error: {
          code: "-1000",
          message: "Invalid SAP Business One credentials",
        },
      });
      return;
    }

    const sessionId = createB1Session(UserName);
    res.setHeader("Set-Cookie", buildB1CookieHeaders(sessionId));
    res.status(200).json({
      CompanyDB,
      UserName,
      SessionId: sessionId,
      Version: "1.0",
    });
  });

  app.use("/b1s/v2", (req, _res, next) => {
    const sessionId = readCookie(req.headers.cookie, "B1SESSION");
    const session = getB1Session(sessionId);
    if (session && !req.user) {
      req.user = new cds.User(session);
    }
    next();
  });

  app.use((req, _res, next) => {
    if (req.url === "/b1s/v2" || req.url.startsWith("/b1s/v2/")) {
      req.url = `/odata/v4${req.url}`;
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.method === "HEAD" && req.path.startsWith("/odata/v4/warehouse")) {
      res.status(200).end();
      return;
    }
    next();
  });
});
