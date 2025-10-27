import { z } from 'zod';
export declare const storyChoiceSchema: z.ZodObject<{
    text: z.ZodString;
    intent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    intent?: string | undefined;
}, {
    text: string;
    intent?: string | undefined;
}>;
export declare const storySegmentSchema: z.ZodObject<{
    content: z.ZodString;
    isEnding: z.ZodBoolean;
    choices: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        intent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        intent?: string | undefined;
    }, {
        text: string;
        intent?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    content: string;
    isEnding: boolean;
    choices: {
        text: string;
        intent?: string | undefined;
    }[];
}, {
    content: string;
    isEnding: boolean;
    choices: {
        text: string;
        intent?: string | undefined;
    }[];
}>;
export declare const storyWorkflowMetadataSchema: z.ZodObject<{
    topic: z.ZodString;
    turnIndex: z.ZodNumber;
    maxTurns: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    turnIndex: number;
    maxTurns?: number | undefined;
}, {
    topic: string;
    turnIndex: number;
    maxTurns?: number | undefined;
}>;
export declare const storyWorkflowRequestSchema: z.ZodObject<{
    topic: z.ZodString;
    turnIndex: z.ZodNumber;
    maxTurns: z.ZodOptional<z.ZodNumber>;
} & {
    historyContent: z.ZodDefault<z.ZodString>;
    selectedChoice: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    turnIndex: number;
    historyContent: string;
    maxTurns?: number | undefined;
    selectedChoice?: string | undefined;
}, {
    topic: string;
    turnIndex: number;
    maxTurns?: number | undefined;
    historyContent?: string | undefined;
    selectedChoice?: string | undefined;
}>;
export declare const storyWorkflowResponseSchema: z.ZodObject<{
    segment: z.ZodObject<{
        content: z.ZodString;
        isEnding: z.ZodBoolean;
        choices: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            intent: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            intent?: string | undefined;
        }, {
            text: string;
            intent?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }, {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }>;
    traceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    segment: {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    };
    traceId?: string | undefined;
}, {
    segment: {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    };
    traceId?: string | undefined;
}>;
export declare const storySnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    topic: z.ZodString;
    content: z.ZodString;
    createdAt: z.ZodString;
    traceId: z.ZodOptional<z.ZodString>;
    segments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        isEnding: z.ZodBoolean;
        choices: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            intent: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            intent?: string | undefined;
        }, {
            text: string;
            intent?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }, {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }>, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    content: string;
    id: string;
    createdAt: string;
    traceId?: string | undefined;
    segments?: {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    topic: string;
    content: string;
    id: string;
    createdAt: string;
    traceId?: string | undefined;
    segments?: {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const saveStoryRequestSchema: z.ZodObject<{
    topic: z.ZodString;
    content: z.ZodString;
    traceId: z.ZodOptional<z.ZodString>;
    segments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        isEnding: z.ZodBoolean;
        choices: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            intent: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            intent?: string | undefined;
        }, {
            text: string;
            intent?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }, {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }>, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    content: string;
    traceId?: string | undefined;
    segments?: {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    topic: string;
    content: string;
    traceId?: string | undefined;
    segments?: {
        content: string;
        isEnding: boolean;
        choices: {
            text: string;
            intent?: string | undefined;
        }[];
    }[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const saveStoryResponseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
}, {
    id: string;
    createdAt: string;
}>;
export declare const ttsSynthesisRequestSchema: z.ZodObject<{
    text: z.ZodString;
    voiceId: z.ZodOptional<z.ZodString>;
    speed: z.ZodOptional<z.ZodNumber>;
    pitch: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    text: string;
    voiceId?: string | undefined;
    speed?: number | undefined;
    pitch?: number | undefined;
}, {
    text: string;
    voiceId?: string | undefined;
    speed?: number | undefined;
    pitch?: number | undefined;
}>;
export declare const ttsSynthesisResponseSchema: z.ZodObject<{
    audioUrl: z.ZodString;
    format: z.ZodDefault<z.ZodString>;
    durationMs: z.ZodNumber;
    provider: z.ZodString;
    traceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    audioUrl: string;
    format: string;
    durationMs: number;
    provider: string;
    traceId?: string | undefined;
}, {
    audioUrl: string;
    durationMs: number;
    provider: string;
    traceId?: string | undefined;
    format?: string | undefined;
}>;
export type StoryChoiceSchema = z.infer<typeof storyChoiceSchema>;
export type StorySegmentSchema = z.infer<typeof storySegmentSchema>;
export type StoryWorkflowRequestSchema = z.infer<typeof storyWorkflowRequestSchema>;
export type StoryWorkflowResponseSchema = z.infer<typeof storyWorkflowResponseSchema>;
export type StorySnapshotSchema = z.infer<typeof storySnapshotSchema>;
export type SaveStoryRequestSchema = z.infer<typeof saveStoryRequestSchema>;
export type SaveStoryResponseSchema = z.infer<typeof saveStoryResponseSchema>;
export type TtsSynthesisRequestSchema = z.infer<typeof ttsSynthesisRequestSchema>;
export type TtsSynthesisResponseSchema = z.infer<typeof ttsSynthesisResponseSchema>;
//# sourceMappingURL=story.d.ts.map