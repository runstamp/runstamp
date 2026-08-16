/**
 * ESLint rule: no-nondeterministic-apis
 * ======================================
 *
 * Bans APIs that produce non-reproducible output when written into the
 * OOXML byte stream. These leak wall-clock or entropy into renders and
 * silently break the byte-reproducibility contract the DOCX engine
 * depends on for golden-file tests and quality-report diffs.
 *
 * Banned in scope:
 *   - Date.now()
 *   - new Date()   (with no argument — wall-clock snapshot)
 *   - Math.random()
 *   - crypto.randomUUID()
 *   - crypto.randomBytes()
 *   - crypto.getRandomValues()
 *
 * Allowed: any call whose node has a nearby comment of the form
 *
 *   // lint-allow-nondeterministic: <reason>
 *
 * The reason is not parsed — it just documents *why* the API is safe
 * here (typical: "perf-timing only; not written to output").
 *
 * The rule is intentionally syntactic, not flow-sensitive: over-banning
 * is fine because the allow-comment is cheap; under-banning would
 * compromise reliability.
 */

const BANNED_MEMBERS = new Map([
  ["Date.now", "Date.now()"],
  ["Math.random", "Math.random()"],
  ["crypto.randomUUID", "crypto.randomUUID()"],
  ["crypto.randomBytes", "crypto.randomBytes()"],
  ["crypto.getRandomValues", "crypto.getRandomValues()"],
]);

const ALLOW_COMMENT = /lint-allow-nondeterministic:/;

function hasAllowComment(sourceCode, node) {
  if (!node.loc) return false;
  const startLine = node.loc.start.line;
  // Accept any lint-allow comment within a small radius of the call site.
  // Radius of 2 is enough to cover:
  //   - same line as the call
  //   - line immediately before a `const x = Date.now();` declaration
  //   - the line above an expression used inside a multi-line initializer
  const RADIUS = 2;
  for (const c of sourceCode.getAllComments()) {
    if (!c.loc) continue;
    const distance = Math.min(
      Math.abs(c.loc.start.line - startLine),
      Math.abs(c.loc.end.line - startLine),
    );
    if (distance <= RADIUS && ALLOW_COMMENT.test(c.value)) {
      return true;
    }
  }
  return false;
}

function isMemberPath(node, targetPath) {
  const parts = targetPath.split(".");
  if (parts.length !== 2) return false;
  return (
    node &&
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object &&
    node.object.type === "Identifier" &&
    node.object.name === parts[0] &&
    node.property &&
    node.property.type === "Identifier" &&
    node.property.name === parts[1]
  );
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow wall-clock / entropy APIs in deterministic code paths. Use `// lint-allow-nondeterministic: <reason>` to opt out.",
    },
    schema: [],
    messages: {
      banned:
        'Nondeterministic API "{{api}}" is banned here. Either use the deterministic context, or annotate the call site with `// lint-allow-nondeterministic: <reason>`.',
      bannedDateCtor:
        'Calling `new Date()` with no arguments captures wall-clock time, which breaks deterministic output. Pass a fixed ISO string or annotate with `// lint-allow-nondeterministic: <reason>`.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      CallExpression(node) {
        if (hasAllowComment(sourceCode, node)) {
          return;
        }
        for (const [path, display] of BANNED_MEMBERS) {
          if (isMemberPath(node.callee, path)) {
            context.report({
              node,
              messageId: "banned",
              data: { api: display },
            });
            return;
          }
        }
      },
      NewExpression(node) {
        if (hasAllowComment(sourceCode, node)) {
          return;
        }
        if (
          node.callee &&
          node.callee.type === "Identifier" &&
          node.callee.name === "Date" &&
          Array.isArray(node.arguments) &&
          node.arguments.length === 0
        ) {
          context.report({
            node,
            messageId: "bannedDateCtor",
          });
        }
      },
    };
  },
};
