'use client';
import { ConsoleLoading } from '../../src/console/views/loading.js';

/**
 * Shown immediately on every navigation inside /dashboard while the target page is in flight.
 */
export default function DashboardLoading() {
	return <ConsoleLoading area="merchant" />;
}
