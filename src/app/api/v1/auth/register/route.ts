import { NextRequest } from "next/server";
import { StudentRegister } from "@/lib/api/contracts/auth";
import { okResponse, errorResponse, ERRORS } from "@/lib/api/envelope";
import { hashPassword } from "@/lib/auth/password";
import { buildAuthUser } from "@/lib/auth/current-user";
import { setSessionCookies } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCorrelationId } from "@/lib/auth/guard";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const corr = getCorrelationId(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(ERRORS.BAD_REQUEST, {
      message: "Invalid JSON body",
      meta: { correlationId: corr },
    }).response;
  }
  const parsed = StudentRegister.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ERRORS.VALIDATION, {
      details: parsed.error.flatten(),
      meta: { correlationId: corr },
    }).response;
  }
  const { name, phone, email, password, institution, studentIdNumber } =
    parsed.data;

  const existingPhone = await db.user.findUnique({
    where: { phone },
    select: { id: true },
  });
  if (existingPhone) {
    return errorResponse(ERRORS.CONFLICT, {
      code: "PHONE_TAKEN",
      message: "Phone number already registered",
      meta: { correlationId: corr },
    }).response;
  }
  if (email) {
    const existingEmail = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      return errorResponse(ERRORS.CONFLICT, {
        code: "EMAIL_TAKEN",
        message: "Email already registered",
        meta: { correlationId: corr },
      }).response;
    }
  }
  const existingStudentId = await db.student.findUnique({
    where: { institution_studentIdNumber: { institution, studentIdNumber } },
    select: { id: true },
  });
  if (existingStudentId) {
    return errorResponse(ERRORS.CONFLICT, {
      code: "STUDENT_ID_TAKEN",
      message: "Student ID already registered at this institution",
      meta: { correlationId: corr },
    }).response;
  }

  const passwordHash = hashPassword(password);
  try {
    const user = await db.user.create({
      data: {
        name,
        phone,
        email: email ?? null,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        student: {
          create: {
            institution,
            studentIdNumber,
            verificationStatus: "PENDING",
          },
        },
      },
      include: { student: true },
    });
    await setSessionCookies({
      userId: user.id,
      role: user.role,
      status: user.status,
    });
    const authUser = await buildAuthUser(user);
    return okResponse({ user: authUser }, { correlationId: corr });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return errorResponse(ERRORS.CONFLICT, {
          message: "Unique constraint violation",
          details: { target: e.meta?.target },
          meta: { correlationId: corr },
        }).response;
      }
    }
    throw e;
  }
}
