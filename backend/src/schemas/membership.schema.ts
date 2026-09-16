import { z } from "zod";

export const updateMembershipSchema = z.object({
  isActive: z.boolean(),
});
