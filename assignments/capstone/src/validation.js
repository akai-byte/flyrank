import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  label: z.string().min(1).max(100),
  type: z.enum(["text","email","tel","textarea"]),
  required: z.boolean().default(false)
});

export const widgetSchema = z.object({
  type: z.enum(["signup","cta","popover"]),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  fields: z.array(fieldSchema).max(20).default([]),
  button_text: z.string().min(1).max(80).default("Submit"),
  display_options: z.record(z.string(), z.unknown()).default({})
});

export const submissionSchema = z.object({
  widget_id: z.string().uuid(),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  honeypot: z.string().max(200).optional().default("")
}).superRefine((value, ctx) => {
  const raw = JSON.stringify(value.data);
  if (raw.length > 12000) {
    ctx.addIssue({ code: "custom", message: "Payload too large" });
  }
});
