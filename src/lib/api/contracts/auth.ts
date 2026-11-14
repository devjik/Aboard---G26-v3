import { z } from "zod";

// Ghana phone numbers: 0XXXXXXXXX or +233XXXXXXXXX
const ghanaPhoneRegex = /^(0|(\+233))\d{9}$/;

export const OtpRequest = z.object({
  phone: z.string().regex(ghanaPhoneRegex, "Invalid Ghana phone number"),
  purpose: z.enum(["register", "login"]).default("register"),
});
export type OtpRequestT = z.infer<typeof OtpRequest>;

export const OtpVerify = z.object({
  phone: z.string().regex(ghanaPhoneRegex, "Invalid Ghana phone number"),
  code: z
    .string()
    .regex(/^\d{6}$/, "Code must be 6 digits"),
  purpose: z.enum(["register", "login"]).default("register"),
});
export type OtpVerifyT = z.infer<typeof OtpVerify>;

export const PasswordLogin = z.object({
  phone: z.string().regex(ghanaPhoneRegex, "Invalid Ghana phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type PasswordLoginT = z.infer<typeof PasswordLogin>;

export const StudentRegister = z.object({
  name: z.string().min(2, "Name is too short"),
  phone: z.string().regex(ghanaPhoneRegex, "Invalid Ghana phone number"),
  email: z.string().email().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  institution: z.string().min(2, "Institution is required"),
  studentIdNumber: z.string().min(2, "Student ID is required"),
});
export type StudentRegisterT = z.infer<typeof StudentRegister>;

export const AuthUserSchema = z.object({
  id: z.string(),
  role: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable().optional(),
  status: z.string(),
  student: z
    .object({
      id: z.string(),
      institution: z.string(),
      studentIdNumber: z.string(),
      verificationStatus: z.string(),
    })
    .nullable()
    .optional(),
  driver: z
    .object({
      id: z.string(),
      licenseNumber: z.string(),
      status: z.string(),
      ratingAvg: z.number(),
      ratingCount: z.number(),
      operatorId: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  operator: z
    .object({
      id: z.string(),
      companyName: z.string(),
      ghanaPostAddress: z.string().nullable().optional(),
      verified: z.boolean(),
    })
    .nullable()
    .optional(),
  parent: z
    .object({
      id: z.string(),
    })
    .nullable()
    .optional(),
});
export type AuthUserT = z.infer<typeof AuthUserSchema>;
