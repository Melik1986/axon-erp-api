const DEFAULT_MIGRATION_TRACK = "v2->v4.01";
const DEFAULT_TARGET_VERSION = "v4.01";

const TRACK_ALIASES = new Map([
  ["v2->v4.01", "v2->v4.01"],
  ["v2-to-v4.01", "v2->v4.01"],
  ["v2_to_v4.01", "v2->v4.01"],
]);

const TARGET_ALIASES = new Map([
  ["4.01", "v4.01"],
  ["v4.01", "v4.01"],
  ["4.0", "v4.0"],
  ["4", "v4.0"],
  ["v4.0", "v4.0"],
  ["v4", "v4.0"],
  ["2", "v2"],
  ["2.0", "v2"],
  ["v2", "v2"],
]);

function normalizeTrack(trackValue) {
  if (typeof trackValue !== "string") {
    return null;
  }

  return TRACK_ALIASES.get(trackValue.trim().toLowerCase()) ?? null;
}

function normalizeTargetVersion(versionValue) {
  if (typeof versionValue !== "string") {
    return null;
  }

  return TARGET_ALIASES.get(versionValue.trim().toLowerCase()) ?? null;
}

function isTruthyEnvFlag(value) {
  if (typeof value !== "string") {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function detectEdmxProtocolVersion(edmxContent) {
  if (typeof edmxContent !== "string" || edmxContent.trim() === "") {
    return {
      version: "unknown",
      family: "unknown",
      source: "none",
      raw: null,
    };
  }

  const edmxTag = findEdmxOpeningTag(edmxContent);
  const edmxVersion = readEdmxVersionAttribute(edmxTag);
  if (edmxVersion) {
    const classified = classifyRawVersion(edmxVersion);
    return {
      ...classified,
      source: "edmx-version",
      raw: edmxVersion,
    };
  }

  const dataServiceVersionMatch = edmxContent.match(
    /\b(?:m:)?DataServiceVersion\s*=\s*["']([^"']+)["']/i,
  );
  if (dataServiceVersionMatch) {
    const classified = classifyRawVersion(dataServiceVersionMatch[1]);
    return {
      ...classified,
      source: "data-service-version",
      raw: dataServiceVersionMatch[1],
    };
  }

  return {
    version: "unknown",
    family: "unknown",
    source: "none",
    raw: null,
  };
}

function findEdmxOpeningTag(edmxContent) {
  const lower = edmxContent.toLowerCase();
  const plainIndex = lower.indexOf("<edmx");
  if (plainIndex === -1) {
    return null;
  }

  const tagEnd = edmxContent.indexOf(">", plainIndex);
  if (tagEnd === -1) {
    return null;
  }

  return edmxContent.slice(plainIndex, tagEnd + 1);
}

function readEdmxVersionAttribute(tag) {
  if (typeof tag !== "string") {
    return null;
  }

  const match = tag.match(/\bVersion\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function classifyRawVersion(rawVersion) {
  const normalized = String(rawVersion).trim().toLowerCase();

  if (normalized.startsWith("4.01")) {
    return { version: "v4.01", family: "v4" };
  }

  if (normalized.startsWith("4")) {
    return { version: "v4.0", family: "v4" };
  }

  if (normalized.startsWith("1") || normalized.startsWith("2") || normalized.startsWith("3")) {
    return { version: "v2", family: "v2" };
  }

  return { version: "unknown", family: "unknown" };
}

function evaluateMigrationPolicy({ track, targetVersion, detectedVersion, strict = false }) {
  const notices = [];

  let normalizedTrack = normalizeTrack(track);
  if (!normalizedTrack) {
    normalizedTrack = DEFAULT_MIGRATION_TRACK;
    if (track) {
      notices.push(
        `Unsupported SAP_ODATA_MIGRATION_TRACK="${track}". Falling back to ${DEFAULT_MIGRATION_TRACK}.`,
      );
    }
  }

  let normalizedTarget = normalizeTargetVersion(targetVersion);
  if (!normalizedTarget) {
    normalizedTarget = DEFAULT_TARGET_VERSION;
    if (targetVersion) {
      notices.push(
        `Unsupported SAP_ODATA_PROTOCOL_TARGET="${targetVersion}". Falling back to ${DEFAULT_TARGET_VERSION}.`,
      );
    }
  }

  const allowedVersions =
    normalizedTrack === "v2->v4.01" ? new Set(["v2", "v4.0", "v4.01"]) : new Set(["unknown"]);

  const normalizedDetected = typeof detectedVersion === "string" ? detectedVersion : "unknown";

  let compatible = true;
  if (normalizedDetected === "unknown") {
    notices.push(
      "Could not reliably detect OData version from EDMX. Continuing in compatibility mode.",
    );
    compatible = !strict;
  } else {
    compatible = allowedVersions.has(normalizedDetected);
  }

  if (normalizedDetected === "v2") {
    notices.push(
      "Detected legacy OData V2 metadata. Track v2->v4.01 allows it while migrating to V4.01.",
    );
  }

  if (normalizedDetected === "v4.0") {
    notices.push("Detected OData V4.0 metadata. Recommended target remains V4.01.");
  }

  if (normalizedDetected === "v4.01") {
    notices.push("Detected OData V4.01 metadata (recommended target).");
  }

  if (!compatible && strict) {
    notices.push(
      `Strict track validation failed for detected version "${normalizedDetected}" in track "${normalizedTrack}".`,
    );
  }

  return {
    track: normalizedTrack,
    targetVersion: normalizedTarget,
    detectedVersion: normalizedDetected,
    strict,
    compatible,
    notices,
  };
}

module.exports = {
  DEFAULT_MIGRATION_TRACK,
  DEFAULT_TARGET_VERSION,
  detectEdmxProtocolVersion,
  evaluateMigrationPolicy,
  isTruthyEnvFlag,
};
