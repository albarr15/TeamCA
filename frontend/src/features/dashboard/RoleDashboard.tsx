import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { taskService } from '../../services/taskService';
import { dtrService } from '../../services/dtrService';
import type { Task } from '../../types/task';
import type { DailyTimeRecord } from '../../types/dtr';
import type { User } from '../../types/user';
import StatCard from '../../components/widgets/StatCard';
import CalendarWidget from '../../components/widgets/CalendarWidget';
import DtrAnalyticsWidget from '../../components/widgets/DtrAnalyticsWidget';
import TaskBriefWidget from '../../components/widgets/TaskBriefWidget';
import MembersBriefWidget from '../../components/widgets/MembersBriefWidget';
import BatchesBriefWidget from '../../components/widgets/BatchesBriefWidget';
import InternProductivityHero from '../../components/widgets/InternProductivityHero';
import WeeklySummaryCard from '../../components/widgets/WeeklySummaryCard';
import RecentCompletionsCard from '../../components/widgets/RecentCompletionsCard';
import ContributionHeatmap from '../../components/widgets/ContributionHeatmap';
import { CalendarSkeleton, StatCardSkeleton } from '../../components/ui/Skeleton';
import { useUserDirectorySocket } from '../../hooks/useUserDirectorySocket';
import { useTaskListSocket } from '../../hooks/useTaskListSocket';
import { productivityService } from '../../services/productivityService';
import type { ProductivitySummary } from '../../types/productivity';

export default function RoleDashboard() {
  const { user, isIntern, canManageOwnDepartment, canViewAllDepartments } = useAuthStore((state) => ({
    user: state.user,
    isIntern: state.isIntern,
    canManageOwnDepartment: state.canManageOwnDepartment,
    canViewAllDepartments: state.canViewAllDepartments,
  }));

  const [tasks, setTasks] = useState<Task[]>([]);
  const [dtrRecords, setDtrRecords] = useState<DailyTimeRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productivity, setProductivity] = useState<ProductivitySummary | null>(null);
  const [productivityLoading, setProductivityLoading] = useState(true);

  const internView = !!user && isIntern();

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadDashboardData = async () => {
      setIsLoading(true);

      const [tasksResult, dtrResult, usersResult] = await Promise.allSettled([
        taskService.getTasks(),
        dtrService.getDTRRecords(),
        canViewAllDepartments() || canManageOwnDepartment() ? userService.getAllUsers() : Promise.resolve([]),
      ]);

      setTasks(tasksResult.status === 'fulfilled' ? tasksResult.value : []);
      setDtrRecords(dtrResult.status === 'fulfilled' ? dtrResult.value : []);
      setUsers(usersResult.status === 'fulfilled' ? usersResult.value : []);
      setIsLoading(false);
    };

    void loadDashboardData();
  }, [canManageOwnDepartment, canViewAllDepartments, user]);

  // Refresh user list silently when the directory changes
  const refreshUsers = useCallback(() => {
    if (!user) return;
    if (!canViewAllDepartments() && !canManageOwnDepartment()) return;
    void userService
      .getAllUsers()
      .then((latest) => setUsers(latest))
      .catch(() => {});
  }, [canManageOwnDepartment, canViewAllDepartments, user]);

  useUserDirectorySocket(refreshUsers);

  const refreshTasks = useCallback(() => {
    if (!user) return;
    void taskService
      .getTasks()
      .then((latest) => setTasks(latest))
      .catch(() => {});
  }, [user]);

  useTaskListSocket(refreshTasks);

  // Productivity summary: only fetched for interns (the only audience for these widgets)
  const refreshProductivity = useCallback(() => {
    if (!user || !internView) return;
    setProductivityLoading(true);
    productivityService
      .getMine()
      .then((data) => setProductivity(data))
      .catch(() => setProductivity(null))
      .finally(() => setProductivityLoading(false));
  }, [user, internView]);

  useEffect(() => {
    refreshProductivity();
  }, [refreshProductivity]);

  // Re-fetch productivity when tasks change (so completions update live)
  useTaskListSocket(refreshProductivity);

  const visibleTasks = useMemo(() => {
    if (!user) {
      return [];
    }

    if (canViewAllDepartments()) {
      return tasks;
    }

    return tasks.filter((task) => task.created_by === user.user_id || task.status !== 'Completed');
  }, [canViewAllDepartments, tasks, user]);

  const membersForBrief = useMemo(() => {
    if (!user) {
      return [];
    }

    if (canViewAllDepartments()) {
      return users;
    }

    if (canManageOwnDepartment()) {
      const currentDepartmentId = user.departments?.[0]?.department_id;
      if (!currentDepartmentId) {
        return [];
      }

      return users.filter((member) =>
        (member.departments ?? []).some((department) => String(department.department_id) === String(currentDepartmentId)),
      );
    }

    return [];
  }, [canManageOwnDepartment, canViewAllDepartments, user, users]);

  const totalOpenTasks = visibleTasks.filter((task) => task.status !== 'Completed').length;
  const completedTasks = visibleTasks.filter((task) => task.status === 'Completed').length;

  if (internView) {
    return (
      <div className="space-y-5">
        <InternProductivityHero
          summary={productivity}
          isLoading={productivityLoading}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <WeeklySummaryCard
            summary={productivity}
            isLoading={productivityLoading}
          />
          <RecentCompletionsCard
            summary={productivity}
            isLoading={productivityLoading}
          />
        </section>

        <ContributionHeatmap
          summary={productivity}
          isLoading={productivityLoading}
        />

        <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <DtrAnalyticsWidget records={dtrRecords} isLoading={isLoading} />
            <TaskBriefWidget tasks={visibleTasks} isLoading={isLoading} />
          </div>
          <div>{isLoading ? <CalendarSkeleton /> : <CalendarWidget />}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard label="Total Tasks" value={visibleTasks.length} />
            <StatCard label="Open Tasks" value={totalOpenTasks} />
            <StatCard label="Completed Tasks" value={completedTasks} />
            <StatCard label="DTR Records" value={dtrRecords.length} />
          </>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <DtrAnalyticsWidget records={dtrRecords} isLoading={isLoading} />
          <TaskBriefWidget tasks={visibleTasks} isLoading={isLoading} />

          {(canManageOwnDepartment() || canViewAllDepartments()) && !isIntern() ? (
            <MembersBriefWidget
              title={canViewAllDepartments() ? 'Company Members' : 'Department Members'}
              members={membersForBrief}
              isLoading={isLoading}
            />
          ) : null}

          {(user?.global_role === 'Superadmin' || user?.global_role === 'Admin') ? (
            <BatchesBriefWidget />
          ) : null}
        </div>

        <div>
          {isLoading ? <CalendarSkeleton /> : <CalendarWidget />}
        </div>
      </section>
    </div>
  );
}