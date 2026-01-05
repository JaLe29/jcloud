import { z } from 'zod';

export const createUserSchema = z.object({
	userPublicId: z.string().min(1, 'userPublicId is required').max(255, 'userPublicId must be at most 255 characters'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

