import { z } from "zod";
import { followTags } from "./follow-tags";

const followTagSchema = z.enum(followTags);

export const followTagUpdateSchema = z.object({
  tag: followTagSchema.nullable(),
});
