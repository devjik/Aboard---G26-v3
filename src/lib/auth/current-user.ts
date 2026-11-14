import { db } from "@/lib/db";

export interface AuthUserStudent {
  id: string;
  institution: string;
  studentIdNumber: string;
  verificationStatus: string;
}

export interface AuthUserDriver {
  id: string;
  licenseNumber: string;
  status: string;
  ratingAvg: number;
  ratingCount: number;
  operatorId: string | null;
}

export interface AuthUserOperator {
  id: string;
  companyName: string;
  ghanaPostAddress: string | null;
  verified: boolean;
}

export interface AuthUserParent {
  id: string;
}

export interface AuthUserT {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  student?: AuthUserStudent | null;
  driver?: AuthUserDriver | null;
  operator?: AuthUserOperator | null;
  parent?: AuthUserParent | null;
}

/**
 * Build the AuthUserT shape from a User record by eagerly loading its
 * role-specific relations.
 */
export async function buildAuthUser(
  user: { id: string; role: string; name: string; phone: string; email: string | null; status: string },
): Promise<AuthUserT> {
  const [student, driver, operator, parent] = await Promise.all([
    db.student.findUnique({ where: { userId: user.id } }),
    db.driver.findUnique({ where: { userId: user.id } }),
    db.operator.findUnique({ where: { userId: user.id } }),
    db.parent.findUnique({ where: { userId: user.id } }),
  ]);

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    status: user.status,
    student: student
      ? {
          id: student.id,
          institution: student.institution,
          studentIdNumber: student.studentIdNumber,
          verificationStatus: student.verificationStatus,
        }
      : null,
    driver: driver
      ? {
          id: driver.id,
          licenseNumber: driver.licenseNumber,
          status: driver.status,
          ratingAvg: driver.ratingAvg,
          ratingCount: driver.ratingCount,
          operatorId: driver.operatorId,
        }
      : null,
    operator: operator
      ? {
          id: operator.id,
          companyName: operator.companyName,
          ghanaPostAddress: operator.ghanaPostAddress,
          verified: operator.verified,
        }
      : null,
    parent: parent ? { id: parent.id } : null,
  };
}
