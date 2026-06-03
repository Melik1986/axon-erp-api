const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const ts = require("typescript");
const { resolvePathWithinRoot } = require("../../Axon-App/scripts/lib/safe-path");

const RULE_R1 = "R1";
const RULE_R2 = "R2";
const REPORT_NAME = "any-report.json";

const WHITELIST_PATTERNS = [/Api\.ts$/u, /RequestBuilder\.ts$/u];
const REQUEST_BUILDER_PATTERN = /RequestBuilder\.ts$/u;
const DENYLIST_PATTERNS = [/\/schema\//u];

function normalizeSlashes(input) {
  return input.split(path.sep).join("/");
}

function matchesAnyPattern(patterns, value) {
  return patterns.some((pattern) => pattern.test(value));
}

function countAnyTokens(content) {
  const matches = content.match(/\bany\b/gu);
  return matches ? matches.length : 0;
}

function applyReplacements(content, replacements) {
  const deduped = [];
  const seen = new Set();

  for (const replacement of replacements) {
    const key = `${replacement.start}:${replacement.end}:${replacement.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(replacement);
    }
  }

  deduped.sort((left, right) => right.start - left.start);

  let nextContent = content;
  for (const replacement of deduped) {
    nextContent =
      nextContent.slice(0, replacement.start) +
      replacement.text +
      nextContent.slice(replacement.end);
  }

  return nextContent;
}

function isAnyAssertion(node) {
  return ts.isAsExpression(node) && node.type.kind === ts.SyntaxKind.AnyKeyword;
}

function isSafeAnyAssertion(node) {
  // Keep SDK generic defaults intact: `defaultDeSerializers as any` is required by generated API typings.
  if (ts.isIdentifier(node.expression) && node.expression.text === "defaultDeSerializers") {
    return false;
  }

  // Keep constructor casts intact: `new CustomField(...) as any` participates in generic return contracts.
  if (ts.isNewExpression(node.expression)) {
    return false;
  }

  return true;
}

function shouldReplaceAnyAssertion(node, context) {
  return context.isWhitelisted && !context.isDenylisted && isSafeAnyAssertion(node);
}

function isParameterAny(node, context) {
  return (
    context.isRequestBuilder &&
    ts.isParameter(node) &&
    node.type &&
    node.type.kind === ts.SyntaxKind.AnyKeyword &&
    !context.isDenylisted
  );
}

function collectTypeReplacements(sourceFile, context) {
  const replacements = [];
  const metrics = {
    anyAssertionsFound: 0,
    anyAssertionsReplaced: 0,
    parameterAnyFound: 0,
    parameterAnyReplaced: 0,
  };

  const addReplacement = (typeNode, rule) => {
    replacements.push({
      start: typeNode.getStart(sourceFile),
      end: typeNode.end,
      text: "unknown",
      rule,
    });
  };

  const visit = (node) => {
    if (isAnyAssertion(node)) {
      metrics.anyAssertionsFound += 1;
      if (shouldReplaceAnyAssertion(node, context)) {
        addReplacement(node.type, RULE_R1);
        metrics.anyAssertionsReplaced += 1;
      }
    }

    if (isParameterAny(node, context)) {
      metrics.parameterAnyFound += 1;
      addReplacement(node.type, RULE_R2);
      metrics.parameterAnyReplaced += 1;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return { replacements, metrics };
}

async function readBaselineReport(reportPath) {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- reportPath is validated by resolvePathWithinRoot before call
    const baselineRaw = await readFile(reportPath, "utf8");
    const baseline = JSON.parse(baselineRaw);
    if (typeof baseline?.totals?.anyTokensAfter === "number") {
      return baseline;
    }
    return null;
  } catch {
    return null;
  }
}

function createReportSkeleton(baseline, repoRoot, validatedOutputDir, resolvedReportPath) {
  return {
    generatedAt: new Date().toISOString(),
    outputDir: normalizeSlashes(path.relative(repoRoot, validatedOutputDir)),
    reportPath: normalizeSlashes(path.relative(repoRoot, resolvedReportPath)),
    rules: {
      [RULE_R1]: "as any -> as unknown in whitelist files",
      [RULE_R2]: ": any -> : unknown for parameters in RequestBuilder files",
    },
    totals: {
      filesScanned: 0,
      filesChanged: 0,
      anyTokensBefore: 0,
      anyTokensAfter: 0,
      [RULE_R1]: { found: 0, replaced: 0 },
      [RULE_R2]: { found: 0, replaced: 0 },
    },
    skipped: {
      notWhitelisted: 0,
      denylisted: 0,
    },
    files: [],
    baseline: baseline
      ? {
          generatedAt: baseline.generatedAt,
          anyTokensAfter: baseline.totals.anyTokensAfter,
        }
      : null,
    delta: null,
  };
}

async function processSingleFile(file, validatedOutputDir, _repoRoot, report) {
  const validatedFile = resolvePathWithinRoot(validatedOutputDir, file, "Generated source file");
  const relativeFile = normalizeSlashes(path.relative(validatedOutputDir, validatedFile));

  const isDenylisted = matchesAnyPattern(DENYLIST_PATTERNS, relativeFile);
  const isWhitelisted = matchesAnyPattern(WHITELIST_PATTERNS, relativeFile);
  const isRequestBuilder = REQUEST_BUILDER_PATTERN.test(relativeFile);

  // eslint-disable-next-line security/detect-non-literal-fs-filename -- validatedFile is root-bounded above
  const content = await readFile(validatedFile, "utf8");
  const anyBefore = countAnyTokens(content);

  const sourceFile = ts.createSourceFile(
    relativeFile,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const { replacements, metrics } = collectTypeReplacements(sourceFile, {
    isDenylisted,
    isWhitelisted,
    isRequestBuilder,
  });

  const nextContent = applyReplacements(content, replacements);
  const changed = nextContent !== content;
  const anyAfter = countAnyTokens(nextContent);

  report.totals.filesScanned += 1;
  report.totals.anyTokensBefore += anyBefore;
  report.totals.anyTokensAfter += anyAfter;
  report.totals[RULE_R1].found += metrics.anyAssertionsFound;
  report.totals[RULE_R1].replaced += metrics.anyAssertionsReplaced;
  report.totals[RULE_R2].found += metrics.parameterAnyFound;
  report.totals[RULE_R2].replaced += metrics.parameterAnyReplaced;

  if (!isWhitelisted) {
    report.skipped.notWhitelisted += 1;
  }
  if (isDenylisted) {
    report.skipped.denylisted += 1;
  }

  report.files.push({
    file: relativeFile,
    changed,
    anyBefore,
    anyAfter,
    [RULE_R1]: {
      found: metrics.anyAssertionsFound,
      replaced: metrics.anyAssertionsReplaced,
    },
    [RULE_R2]: {
      found: metrics.parameterAnyFound,
      replaced: metrics.parameterAnyReplaced,
    },
    denylisted: isDenylisted,
    whitelisted: isWhitelisted,
  });

  if (changed) {
    report.totals.filesChanged += 1;
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- validatedFile is root-bounded above
    await writeFile(validatedFile, nextContent, "utf8");
  }
}

function computeReportDelta(report) {
  report.delta = {
    anyTokensBeforeToAfter: report.totals.anyTokensAfter - report.totals.anyTokensBefore,
    baselineToCurrent:
      report.baseline && typeof report.baseline.anyTokensAfter === "number"
        ? report.totals.anyTokensAfter - report.baseline.anyTokensAfter
        : null,
  };
}

async function refactorGeneratedTypes({ repoRoot, outputDir, files, reportPath }) {
  const validatedOutputDir = resolvePathWithinRoot(
    repoRoot,
    outputDir,
    "Generated output directory",
  );
  const resolvedReportPath = resolvePathWithinRoot(
    validatedOutputDir,
    reportPath || path.join(validatedOutputDir, REPORT_NAME),
    "Type refactor report path",
  );
  const baseline = await readBaselineReport(resolvedReportPath);

  const report = createReportSkeleton(baseline, repoRoot, validatedOutputDir, resolvedReportPath);

  for (const file of files) {
    await processSingleFile(file, validatedOutputDir, repoRoot, report);
  }

  computeReportDelta(report);

  // eslint-disable-next-line security/detect-non-literal-fs-filename -- resolvedReportPath is root-bounded above
  await writeFile(resolvedReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return report;
}

module.exports = {
  refactorGeneratedTypes,
};
