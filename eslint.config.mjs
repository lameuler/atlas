// @ts-check
import pluginJs from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginNode from 'eslint-plugin-n'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    {
        ignores: ['**/dist/**/*', '**/.cache/**/*'],
    },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginNode.configs['flat/recommended'],
    {
        rules: {
            'n/prefer-node-protocol': 'error',
            'n/prefer-promises/fs': 'error',
            'n/no-missing-import': 'off', // let tsc handle import checks
        },
    },
    eslintConfigPrettier,
)
