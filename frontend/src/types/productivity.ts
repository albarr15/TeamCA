export type ProductivitySummary = {
  user: { first_name: string; last_name: string };
  week: {
    start: string;
    end: string;
    hours_worked: number;
    target_hours: number;
    tasks_completed: number;
    days_clocked_in: number;
  };
  streak: {
    current_days: number;
    longest_days: number;
  };
  recent_completions: Array<{
    task_id: string;
    title: string;
    completed_at: string;
  }>;
  heatmap: Array<{ date: string; count: number }>;
  heatmap_weeks: number;
};
