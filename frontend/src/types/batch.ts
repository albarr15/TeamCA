export type BatchEffectiveStatus = "Active" | "Completed";
export type BatchStatusOverride = "Active" | "Completed";

export type Batch = {
  batch_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  supervisor_id: string | null;
  capacity: number | null;
  status_override: BatchStatusOverride | null;
  effective_status: BatchEffectiveStatus;
  is_archived: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
};

export type BatchMemberStatus = "Active" | "Completed" | "Withdrawn";

export type BatchMember = {
  assignment_id: string;
  batch_id: string;
  user: {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    departments?: Array<{
      department_id: string;
      department_role: "Head" | "Supervisor" | "Intern";
    }>;
  };
  assigned_at: string;
  status: BatchMemberStatus;
  status_updated_at: string | null;
  notes: string | null;
};

export type CreateBatchPayload = {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  supervisor_id?: string;
  capacity?: number;
  status_override?: BatchStatusOverride | null;
};

export type UpdateBatchPayload = Partial<CreateBatchPayload> & {
  is_archived?: boolean;
};

export type BatchStatusFilter = "all" | "active" | "completed" | "archived";
