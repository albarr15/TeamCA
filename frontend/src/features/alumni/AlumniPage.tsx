import { useEffect, useState, type FormEvent } from "react";
import { alumniService, type EvaluationPayload } from "../../services/alumniService";
import type { AlumniListItem, AlumniProfile, ArchiveCandidate } from "../../types/alumni";
import { useAuthStore } from "../../store/authStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

const emptyEvaluation: EvaluationPayload = {
  summary: "",
  strengths: "",
  improvement_areas: "",
  recommendation: "",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
};

const fullName = (profile: AlumniProfile) =>
  `${profile.user.first_name ?? ""} ${profile.user.last_name ?? ""}`.trim() || profile.user.email;

export default function AlumniPage() {
  const currentUser = useAuthStore((state) => state.user);
  const canManage = currentUser?.global_role === "Admin" || currentUser?.global_role === "Superadmin" ||
    currentUser?.departments?.some((item) => item.department_role === "Head" || item.department_role === "Supervisor");

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AlumniListItem[]>([]);
  const [candidates, setCandidates] = useState<ArchiveCandidate[]>([]);
  const [selected, setSelected] = useState<AlumniProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationPayload>(emptyEvaluation);
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  const loadDirectory = async (query = search) => {
    try {
      setLoading(true);
      setError("");
      setItems(await alumniService.list(query));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load alumni directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDirectory(""); }, []);

  useEffect(() => {
    if (canManage) {
      alumniService.listCandidates().then(setCandidates).catch(() => setCandidates([]));
    }
  }, [canManage]);

  const openProfile = async (userId: string) => {
    try {
      setDetailLoading(true);
      setError("");
      setSelected(await alumniService.get(userId));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load alumni profile.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openCandidate = async (userId: string) => {
    try {
      setDetailLoading(true);
      setError("");
      setSelected(await alumniService.getCandidate(userId));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load archive candidate.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEvaluation = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    try {
      setSavingEvaluation(true);
      setError("");
      await alumniService.addEvaluation(selected.user.user_id, evaluation);
      setEvaluation(emptyEvaluation);
      setSelected(await alumniService.getCandidate(selected.user.user_id));
      setError("Evaluation saved.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save evaluation.");
    } finally {
      setSavingEvaluation(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
      <Card>
        <div className="border-b border-slate-100 p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Alumni Directory</h1>
          <p className="mt-1 text-sm text-slate-500">Search archived internship profiles and view their completed internship history.</p>
          <form className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); void loadDirectory(); }}>
            <Input aria-label="Search alumni" placeholder="Search by name, email, or school" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button type="submit">Search</Button>
          </form>
        </div>
        {error && <p className="mx-6 mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
        {canManage && candidates.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50 p-5">
            <h2 className="font-semibold text-slate-900">Interns awaiting archive</h2>
            <div className="mt-3 space-y-2">
              {candidates.map((candidate) => (
                <button key={candidate.user_id} type="button" onClick={() => void openCandidate(candidate.user_id)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-blue-300">
                  <span><span className="block text-sm font-medium text-slate-900">{candidate.name}</span><span className="block text-xs text-slate-500">{candidate.completed_hours} / {candidate.required_hours} hours · {candidate.assignment_status ?? "No batch status"}</span></span>
                  <span className="text-xs text-blue-600">Review</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="divide-y divide-slate-100">
          {loading ? <p className="p-6 text-sm text-slate-500">Loading alumni...</p> : items.length === 0 ? <p className="p-6 text-sm text-slate-500">No archived alumni found.</p> : items.map((item) => (
            <button key={item.user_id} type="button" onClick={() => void openProfile(item.user_id)} className="block w-full p-5 text-left transition hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.email}</p>
                  <p className="mt-2 text-sm text-slate-700">{item.school_university}{item.batch ? ` · ${item.batch.name}` : ""}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Archived</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">{item.completed_hours} / {item.required_hours} hours · archived {formatDate(item.archived_at)}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        {detailLoading ? <p className="p-6 text-sm text-slate-500">Loading profile...</p> : !selected ? <p className="p-6 text-sm text-slate-500">Select an alumnus to view their profile.</p> : (
          <div className="space-y-6 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{selected.internship.archived_at ? "Read-only alumni profile" : "Intern archive review"}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{fullName(selected)}</h2>
              <p className="text-sm text-slate-500">{selected.user.email}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="School / University" value={selected.internship.school_university} />
              <Detail label="Batch" value={selected.batch?.name || "Not assigned"} />
              <Detail label="Completed hours" value={`${selected.internship.completed_hours} / ${selected.internship.required_hours}`} />
              <Detail label="Days worked" value={String(selected.internship.days_worked)} />
              <Detail label="Internship end" value={formatDate(selected.internship.actual_end_date)} />
              <Detail label="Archived" value={formatDate(selected.internship.archived_at)} />
            </div>

            <section>
              <h3 className="font-semibold text-slate-900">Evaluations</h3>
              <div className="mt-3 space-y-3">
                {selected.evaluations.length === 0 ? <p className="text-sm text-slate-500">No evaluations recorded.</p> : selected.evaluations.map((item) => (
                  <div key={item.evaluation_id} className="rounded-lg border border-slate-200 p-4 text-sm">
                    <p className="text-xs text-slate-500">{item.evaluator ? `${item.evaluator.first_name ?? ""} ${item.evaluator.last_name ?? ""}`.trim() || item.evaluator.email : "Evaluator"} · {formatDate(item.created_at)}</p>
                    <p className="mt-2 font-medium text-slate-800">Summary</p><p className="whitespace-pre-wrap text-slate-700">{item.summary}</p>
                    <p className="mt-2 font-medium text-slate-800">Strengths</p><p className="whitespace-pre-wrap text-slate-700">{item.strengths}</p>
                    <p className="mt-2 font-medium text-slate-800">Areas for improvement</p><p className="whitespace-pre-wrap text-slate-700">{item.improvement_areas}</p>
                    <p className="mt-2 font-medium text-slate-800">Recommendation</p><p className="whitespace-pre-wrap text-slate-700">{item.recommendation}</p>
                  </div>
                ))}
              </div>
            </section>

            {canManage && !selected.internship.archived_at && (
              <section className="border-t border-slate-100 pt-5">
                <h3 className="font-semibold text-slate-900">Reviewer actions</h3>
                <form onSubmit={handleEvaluation} className="mt-3 space-y-3">
                  {(Object.keys(emptyEvaluation) as Array<keyof EvaluationPayload>).map((field) => (
                    <textarea key={field} required value={evaluation[field]} onChange={(event) => setEvaluation((current) => ({ ...current, [field]: event.target.value }))} placeholder={field.replaceAll("_", " ")} className="min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900" />
                  ))}
                  <Button type="submit" loading={savingEvaluation}>Save evaluation</Button>
                </form>
                <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4">
                  <p className="font-medium text-sky-900">Finish offboarding in the Offboarding Hub</p>
                  <p className="mt-1 text-sm text-sky-800">Add any needed evaluation here, then use Intern Approvals in the Offboarding Hub to complete the single archive workflow.</p>
                </div>
              </section>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-900">{value}</p></div>;
}
