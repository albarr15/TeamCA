import { Readable } from "stream";
import bcrypt from "bcryptjs";
import csv from "csv-parser";
import Department from "../models/Department.js";
import { createUser } from "./userService.js";

type GlobalRole = "Superadmin" | "Admin" | "Standard_User";
type ImportableGlobalRole = Exclude<GlobalRole, "Superadmin">;
type DepartmentRole = "Head" | "Supervisor" | "Intern";
type WorkingDay = "M" | "T" | "W" | "Th" | "F" | "Sat" | "Sun";

export type FailedRow = {
  row: Record<string, string>;
  reason: string;
};

export type ImportResult = {
  total_processed: number;
  successful_inserts: number;
  failed_rows: FailedRow[];
};

export type ImportUsersOptions = {
  actorGlobalRole?: GlobalRole;
};

const REQUIRED_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "password",
  "global_role",
] as const;

const VALID_GLOBAL_ROLES = new Set<ImportableGlobalRole>([
  "Admin",
  "Standard_User",
]);
const VALID_DEPARTMENT_ROLES = new Set<DepartmentRole>([
  "Head",
  "Supervisor",
  "Intern",
]);
const VALID_WORKING_DAYS = new Set<WorkingDay>([
  "M",
  "T",
  "W",
  "Th",
  "F",
  "Sat",
  "Sun",
]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeRow = (row: Record<string, unknown>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.trim().replace(/^\uFEFF/, ""),
      value === null || value === undefined ? "" : String(value).trim(),
    ]),
  );
};

const parseCsvBuffer = (buffer: Buffer): Promise<Record<string, string>[]> => {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];

    Readable.from(buffer)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, ""),
        }),
      )
      .on("data", (row: Record<string, unknown>) => {
        rows.push(normalizeRow(row));
      })
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
};

const parseWorkingDays = (value: string): WorkingDay[] => {
  if (!value) {
    return [];
  }

  const days = value
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean);

  const invalidDay = days.find(
    (day): day is string => !VALID_WORKING_DAYS.has(day as WorkingDay),
  );

  if (invalidDay) {
    throw new Error(
      "working_days must contain only M, T, W, Th, F, Sat, or Sun.",
    );
  }

  return days as WorkingDay[];
};

const validateRequiredColumns = (row: Record<string, string>) => {
  const missing = REQUIRED_COLUMNS.filter((column) => !row[column]);

  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}.`);
  }
};

export const importUsersFromCsv = async (
  buffer: Buffer,
  options: ImportUsersOptions = {},
): Promise<ImportResult> => {
  const rows = await parseCsvBuffer(buffer);
  const result: ImportResult = {
    total_processed: rows.length,
    successful_inserts: 0,
    failed_rows: [],
  };

  for (const row of rows) {
    try {
      validateRequiredColumns(row);

      const email = row.email.toLowerCase();
      const globalRole = row.global_role as ImportableGlobalRole;
      const departmentRole = (row.department_role || "Intern") as DepartmentRole;

      if (!EMAIL_REGEX.test(email)) {
        throw new Error("Invalid email format.");
      }

      if (!VALID_GLOBAL_ROLES.has(globalRole)) {
        throw new Error("global_role must be Admin or Standard_User.");
      }

      if (!VALID_DEPARTMENT_ROLES.has(departmentRole)) {
        throw new Error(
          "department_role must be Head, Supervisor, or Intern.",
        );
      }

      if (options.actorGlobalRole === "Admin") {
        if (globalRole !== "Standard_User" || departmentRole !== "Intern") {
          throw new Error("Admins can only import Standard_User interns.");
        }
      }

      if (row.password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      const departments = [];
      if (row.department_name) {
        const department = await Department.findOne({
          department_name: row.department_name,
        })
          .collation({ locale: "en", strength: 2 })
          .select("_id");

        if (!department) {
          throw new Error(`Department not found: ${row.department_name}.`);
        }

        departments.push({
          department_id: String(department._id),
          department_role: departmentRole,
        });
      }

      const workingDays = parseWorkingDays(row.working_days || "");
      const passwordHash = await bcrypt.hash(row.password, 12);

      await createUser({
        first_name: row.first_name,
        last_name: row.last_name,
        email,
        password_hash: passwordHash,
        global_role: globalRole,
        departments,
        working_hours: {
          start: row.working_hours_start || "",
          end: row.working_hours_end || "",
        },
        working_days: workingDays,
      });

      result.successful_inserts += 1;
    } catch (err) {
      result.failed_rows.push({
        row,
        reason: err instanceof Error ? err.message : "Unable to import row.",
      });
    }
  }

  return result;
};
