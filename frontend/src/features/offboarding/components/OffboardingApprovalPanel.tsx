import { useCallback, useEffect, useState } from "react";
import { taskService } from "../../../services/taskService";
import type { OffboardingCandidate } from "../../../types/task";

export default function OffboardingApprovalPanel() {
  const [candidates, setCandidates] = useState<OffboardingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError("");
      setCandidates(await taskService.getOffboardingCandidates());
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load offboarding approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const approve = async (candidate: OffboardingCandidate) => {
    if (!window.confirm(`Approve ${candidate.name}'s offboarding and archive their internship profile?`)) return;
    try {
      setApprovingId(candidate.user_id);
      setError("");
      await taskService.approveOffboarding(candidate.user_id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to approve offboarding.");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Internship approvals</h2>
        <p className="mt-1 text-sm text-slate-500">Approving an eligible intern marks their batch membership completed and archives their internship profile.</p>
      </div>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {loading ? <p className="py-8 text-sm text-slate-500">Loading interns…</p> : candidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">No active interns are awaiting offboarding approval.</p>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <article key={candidate.user_id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{candidate.name}</h3>
                  <p className="text-sm text-slate-500">{candidate.email}</p>
                  <p className="mt-2 text-xs text-slate-500">{candidate.completed_hours} / {candidate.required_hours} required hours</p>
                </div>
                {candidate.ready || candidate.can_override_requirements ? (
                  <button type="button" onClick={() => void approve(candidate)} disabled={approvingId === candidate.user_id} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                    {approvingId === candidate.user_id
                      ? "Approving…"
                      : candidate.can_override_requirements
                        ? "Override requirements & archive"
                        : "Approve & archive"}
                  </button>
                ) : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Requirements incomplete</span>}
              </div>
              {candidate.can_override_requirements && <p className="mt-3 text-sm text-amber-700">Some requirements are incomplete. Your admin approval will override them and archive this profile.</p>}
              {!candidate.ready && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">{candidate.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
