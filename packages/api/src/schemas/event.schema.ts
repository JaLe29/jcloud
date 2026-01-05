import { z } from 'zod';

export const EventType = {
	START_GAME: 'START_GAME',
	START_LEVEL: 'START_LEVEL',
	FINISH_LEVEL: 'FINISH_LEVEL',
	DEAD: 'DEAD',
	ITEM_PICKED: 'ITEM_PICKED',
} as const;

// Reusable schemas for common fields
const levelNameSchema = z.string().min(1, 'levelName is required').max(128, 'levelName must be at most 128 characters');
const userPublicIdSchema = z.string().min(1, 'userPublicId is required').max(255, 'userPublicId must be at most 255 characters');

// Define schema for each event type with its specific meta structure
const startGameEventSchema = z.strictObject({
	event: z.literal('START_GAME'),
	meta: z.null().optional(),
});

const startLevelEventSchema = z.strictObject({
	event: z.literal('START_LEVEL'),
	meta: z.strictObject({
		levelName: levelNameSchema,
	}),
});

const finishLevelEventSchema = z.strictObject({
	event: z.literal('FINISH_LEVEL'),
	meta: z.strictObject({
		totalDead: z.number(),
		currentRunDead: z.number(),
		totalTime: z.number(),
		currentRunTime: z.number(),
	}),
});

const deadEventSchema = z.strictObject({
	event: z.literal('DEAD'),
	meta: z.strictObject({
		levelName: levelNameSchema,
	}),
});

const itemPickedEventSchema = z.strictObject({
	event: z.literal('ITEM_PICKED'),
	meta: z.strictObject({
		itemName: z.string().min(1, 'itemName is required').max(128, 'itemName must be at most 128 characters'),
		levelName: levelNameSchema,
	}),
});

// Add userPublicId to each event schema to create the final schemas
const startGameWithUser = startGameEventSchema.extend({
	userPublicId: userPublicIdSchema,
});

const startLevelWithUser = startLevelEventSchema.extend({
	userPublicId: userPublicIdSchema,
});

const finishLevelWithUser = finishLevelEventSchema.extend({
	userPublicId: userPublicIdSchema,
});

const deadWithUser = deadEventSchema.extend({
	userPublicId: userPublicIdSchema,
});

const itemPickedWithUser = itemPickedEventSchema.extend({
	userPublicId: userPublicIdSchema,
});

// Discriminated union with userPublicId included
export const createEventSchema = z.discriminatedUnion('event', [
	startGameWithUser,
	startLevelWithUser,
	finishLevelWithUser,
	deadWithUser,
	itemPickedWithUser,
]);

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type EventTypeValue = typeof EventType[keyof typeof EventType];

