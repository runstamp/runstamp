/**
 * Theme Presets for DOCX
 * ======================
 * Pre-built themes for professional document styling.
 *
 * Each theme defines:
 * - Color scheme (primary, secondary, accent colors)
 * - Typography (heading and body fonts)
 * - Spacing guidelines
 * - Table styling
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Color scheme for a theme.
 */
export interface ThemeColorScheme {
  /** Primary brand color (hex without #) */
  primary: string;

  /** Secondary color for accents (hex without #) */
  secondary: string;

  /** Accent color for highlights (hex without #) */
  accent: string;

  /** Text color (hex without #) */
  text: string;

  /** Muted text color (hex without #) */
  textMuted: string;

  /** Background color (hex without #) */
  background: string;

  /** Subtle background color for shading (hex without #) */
  backgroundSubtle: string;

  /** Border color (hex without #) */
  border: string;

  /** Success color (hex without #) */
  success: string;

  /** Warning color (hex without #) */
  warning: string;

  /** Error color (hex without #) */
  error: string;
}

/**
 * Typography settings for a theme.
 */
export interface ThemeTypography {
  /** Heading font family */
  headingFont: string;

  /** Body font family */
  bodyFont: string;

  /** Monospace font family */
  monoFont: string;

  /** Base font size in points */
  baseFontSize: number;

  /** Heading size multipliers (h1-h6) */
  headingSizes: [number, number, number, number, number, number];

  /** Line height for body text */
  bodyLineHeight: number;

  /** Line height for headings */
  headingLineHeight: number;
}

/**
 * Spacing settings for a theme.
 */
export interface ThemeSpacing {
  /** Paragraph spacing before in twips */
  paragraphBefore: number;

  /** Paragraph spacing after in twips */
  paragraphAfter: number;

  /** Heading spacing before in twips */
  headingBefore: number;

  /** Heading spacing after in twips */
  headingAfter: number;

  /** List item spacing in twips */
  listItemSpacing: number;

  /** Table cell padding in twips */
  tableCellPadding: number;
}

/**
 * Table styling for a theme.
 */
export interface ThemeTableStyle {
  /** Header background color (hex without #) */
  headerBackground: string;

  /** Header text color (hex without #) */
  headerText: string;

  /** Whether headers are bold */
  headerBold: boolean;

  /** Alternating row background (hex without #) */
  alternateRowBackground: string;

  /** Border color (hex without #) */
  borderColor: string;

  /** Border width in eighths of a point */
  borderWidth: number;

  /** Border style */
  borderStyle: 'single' | 'double' | 'thick' | 'none';
}

/**
 * Complete theme definition.
 */
export interface Theme {
  /** Theme name */
  name: string;

  /** Theme description */
  description: string;

  /** Color scheme */
  colors: ThemeColorScheme;

  /** Typography settings */
  typography: ThemeTypography;

  /** Spacing settings */
  spacing: ThemeSpacing;

  /** Table styling */
  tables: ThemeTableStyle;
}

/**
 * Available theme preset names.
 */
export type ThemePresetName =
  | 'corporate'
  | 'modern'
  | 'classic'
  | 'academic'
  | 'minimal'
  | 'dark'
  | 'colorful';

// =============================================================================
// PRESET THEMES
// =============================================================================

/**
 * Corporate theme - Professional blue color scheme.
 */
export const CORPORATE_THEME: Theme = {
  name: 'Corporate',
  description: 'Professional blue theme for business documents',
  colors: {
    primary: '2F5496',
    secondary: '4472C4',
    accent: 'ED7D31',
    text: '333333',
    textMuted: '666666',
    background: 'FFFFFF',
    backgroundSubtle: 'F8F9FA',
    border: 'DDDDDD',
    success: '70AD47',
    warning: 'FFC000',
    error: 'C00000',
  },
  typography: {
    headingFont: 'Calibri Light',
    bodyFont: 'Calibri',
    monoFont: 'Consolas',
    baseFontSize: 11,
    headingSizes: [28, 22, 16, 14, 12, 11],
    bodyLineHeight: 1.15,
    headingLineHeight: 1.1,
  },
  spacing: {
    paragraphBefore: 0,
    paragraphAfter: 160,
    headingBefore: 240,
    headingAfter: 80,
    listItemSpacing: 80,
    tableCellPadding: 80,
  },
  tables: {
    headerBackground: '2F5496',
    headerText: 'FFFFFF',
    headerBold: true,
    alternateRowBackground: 'F2F6FC',
    borderColor: 'DDDDDD',
    borderWidth: 4,
    borderStyle: 'single',
  },
};

/**
 * Modern theme - Clean and contemporary design.
 */
export const MODERN_THEME: Theme = {
  name: 'Modern',
  description: 'Clean and contemporary design with geometric elements',
  colors: {
    primary: '1A1A2E',
    secondary: '16213E',
    accent: 'E94560',
    text: '1A1A1A',
    textMuted: '757575',
    background: 'FFFFFF',
    backgroundSubtle: 'FAFAFA',
    border: 'E0E0E0',
    success: '4CAF50',
    warning: 'FF9800',
    error: 'F44336',
  },
  typography: {
    headingFont: 'Arial',
    bodyFont: 'Arial',
    monoFont: 'Monaco',
    baseFontSize: 11,
    headingSizes: [32, 24, 18, 14, 12, 11],
    bodyLineHeight: 1.5,
    headingLineHeight: 1.2,
  },
  spacing: {
    paragraphBefore: 0,
    paragraphAfter: 200,
    headingBefore: 360,
    headingAfter: 120,
    listItemSpacing: 120,
    tableCellPadding: 100,
  },
  tables: {
    headerBackground: '1A1A2E',
    headerText: 'FFFFFF',
    headerBold: true,
    alternateRowBackground: 'FAFAFA',
    borderColor: 'E0E0E0',
    borderWidth: 4,
    borderStyle: 'single',
  },
};

/**
 * Classic theme - Traditional elegant styling.
 */
export const CLASSIC_THEME: Theme = {
  name: 'Classic',
  description: 'Traditional elegant styling with serif fonts',
  colors: {
    primary: '2C3E50',
    secondary: '34495E',
    accent: 'B8860B',
    text: '2C3E50',
    textMuted: '7F8C8D',
    background: 'FFFFFF',
    backgroundSubtle: 'FAF9F6',
    border: 'BDC3C7',
    success: '27AE60',
    warning: 'F39C12',
    error: 'C0392B',
  },
  typography: {
    headingFont: 'Times New Roman',
    bodyFont: 'Georgia',
    monoFont: 'Courier New',
    baseFontSize: 12,
    headingSizes: [24, 20, 16, 14, 12, 11],
    bodyLineHeight: 1.3,
    headingLineHeight: 1.15,
  },
  spacing: {
    paragraphBefore: 0,
    paragraphAfter: 180,
    headingBefore: 280,
    headingAfter: 100,
    listItemSpacing: 100,
    tableCellPadding: 80,
  },
  tables: {
    headerBackground: '2C3E50',
    headerText: 'FFFFFF',
    headerBold: true,
    alternateRowBackground: 'FAF9F6',
    borderColor: 'BDC3C7',
    borderWidth: 4,
    borderStyle: 'single',
  },
};

/**
 * Academic theme - Scholarly document styling.
 */
export const ACADEMIC_THEME: Theme = {
  name: 'Academic',
  description: 'Scholarly styling for papers and dissertations',
  colors: {
    primary: '333333',
    secondary: '555555',
    accent: '8B0000',
    text: '000000',
    textMuted: '555555',
    background: 'FFFFFF',
    backgroundSubtle: 'F5F5F5',
    border: 'CCCCCC',
    success: '228B22',
    warning: 'DAA520',
    error: 'B22222',
  },
  typography: {
    headingFont: 'Times New Roman',
    bodyFont: 'Times New Roman',
    monoFont: 'Courier New',
    baseFontSize: 12,
    headingSizes: [18, 16, 14, 13, 12, 12],
    bodyLineHeight: 2.0, // Double-spaced
    headingLineHeight: 1.5,
  },
  spacing: {
    paragraphBefore: 0,
    paragraphAfter: 0,
    headingBefore: 240,
    headingAfter: 120,
    listItemSpacing: 0,
    tableCellPadding: 60,
  },
  tables: {
    headerBackground: 'FFFFFF',
    headerText: '000000',
    headerBold: true,
    alternateRowBackground: 'FFFFFF',
    borderColor: '000000',
    borderWidth: 8,
    borderStyle: 'single',
  },
};

/**
 * Minimal theme - Clean with minimal decoration.
 */
export const MINIMAL_THEME: Theme = {
  name: 'Minimal',
  description: 'Clean and minimal with reduced visual noise',
  colors: {
    primary: '111111',
    secondary: '444444',
    accent: '0066CC',
    text: '111111',
    textMuted: '888888',
    background: 'FFFFFF',
    backgroundSubtle: 'FCFCFC',
    border: 'EEEEEE',
    success: '00AA55',
    warning: 'FFAA00',
    error: 'DD0000',
  },
  typography: {
    headingFont: 'Helvetica Neue',
    bodyFont: 'Helvetica Neue',
    monoFont: 'SF Mono',
    baseFontSize: 11,
    headingSizes: [28, 22, 17, 14, 12, 11],
    bodyLineHeight: 1.6,
    headingLineHeight: 1.3,
  },
  spacing: {
    paragraphBefore: 0,
    paragraphAfter: 180,
    headingBefore: 320,
    headingAfter: 100,
    listItemSpacing: 80,
    tableCellPadding: 60,
  },
  tables: {
    headerBackground: 'FFFFFF',
    headerText: '111111',
    headerBold: true,
    alternateRowBackground: 'FCFCFC',
    borderColor: 'EEEEEE',
    borderWidth: 4,
    borderStyle: 'single',
  },
};

/**
 * Dark theme - Dark backgrounds with light text.
 * Note: Word doesn't fully support dark themes, but this
 * provides consistent colors for shaded elements.
 */
export const DARK_THEME: Theme = {
  name: 'Dark',
  description: 'Dark color scheme for modern presentations',
  colors: {
    primary: 'BB86FC',
    secondary: '03DAC6',
    accent: 'CF6679',
    text: 'E1E1E1',
    textMuted: 'A0A0A0',
    background: '121212',
    backgroundSubtle: '1E1E1E',
    border: '333333',
    success: '00E676',
    warning: 'FFAB00',
    error: 'FF5252',
  },
  typography: {
    headingFont: 'Segoe UI',
    bodyFont: 'Segoe UI',
    monoFont: 'Cascadia Code',
    baseFontSize: 11,
    headingSizes: [28, 22, 17, 14, 12, 11],
    bodyLineHeight: 1.5,
    headingLineHeight: 1.2,
  },
  spacing: {
    paragraphBefore: 0,
    paragraphAfter: 180,
    headingBefore: 280,
    headingAfter: 100,
    listItemSpacing: 100,
    tableCellPadding: 80,
  },
  tables: {
    headerBackground: '333333',
    headerText: 'E1E1E1',
    headerBold: true,
    alternateRowBackground: '1E1E1E',
    borderColor: '444444',
    borderWidth: 4,
    borderStyle: 'single',
  },
};

/**
 * Colorful theme - Vibrant and playful design.
 */
export const COLORFUL_THEME: Theme = {
  name: 'Colorful',
  description: 'Vibrant and playful design with bold colors',
  colors: {
    primary: '6366F1',
    secondary: '8B5CF6',
    accent: 'F472B6',
    text: '1F2937',
    textMuted: '6B7280',
    background: 'FFFFFF',
    backgroundSubtle: 'F5F3FF',
    border: 'DDD6FE',
    success: '10B981',
    warning: 'FBBF24',
    error: 'EF4444',
  },
  typography: {
    headingFont: 'Poppins',
    bodyFont: 'Open Sans',
    monoFont: 'Fira Code',
    baseFontSize: 11,
    headingSizes: [30, 24, 18, 15, 12, 11],
    bodyLineHeight: 1.6,
    headingLineHeight: 1.25,
  },
  spacing: {
    paragraphBefore: 0,
    paragraphAfter: 200,
    headingBefore: 320,
    headingAfter: 120,
    listItemSpacing: 120,
    tableCellPadding: 100,
  },
  tables: {
    headerBackground: '6366F1',
    headerText: 'FFFFFF',
    headerBold: true,
    alternateRowBackground: 'F5F3FF',
    borderColor: 'DDD6FE',
    borderWidth: 4,
    borderStyle: 'single',
  },
};

// =============================================================================
// THEME REGISTRY
// =============================================================================

/**
 * Map of all preset themes.
 */
export const THEME_PRESETS: Record<ThemePresetName, Theme> = {
  corporate: CORPORATE_THEME,
  modern: MODERN_THEME,
  classic: CLASSIC_THEME,
  academic: ACADEMIC_THEME,
  minimal: MINIMAL_THEME,
  dark: DARK_THEME,
  colorful: COLORFUL_THEME,
};


/**
 * Get a theme preset by name. Pro feature.
 */
export function getThemePreset(name: ThemePresetName): Theme {
  return THEME_PRESETS[name];
}

/**
 * Get all available theme preset names.
 */
export function getThemePresetNames(): ThemePresetName[] {
  return Object.keys(THEME_PRESETS) as ThemePresetName[];
}

/**
 * Check if a string is a valid theme preset name.
 */
export function isThemePresetName(name: string): name is ThemePresetName {
  return name in THEME_PRESETS;
}

/**
 * Get the default theme (corporate).
 */
export function getDefaultTheme(): Theme {
  return CORPORATE_THEME;
}

// =============================================================================
// THEME CUSTOMIZATION
// =============================================================================

/**
 * Create a custom theme by extending a preset.
 */
export function extendTheme(
  base: Theme | ThemePresetName,
  overrides: DeepPartial<Theme>
): Theme {
  const baseTheme = typeof base === 'string' ? getThemePreset(base) : base;

  // Handle typography separately to preserve headingSizes tuple
  const typography: ThemeTypography = overrides.typography
    ? {
        headingFont: overrides.typography.headingFont ?? baseTheme.typography.headingFont,
        bodyFont: overrides.typography.bodyFont ?? baseTheme.typography.bodyFont,
        monoFont: overrides.typography.monoFont ?? baseTheme.typography.monoFont,
        baseFontSize: overrides.typography.baseFontSize ?? baseTheme.typography.baseFontSize,
        headingSizes: (overrides.typography.headingSizes as [number, number, number, number, number, number] | undefined) ?? baseTheme.typography.headingSizes,
        bodyLineHeight: overrides.typography.bodyLineHeight ?? baseTheme.typography.bodyLineHeight,
        headingLineHeight: overrides.typography.headingLineHeight ?? baseTheme.typography.headingLineHeight,
      }
    : baseTheme.typography;

  return {
    name: overrides.name || baseTheme.name,
    description: overrides.description || baseTheme.description,
    colors: { ...baseTheme.colors, ...overrides.colors },
    typography,
    spacing: { ...baseTheme.spacing, ...overrides.spacing },
    tables: { ...baseTheme.tables, ...overrides.tables },
  };
}

/**
 * Create a theme with custom primary color.
 */
export function createThemeWithColor(
  base: Theme | ThemePresetName,
  primaryColor: string
): Theme {
  return extendTheme(base, {
    colors: { primary: primaryColor.replace('#', '') },
  });
}

/**
 * Deep partial type helper.
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
