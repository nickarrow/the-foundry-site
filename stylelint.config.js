/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['dist/**', 'node_modules/**', '**/obsidian-plugin-reference-styles/**'],
  rules: {
    // Disable rules that conflict with Obsidian/Iron Vault CSS patterns
    'no-descending-specificity': null, // Complex nested CSS from plugins
    'rule-empty-line-before': null, // Too noisy for existing code
    'declaration-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'comment-empty-line-before': null,

    // Allow vendor prefixes (still needed for some Safari versions)
    'property-no-vendor-prefix': null,
    'declaration-property-value-no-unknown': [
      true,
      {
        ignoreProperties: {
          '-webkit-appearance': ['auto'], // Valid for number input spinners
        },
      },
    ],

    // Allow Pagefind's BEM-style naming with __
    'selector-class-pattern': null,

    // Allow rgba() notation (clearer than rgb with /)
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'alpha-value-notation': null,

    // Allow duplicate selectors (common in large CSS files with sections)
    'no-duplicate-selectors': null,

    // Don't enforce shorthand (can reduce clarity)
    'declaration-block-no-redundant-longhand-properties': null,
    'shorthand-property-no-redundant-values': null,

    // Allow font family names as-is
    'value-keyword-case': [
      'lower',
      {
        ignoreFunctions: ['local'],
        ignoreKeywords: ['BlinkMacSystemFont', 'Roboto', 'Oxygen', 'Ubuntu'],
      },
    ],
  },
};
