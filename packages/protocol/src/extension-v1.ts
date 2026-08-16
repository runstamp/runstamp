import { z } from "zod";
import {
  ExtensionRequestSchema,
  ExtensionResultSchema,
  ValidatorResultSchema,
} from "./extension-runtime.js";

/** Stable wire envelope for invoking a dependency-neutral extension. */
export const ExtensionV1RequestSchema = z.strictObject({
  version: z.literal("1.0"),
  request: ExtensionRequestSchema,
});

/** Stable wire envelope for extension output plus validation evidence. */
export const ExtensionV1ResultSchema = z.strictObject({
  version: z.literal("1.0"),
  result: ExtensionResultSchema,
  validators: z.array(ValidatorResultSchema),
});

export type ExtensionV1Request = z.infer<typeof ExtensionV1RequestSchema>;
export type ExtensionV1Result = z.infer<typeof ExtensionV1ResultSchema>;
