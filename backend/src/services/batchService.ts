import { Types } from "mongoose";
import Batch, { type IBatch, type BatchStatusOverride } from "../models/Batch";
import BatchAssignment, {
  type BatchMemberStatus,
} from "../models/BatchAssignment";
import User from "../models/User";
import InternProfile from "../models/InternProfile";

const toObjectId = (id: string) => new Types.ObjectId(id);

const assertUserInternshipEditable = async (userId: string) => {
  const profile = await InternProfile.findOne({ user_id: userId }).select("is_archived").lean();
  if (profile?.is_archived) throw new Error("Archived internship records are read-only.");
};

export type BatchEffectiveStatus = "Active" | "Completed";

export const computeEffectiveStatus = (
  batch: Pick<IBatch, "start_date" | "end_date" | "status_override">,
  now: Date = new Date(),
): BatchEffectiveStatus => {
  if (batch.status_override) {
    return batch.status_override;
  }
  // A batch is Active until its end date has passed — that covers both
  // in-progress cycles and ones scheduled to start in the future.
  return now <= batch.end_date ? "Active" : "Completed";
};

const normalize = (batch: IBatch, memberCount = 0) => ({
  batch_id: String(batch._id),
  name: batch.name,
  description: batch.description ?? null,
  start_date: batch.start_date,
  end_date: batch.end_date,
  supervisor_id: batch.supervisor_id ? String(batch.supervisor_id) : null,
  capacity: batch.capacity ?? null,
  status_override: batch.status_override ?? null,
  effective_status: computeEffectiveStatus(batch),
  is_archived: batch.is_archived,
  member_count: memberCount,
  created_at: batch.createdAt,
  updated_at: batch.updatedAt,
});

export type CreateBatchInput = {
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  supervisor_id?: string;
  capacity?: number;
  status_override?: BatchStatusOverride | null;
};

export type UpdateBatchInput = Partial<CreateBatchInput> & {
  is_archived?: boolean;
};

export type ListBatchesInput = {
  status?: "active" | "completed" | "archived" | "all";
};

const countMembers = async (batchId: Types.ObjectId | string) =>
  BatchAssignment.countDocuments({ batch_id: batchId });

export const listBatches = async (input: ListBatchesInput = {}) => {
  const query: Record<string, unknown> = {};
  const status = input.status ?? "all";

  if (status === "archived") {
    query.is_archived = true;
  } else {
    query.is_archived = false;
  }

  const batches = await Batch.find(query).sort({ start_date: -1 }).lean();

  const results = await Promise.all(
    batches.map(async (b) => {
      const memberCount = await BatchAssignment.countDocuments({
        batch_id: b._id,
      });
      const normalized = normalize(b as unknown as IBatch, memberCount);
      return normalized;
    }),
  );

  if (status === "active") {
    return results.filter((b) => b.effective_status === "Active");
  }
  if (status === "completed") {
    return results.filter((b) => b.effective_status === "Completed");
  }
  return results;
};

export const getBatch = async (batchId: string) => {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error("Batch not found.");
  }
  const memberCount = await countMembers(batch._id);
  return normalize(batch, memberCount);
};

export const createBatch = async (input: CreateBatchInput) => {
  if (input.end_date < input.start_date) {
    throw new Error("end_date must be on or after start_date.");
  }

  const existing = await Batch.findOne({ name: input.name.trim() }).lean();
  if (existing) {
    throw new Error("A batch with that name already exists.");
  }

  const batch = await Batch.create({
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    start_date: input.start_date,
    end_date: input.end_date,
    supervisor_id: input.supervisor_id
      ? toObjectId(input.supervisor_id)
      : undefined,
    capacity: input.capacity,
    status_override: input.status_override ?? null,
    is_archived: false,
  });

  return normalize(batch, 0);
};

export const updateBatch = async (batchId: string, input: UpdateBatchInput) => {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error("Batch not found.");
  }

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (trimmed !== batch.name) {
      const dupe = await Batch.findOne({
        name: trimmed,
        _id: { $ne: batch._id },
      }).lean();
      if (dupe) {
        throw new Error("A batch with that name already exists.");
      }
      batch.name = trimmed;
    }
  }
  if (input.description !== undefined) {
    batch.description = input.description?.trim() || undefined;
  }
  if (input.start_date !== undefined) batch.start_date = input.start_date;
  if (input.end_date !== undefined) batch.end_date = input.end_date;
  if (batch.end_date < batch.start_date) {
    throw new Error("end_date must be on or after start_date.");
  }
  if (input.supervisor_id !== undefined) {
    batch.supervisor_id = input.supervisor_id
      ? toObjectId(input.supervisor_id)
      : undefined;
  }
  if (input.capacity !== undefined) batch.capacity = input.capacity;
  if (input.status_override !== undefined) {
    batch.status_override = input.status_override ?? null;
  }
  if (input.is_archived !== undefined) batch.is_archived = input.is_archived;

  await batch.save();

  const memberCount = await countMembers(batch._id);
  return normalize(batch, memberCount);
};

export const archiveBatch = async (batchId: string) => {
  return updateBatch(batchId, { is_archived: true });
};

export const restoreBatch = async (batchId: string) => {
  return updateBatch(batchId, { is_archived: false });
};

const assertUsersAreInterns = async (userIds: string[]) => {
  if (userIds.length === 0) return;
  const objectIds = userIds.map(toObjectId);
  const users = await User.find({ _id: { $in: objectIds } })
    .select("_id departments")
    .lean();

  const foundIds = new Set(users.map((u) => String(u._id)));
  const missing = userIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new Error(`User(s) not found: ${missing.join(", ")}`);
  }

  const notInterns = users.filter(
    (u) =>
      !Array.isArray(u.departments) ||
      !u.departments.some((d) => d.department_role === "Intern"),
  );
  if (notInterns.length > 0) {
    throw new Error(
      `Only interns can be added to a batch (offenders: ${notInterns
        .map((u) => String(u._id))
        .join(", ")}).`,
    );
  }
};

export const listBatchMembers = async (batchId: string) => {
  const batch = await Batch.findById(batchId).lean();
  if (!batch) {
    throw new Error("Batch not found.");
  }

  const assignments = await BatchAssignment.find({ batch_id: batch._id })
    .populate("user_id", "first_name last_name email departments")
    .lean();

  return assignments.map((a) => ({
    assignment_id: String(a._id),
    batch_id: String(a.batch_id),
    user: a.user_id,
    assigned_at: a.assigned_at,
    status: a.status,
    status_updated_at: a.status_updated_at ?? null,
    notes: a.notes ?? null,
  }));
};

export const updateBatchMember = async (
  batchId: string,
  userId: string,
  input: { status?: BatchMemberStatus; notes?: string },
) => {
  await assertUserInternshipEditable(userId);
  const assignment = await BatchAssignment.findOne({
    batch_id: toObjectId(batchId),
    user_id: toObjectId(userId),
  });
  if (!assignment) {
    throw new Error("User is not a member of this batch.");
  }

  if (input.status && input.status !== assignment.status) {
    assignment.status = input.status;
    assignment.status_updated_at = new Date();
  }
  if (input.notes !== undefined) {
    assignment.notes = input.notes.trim() || undefined;
  }

  await assignment.save();
  return assignment.toObject();
};

export const addBatchMembers = async (batchId: string, userIds: string[]) => {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error("Batch not found.");
  }

  const uniqueIds = [
    ...new Set(userIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  ];
  if (uniqueIds.length === 0) {
    throw new Error("At least one user_id is required.");
  }

  await Promise.all(uniqueIds.map(assertUserInternshipEditable));

  await assertUsersAreInterns(uniqueIds);

  // Enforce single-batch membership: reject anyone already in another batch.
  const existing = await BatchAssignment.find({
    user_id: { $in: uniqueIds.map(toObjectId) },
    batch_id: { $ne: batch._id },
  })
    .select("user_id")
    .lean();
  if (existing.length > 0) {
    const conflicts = [...new Set(existing.map((r) => String(r.user_id)))];
    throw new Error(
      `Intern(s) already belong to another batch: ${conflicts.join(", ")}. Remove them from their current batch first.`,
    );
  }

  if (typeof batch.capacity === "number") {
    const current = await countMembers(batch._id);
    if (current + uniqueIds.length > batch.capacity) {
      throw new Error(
        `Adding ${uniqueIds.length} member(s) would exceed batch capacity (${batch.capacity}).`,
      );
    }
  }

  await BatchAssignment.insertMany(
    uniqueIds.map((id) => ({
      batch_id: batch._id,
      user_id: toObjectId(id),
    })),
    { ordered: false },
  ).catch((err: any) => {
    if (err?.code === 11000 || err?.writeErrors) {
      return;
    }
    throw err;
  });

  return listBatchMembers(batchId);
};

export const removeBatchMember = async (batchId: string, userId: string) => {
  await assertUserInternshipEditable(userId);
  const result = await BatchAssignment.deleteOne({
    batch_id: toObjectId(batchId),
    user_id: toObjectId(userId),
  });
  if (result.deletedCount === 0) {
    throw new Error("User is not a member of this batch.");
  }
};

export const getBatchIdsForUser = async (userId: string): Promise<string[]> => {
  const assignments = await BatchAssignment.find({
    user_id: toObjectId(userId),
  })
    .select("batch_id")
    .lean();
  return assignments.map((a) => String(a.batch_id));
};

export const getAllAssignedUserIds = async (): Promise<string[]> => {
  const assignments = await BatchAssignment.find({}).select("user_id").lean();
  return [...new Set(assignments.map((a) => String(a.user_id)))];
};

export const getUserIdsInBatch = async (batchId: string): Promise<string[]> => {
  const assignments = await BatchAssignment.find({
    batch_id: toObjectId(batchId),
  })
    .select("user_id")
    .lean();
  return assignments.map((a) => String(a.user_id));
};

export const assignUserToBatches = async (userId: string, batchIds: string[]) => {
  await assertUserInternshipEditable(userId);
  const uniqueIds = [
    ...new Set(batchIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  ];
  if (uniqueIds.length === 0) return;

  await assertUsersAreInterns([userId]);

  // Single-batch rule: take only the first batch id even if multiple were sent.
  const targetBatchId = uniqueIds[0];

  const existing = await BatchAssignment.findOne({
    user_id: toObjectId(userId),
  }).lean();
  if (existing && String(existing.batch_id) !== targetBatchId) {
    throw new Error(
      "Intern already belongs to another batch. Remove them from their current batch first.",
    );
  }

  await BatchAssignment.updateOne(
    { batch_id: toObjectId(targetBatchId), user_id: toObjectId(userId) },
    { $setOnInsert: { assigned_at: new Date(), status: "Active" } },
    { upsert: true },
  );
};
