'use client';

import { useEffect, useState } from 'react';
import { Button, Callout, Dialog, Form, Icon, Input, TextArea, copyText } from '@shelfway/ui';
import { COMPANY_NAME, PRODUCT_BRAND } from './brand.js';

const SUPPORT_EMAIL = 'support@shelfway.com';

/**
 * Contact Us Modal for public website, docs, and sign-in surfaces.
 * Built with @shelfway/ui Dialog, Input, TextArea, and Button.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   brandName?: string,
 *   companyName?: string,
 * }} props
 */
export function ContactModal({ open, onClose, brandName = PRODUCT_BRAND, companyName = COMPANY_NAME }) {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [submitted, setSubmitted] = useState(false);
	const [copied, setCopied] = useState(false);
	const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));

	useEffect(() => {
		if (!open) {
			setName('');
			setEmail('');
			setMessage('');
			setSubmitted(false);
			setCopied(false);
			setErrors({});
		}
	}, [open]);

	const handleCopyEmail = () => {
		copyText(SUPPORT_EMAIL);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSubmit = () => {
		const nextErrors = /** @type {Record<string, string>} */ ({});
		if (!name.trim()) nextErrors.name = 'Your name is required.';
		if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			nextErrors.email = 'A valid email address is required.';
		}
		if (!message.trim()) nextErrors.message = 'Please enter a message.';

		if (Object.keys(nextErrors).length > 0) {
			setErrors(nextErrors);
			return;
		}

		setSubmitted(true);
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={`Contact ${brandName}`}
			eyebrow="GET IN TOUCH"
			description={`Have questions about merchant accounts, website features, or custom setups? We are here to help.`}
			size="md">
			{submitted ? (
				<div className="space-y-4 py-2">
					<Callout tone="success">
						Thank you for reaching out, {name.trim()}! We received your message and will reply to {email.trim()} within one
						business day.
					</Callout>
					<div className="flex justify-end pt-2">
						<Button variant="primary" onClick={onClose} size="md">
							Done
						</Button>
					</div>
				</div>
			) : (
				<div className="space-y-5">
					{/* Direct Support Channel Box */}
					<div className="rounded-control border border-line bg-surface-2 p-3.5 space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Icon name="mail" size={16} className="text-primary" />
								<span className="text-xs font-semibold text-fg">Direct Email Support</span>
							</div>
							<span className="text-[10px] font-mono text-muted">1 business day reply</span>
						</div>
						<div className="flex items-center justify-between text-xs">
							<a href={`mailto:${SUPPORT_EMAIL}`} className="font-mono text-primary hover:underline">
								{SUPPORT_EMAIL}
							</a>
							<button
								type="button"
								onClick={handleCopyEmail}
								className="text-[11px] text-muted hover:text-fg transition font-medium cursor-pointer">
								{copied ? 'Copied!' : 'Copy email'}
							</button>
						</div>
					</div>

					{/* Quick Contact Form */}
					<Form onSubmit={handleSubmit} aria-label="Contact form" className="space-y-3.5">
						<Input
							label="Your name"
							placeholder="Enter your name"
							value={name}
							onChange={(e) => {
								setName(e.currentTarget.value);
								if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
							}}
							error={errors.name}
							required
							hideRequiredMark
							className="h-10 text-sm"
						/>

						<Input
							label="Email address"
							type="email"
							placeholder="you@business.com"
							value={email}
							onChange={(e) => {
								setEmail(e.currentTarget.value);
								if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
							}}
							error={errors.email}
							required
							hideRequiredMark
							className="h-10 text-sm"
						/>

						<TextArea
							label="How can we help?"
							placeholder="Tell us about your website, products you want to use, or any questions..."
							value={message}
							onChange={(e) => {
								setMessage(e.currentTarget.value);
								if (errors.message) setErrors((prev) => ({ ...prev, message: '' }));
							}}
							error={errors.message}
							rows={3}
							required
							hideRequiredMark
							className="text-sm"
						/>

						<div className="flex items-center justify-between pt-1">
							<span className="text-xs text-muted">by {companyName}</span>
							<Button type="submit" variant="primary" size="md" className="font-semibold px-6">
								Send message
							</Button>
						</div>
					</Form>
				</div>
			)}
		</Dialog>
	);
}
