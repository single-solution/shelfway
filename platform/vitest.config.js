import { defineUnitConfig } from '@shelfway/config/vitest';

export default defineUnitConfig({
	dir: import.meta.dirname,
	jsx: ['src/console', 'test/console', 'app', 'app/(admin)', 'app/(console)'],
	mongo: true,
});
