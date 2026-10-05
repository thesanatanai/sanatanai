import { ThinkingLevel } from "@google/genai";
import z from "zod";

export const newMessageModel = z.object({
  role: z.literal("user"),
  parts: z.array(
    z.object({
      inlineData: z
        .object({
          data: z.string(),
          mimeType: z.string(),
        })
        .optional(),
      text: z.string(),
      thought: z.boolean().optional(),
      thoughtSignature: z.string().optional(),
    }),
  ),
});

export const messageModel = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(
    z.object({
      inlineData: z
        .object({
          data: z.string(),
          mimeType: z.string(),
        })
        .optional(),
      text: z.string().optional(),
      thought: z.boolean().optional(),
      thoughtSignature: z.string().optional(),
    }),
  ),
});

const Incoming = z.object({
  id: z.string(),
  newMessage: newMessageModel,
  config: z
    .object({
      model: z.string().optional(),
      config: z
        .object({
          thinkingConfig: z
            .object({
              thinkingBudget: z.number().optional(),
              thinkingLevel: z.enum(ThinkingLevel).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export const v2Incoming = z.object({
  newMessage: z.string(),
});

export const nameIncoming = z.object({
  newMessage: z.string(),
  chatId: z.string(),
});

export default Incoming;
