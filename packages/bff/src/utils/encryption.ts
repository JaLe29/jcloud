import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Uint8Array {
	const key = process.env.ENCRYPTION_KEY;
	if (!key) {
		throw new Error('ENCRYPTION_KEY environment variable is not set');
	}
	// Hash the key to ensure it's exactly 32 bytes
	const hash = crypto.createHash('sha256').update(key).digest();
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

	// Extract IV, AuthTag, and encrypted data
	const iv = new Uint8Array(Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex'));
	const authTag = new Uint8Array(Buffer.from(encryptedText.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2), 'hex'));
	const encrypted = encryptedText.slice(IV_LENGTH * 2 + TAG_LENGTH * 2);

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(encrypted, 'hex', 'utf8');
	decrypted += decipher.final('utf8');

	return decrypted;
}
