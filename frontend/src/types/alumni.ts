export interface AlumniEvaluation {
  evaluation_id: string;
  user_id: string;
  evaluator: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null;
  summary: string;
  strengths: string;
  improvement_areas: string;
  recommendation: string;
  created_at: string;
  updated_at: string;
}

export interface AlumniListItem {
  user_id: string;
  name: string;
  email: string;
  school_university: string;
  completed_hours: number;
  required_hours: number;
  archived_at: string | null;
  batch: { batch_id: string; name: string } | null;
}

export interface AlumniProfile {
  user: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    is_active?: boolean;
    departments?: Array<{ department_id: string; department_role: string }>;
  };
  internship: {
    profile_id: string;
    school_university: string;
    required_hours: number;
    completed_hours: number;
    days_worked: number;
    actual_end_date?: string | null;
    archived_at: string | null;
    archived_by: string | null;
    archive_override_reason: string | null;
  };
  batch: {
    batch_id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    notes: string | null;
  } | null;
  evaluations: AlumniEvaluation[];
}

export interface ArchiveCandidate {
  user_id: string;
  name: string;
  email: string;
  school_university: string;
  completed_hours: number;
  required_hours: number;
  assignment_status: string | null;
  evaluation_count: number;
}
