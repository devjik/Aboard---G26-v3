import { z } from "zod";

export const RoleSchema = z.enum([
  "STUDENT",
  "DRIVER",
  "OPERATOR",
  "PARENT",
  "ADMIN",
]);
export type RoleT = z.infer<typeof RoleSchema>;

export const RegionNameSchema = z.enum([
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
]);

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type PaginationQueryT = z.infer<typeof PaginationQuery>;

export const ApiEnvelope = z.object({
  ok: z.boolean(),
  data: z.any().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    })
    .optional(),
  meta: z
    .object({
      page: z.number().optional(),
      pageSize: z.number().optional(),
      total: z.number().optional(),
      totalPages: z.number().optional(),
      correlationId: z.string().optional(),
    })
    .passthrough()
    .optional(),
});
