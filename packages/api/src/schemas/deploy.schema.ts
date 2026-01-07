import { z } from 'zod';

export const deploySchema = z.object({
	image: z.string().min(1),
});

