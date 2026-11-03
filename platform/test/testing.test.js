import { describe, expect, it } from 'vitest';
import * as testing from '@shelfway/platform/testing';

describe('@shelfway/platform/testing', () => {
	it('exposes the composition root, the module factories and the API driver for system tests', () => {
		expect(Object.keys(testing).sort()).toEqual([
			'closeMongoClients',
			'commerceModule',
			'createCatalogModule',
			'createIdentityModule',
			'createPlatform',
			'createPlatformClient',
			'createSystemStore',
			'loadConfig',
			'systemModule',
			'testSystemState',
			'websiteModule',
		]);
		for (const factory of [testing.createCatalogModule, testing.createIdentityModule]) {
			expect(factory().name).toBeTypeOf('string');
		}
	});
});
