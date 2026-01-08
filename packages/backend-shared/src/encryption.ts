import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Uint8Array {
	// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	const key = process.env.ENCRYPTION_KEY;
	if (!key) {
		throw new Error('ENCRYPTION_KEY environment variable is not set');
	}
	// Trim whitespace and newlines that might be introduced by Kubernetes secrets/configmaps
	const trimmedKey = key.trim();
	if (trimmedKey.length === 0) {
		throw new Error('ENCRYPTION_KEY environment variable is empty after trimming');
	}
	// Hash the key to ensure it's exactly 32 bytes
	const hash = crypto.createHash('sha256').update(trimmedKey, 'utf8').digest();
	return new Uint8Array(hash);
}

export function encrypt(text: string): string {
	const key = getEncryptionKey();
	const iv = new Uint8Array(crypto.randomBytes(IV_LENGTH));
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

	let encrypted = cipher.update(text, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	const authTag = cipher.getAuthTag();

	// Return IV + AuthTag + Encrypted data as hex
	const ivHex = Buffer.from(iv).toString('hex');
	const tagHex = authTag.toString('hex');
	return ivHex + tagHex + encrypted;
}

export function decrypt(encryptedText: string): string {
	const key = getEncryptionKey();

	try {
		// Validate encrypted text length
		const minLength = IV_LENGTH * 2 + TAG_LENGTH * 2;
		if (encryptedText.length < minLength) {
			throw new Error(
				`Encrypted text is too short (${encryptedText.length} bytes, expected at least ${minLength} bytes). ` +
					'This might indicate corrupted data or incorrect format.',
			);
		}

		// Extract IV, AuthTag, and encrypted data
		const ivHex = encryptedText.slice(0, IV_LENGTH * 2);
		const tagHex = encryptedText.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2);
		const encrypted = encryptedText.slice(IV_LENGTH * 2 + TAG_LENGTH * 2);

		// Validate hex format
		if (!/^[0-9a-f]+$/i.test(ivHex) || !/^[0-9a-f]+$/i.test(tagHex) || !/^[0-9a-f]+$/i.test(encrypted)) {
			throw new Error('Encrypted text contains invalid hex characters');
		}

		const iv = new Uint8Array(Buffer.from(ivHex, 'hex'));
		const authTag = new Uint8Array(Buffer.from(tagHex, 'hex'));

		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isKeyError =
			errorMessage.includes('bad decrypt') ||
			errorMessage.includes('Unsupported state') ||
			errorMessage.includes('Invalid authentication tag');

		if (isKeyError) {
			throw new Error(
				'Failed to decrypt data. This is likely caused by an incorrect ENCRYPTION_KEY. ' +
					'Make sure the ENCRYPTION_KEY environment variable matches the key used to encrypt the data. ' +
					`Original error: ${errorMessage}`,
				{ cause: error },
			);
		}

		throw new Error(`Failed to decrypt data: ${errorMessage}`, { cause: error });
	}
}
