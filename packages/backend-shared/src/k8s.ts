/**
 * Converts a string to a valid Kubernetes resource name.
 *
 * Kubernetes names must:
 * - Be lowercase
 * - Contain only alphanumeric characters, '-', or '.'
 * - Start and end with an alphanumeric character
 * - Be max 63 characters for most resources (253 for namespaces)
 */
export function toK8sName(name: string, maxLength = 63): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-') // Replace invalid chars with '-'
		.replace(/-+/g, '-') // Collapse multiple '-' into one
		.replace(/^-/, '') // Remove leading '-'
		.replace(/-$/, '') // Remove trailing '-'
		.slice(0, maxLength); // Truncate to max length
}
