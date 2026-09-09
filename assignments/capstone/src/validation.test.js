import test from "node:test";
import assert from "node:assert/strict";
import { submissionSchema } from "./validation.js";

test("valid submission passes", () => {
  const result = submissionSchema.safeParse({
    widget_id: "00000000-0000-0000-0000-000000000101",
    data: { name: "Ashish", email: "ashish@example.com" }
  });
  assert.equal(result.success, true);
});

test("invalid widget id fails", () => {
  const result = submissionSchema.safeParse({
    widget_id: "bad",
    data: {}
  });
  assert.equal(result.success, false);
});

test("honeypot is optional", () => {
  const result = submissionSchema.safeParse({
    widget_id: "00000000-0000-0000-0000-000000000101",
    data: {},
    honeypot: ""
  });
  assert.equal(result.success, true);
});
