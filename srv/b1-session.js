const crypto = require("node:crypto");

const sessions = new Map();

function expectedPassword() {
  return process.env.SAP_B1_AGENT_PASSWORD || "demo-password";
}

function isValidB1Credentials(credentials, password = expectedPassword()) {
  return (
    credentials?.CompanyDB === "SBODEMODE" &&
    credentials?.UserName === "vstah_agent" &&
    credentials?.Password === password
  );
}

function createB1Session(username) {
  const sessionId = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  sessions.set(sessionId, { id: username, roles: ["authenticated-user"] });
  return sessionId;
}

function getB1Session(sessionId) {
  return sessionId ? sessions.get(sessionId) : undefined;
}

function buildB1CookieHeaders(sessionId) {
  return [
    `B1SESSION=${sessionId}; Path=/; HttpOnly; SameSite=Lax`,
    "ROUTEID=.node0; Path=/; HttpOnly; SameSite=Lax",
  ];
}

module.exports = {
  buildB1CookieHeaders,
  createB1Session,
  getB1Session,
  isValidB1Credentials,
};
