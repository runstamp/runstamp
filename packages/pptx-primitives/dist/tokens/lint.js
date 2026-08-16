import { TokenResolveError, resolveTokens } from "./resolve.js";
const CONTRAST_CHECKS = [
    { path: "palette.foreground/canvas.surface", foreground: "foreground", background: "canvas.surface", minimum: 4.5 },
    { path: "palette.muted/canvas.surface", foreground: "muted", background: "canvas.surface", minimum: 3 },
    { path: "palette.accentInverse/palette.accent", foreground: "accentInverse", background: "accent", minimum: 3 },
];
export function lintTokenBundle(input, options = {}) {
    const issues = [];
    let tokens;
    try {
        tokens = resolveTokens(input, {
            onWarning: (warning) => {
                issues.push({
                    code: "TOKEN_FONT_UNPINNED",
                    severity: "warning",
                    path: `type.${warning.context.role}.family`,
                    message: warning.message,
                });
            },
        });
    }
    catch (err) {
        if (err instanceof TokenResolveError) {
            issues.push(...err.issues.map((issue) => ({
                code: "TOKEN_SCHEMA_INVALID",
                severity: "error",
                path: issue.path || "(root)",
                message: issue.message,
            })));
        }
        else {
            issues.push({
                code: "TOKEN_SCHEMA_INVALID",
                severity: "error",
                path: "(root)",
                message: err instanceof Error ? err.message : String(err),
            });
        }
        return buildReport(issues, options);
    }
    issues.push(...lintContrast(tokens));
    issues.push(...lintSpacing(tokens));
    issues.push(...lintTypeScale(tokens));
    issues.push(...lintLineHeight(tokens));
    return buildReport(issues, options);
}
function buildReport(issues, options) {
    const normalized = options.warningsAsErrors
        ? issues.map((issue) => issue.severity === "warning" ? { ...issue, severity: "error" } : issue)
        : issues;
    const errors = normalized.filter((issue) => issue.severity === "error");
    const warnings = normalized.filter((issue) => issue.severity === "warning");
    return {
        status: errors.length > 0 ? "fail" : "pass",
        issues: normalized,
        errors,
        warnings,
    };
}
function lintContrast(tokens) {
    const issues = [];
    for (const check of CONTRAST_CHECKS) {
        const foreground = readTokenColor(tokens, check.foreground);
        const background = readTokenColor(tokens, check.background);
        const ratio = contrastRatio(foreground, background);
        if (ratio < check.minimum) {
            issues.push({
                code: "TOKEN_CONTRAST_LOW",
                severity: "error",
                path: check.path,
                message: `Contrast ratio ${ratio.toFixed(2)} is below ${check.minimum}:1.`,
            });
        }
    }
    return issues;
}
function lintSpacing(tokens) {
    const steps = [
        ["xs", tokens.spacing.xs],
        ["sm", tokens.spacing.sm],
        ["md", tokens.spacing.md],
        ["lg", tokens.spacing.lg],
        ["xl", tokens.spacing.xl],
        ["xxl", tokens.spacing.xxl],
    ];
    const issues = [];
    for (let i = 1; i < steps.length; i += 1) {
        const [prevName, prev] = steps[i - 1];
        const [name, value] = steps[i];
        if (value < prev) {
            issues.push({
                code: "TOKEN_SPACING_SCALE_INCONSISTENT",
                severity: "error",
                path: `spacing.${name}`,
                message: `Spacing step ${name} (${value}) is smaller than ${prevName} (${prev}).`,
            });
        }
    }
    return issues;
}
function lintTypeScale(tokens) {
    const { display, title, body, caption } = tokens.type;
    const issues = [];
    if (display.size < title.size) {
        issues.push({
            code: "TOKEN_TYPE_SCALE_INCONSISTENT",
            severity: "warning",
            path: "type.display.size",
            message: `Display size (${display.size}) is smaller than title size (${title.size}).`,
        });
    }
    if (title.size < body.size) {
        issues.push({
            code: "TOKEN_TYPE_SCALE_INCONSISTENT",
            severity: "warning",
            path: "type.title.size",
            message: `Title size (${title.size}) is smaller than body size (${body.size}).`,
        });
    }
    if (body.size < caption.size) {
        issues.push({
            code: "TOKEN_TYPE_SCALE_INCONSISTENT",
            severity: "warning",
            path: "type.body.size",
            message: `Body size (${body.size}) is smaller than caption size (${caption.size}).`,
        });
    }
    return issues;
}
function lintLineHeight(tokens) {
    const issues = [];
    for (const [roleName, role] of Object.entries(tokens.type)) {
        if (role.lineHeight !== undefined && role.lineHeight < role.size * 0.95) {
            issues.push({
                code: "TOKEN_LINE_HEIGHT_TIGHT",
                severity: "warning",
                path: `type.${roleName}.lineHeight`,
                message: `Line height ${role.lineHeight}pt is tight for ${role.size}pt text.`,
            });
        }
    }
    return issues;
}
function readTokenColor(tokens, path) {
    if (path === "canvas.surface")
        return tokens.canvas.surface;
    return tokens.palette[path] ?? tokens.canvas.surface;
}
function contrastRatio(a, b) {
    const l1 = relativeLuminance(parseHexColor(a));
    const l2 = relativeLuminance(parseHexColor(b));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}
function parseHexColor(hex) {
    const raw = hex.replace(/^#/u, "");
    const normalized = raw.length === 3
        ? raw.split("").map((part) => `${part}${part}`).join("")
        : raw.slice(0, 6);
    return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16),
    ];
}
function relativeLuminance([r, g, b]) {
    const channels = [r, g, b].map((value) => {
        const normalized = value / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
//# sourceMappingURL=lint.js.map