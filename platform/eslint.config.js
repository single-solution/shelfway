import { createEslintConfig } from '@shelfway/config/eslint';

export default createEslintConfig({
	jsx: ['app/**/*.js'],
	browserJsx: ['src/console/**/*.js', 'test/console/**/*.js', 'app/(site)/**/*.js'],
	enforceDesignSystem: true,
});
