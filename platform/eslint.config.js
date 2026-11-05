import { createEslintConfig } from '@shelfway/config/eslint';

export default createEslintConfig({
	jsx: ['app/**/*.js'],
	browserJsx: ['src/console/**/*.js', 'test/console/**/*.js', 'app/_components/**/*.js', 'app/docs/**/*.js', 'app/*.js'],
	enforceDesignSystem: true,
});
