// frontend/src/features/offboarding/components/OffboardingApprovalPanel.tsx
//
// "Intern Approvals" tab. Original responsibility: approve/archive interns
// whose offboarding requirements are met (unchanged below, still uses
// taskService).
//
// ADDED (Task 3 — Certificate Verification): once an intern is approved
// here, they disappear from the candidates list above (their
// BatchAssignment flips to "Completed", so they no longer match the
// "Active" filter that populates that list) — meaning there was previously
// no place in this panel to issue their certificate right after approving
// them. Two new sections below handle that:
//   1. "Ready for Certificate Issuance" — completed interns with no
//      certificate yet for their batch, with a one-click Issue action.
//   2. "Issued Certificates" — every certificate issued so far, with its
//      verification code, a QR image, and a Revoke action.
// Both are Admin/Superadmin only at the API level (see
// certificateRoutes.ts); this panel itself doesn't currently receive a
// role prop, so if your app's role-check convention differs from "just let
// the API 403 handle it silently", let me know and I'll thread an isAdmin
// prop through instead.

import { useCallback, useEffect, useState } from "react";
import { taskService } from "../../../services/taskService";
import type { OffboardingCandidate } from "../../../types/task";
import {
  listEligibleInterns,
  listCertificates,
  issueCertificate,
  revokeCertificate,
  getCertificateQrImageUrl,
} from "../../../services/certificateService";
import type {
  Certificate,
  CertificateEligibleIntern,
} from "../../../types/certificate";

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
      await loadCertificateSections();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to approve offboarding.");
    } finally {
      setApprovingId(null);
    }
  };

  // ── Certificate issuance (Task 3) ─────────────────────────────────────

  const [eligibleInterns, setEligibleInterns] = useState<CertificateEligibleIntern[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certLoading, setCertLoading] = useState(true);
  const [certError, setCertError] = useState("");
  const [issuingUserId, setIssuingUserId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [expandedQr, setExpandedQr] = useState<string | null>(null);

  const loadCertificateSections = useCallback(async () => {
    setCertLoading(true);
    try {
      setCertError("");
      const [interns, certs] = await Promise.all([listEligibleInterns(), listCertificates()]);
      setEligibleInterns(interns);
      setCertificates(certs);
    } catch (err: any) {
      setCertError(err?.response?.data?.message || "Failed to load certificate data.");
    } finally {
      setCertLoading(false);
    }
  }, []);

  useEffect(() => { void loadCertificateSections(); }, [loadCertificateSections]);

  const handleIssue = async (intern: CertificateEligibleIntern) => {
    if (!window.confirm(`Issue a certificate for ${intern.name} (${intern.batch_name})?`)) return;
    try {
      setIssuingUserId(intern.user_id);
      setCertError("");
      await issueCertificate(intern.user_id);
      await loadCertificateSections();
    } catch (err: any) {
      setCertError(err?.response?.data?.message || "Failed to issue certificate.");
    } finally {
      setIssuingUserId(null);
    }
  };

  const handleRevoke = async (certificate: Certificate) => {
    const reason = window.prompt(
      `Revoke the certificate for ${certificate.intern_name}? Optionally provide a reason:`,
    );
    if (reason === null) return; // cancelled
    try {
      setRevokingId(certificate._id);
      setCertError("");
      await revokeCertificate(certificate._id, reason || undefined);
      await loadCertificateSections();
    } catch (err: any) {
      setCertError(err?.response?.data?.message || "Failed to revoke certificate.");
    } finally {
      setRevokingId(null);
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

      {/* ── Ready for Certificate Issuance ──────────────────────────── */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="text-lg font-semibold text-slate-800">Ready for Certificate Issuance</h2>
        <p className="mt-1 text-sm text-slate-500">
          Interns whose offboarding is complete but who don't have a certificate yet.
        </p>

        {certError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {certError}
          </div>
        )}

        {certLoading ? (
          <p className="py-6 text-sm text-slate-500">Loading…</p>
        ) : eligibleInterns.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No interns are currently waiting on a certificate.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {eligibleInterns.map((intern) => (
              <div
                key={`${intern.user_id}-${intern.batch_id}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-medium text-slate-900">{intern.name}</h3>
                  <p className="text-sm text-slate-500">{intern.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{intern.batch_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleIssue(intern)}
                  disabled={issuingUserId === intern.user_id}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {issuingUserId === intern.user_id ? "Issuing…" : "Issue Certificate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Issued Certificates ──────────────────────────────────────── */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="text-lg font-semibold text-slate-800">Issued Certificates</h2>

        {certLoading ? (
          <p className="py-6 text-sm text-slate-500">Loading…</p>
        ) : certificates.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No certificates issued yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {certificates.map((cert) => {
              const isRevoked = cert.status === "revoked";
              const isQrOpen = expandedQr === cert._id;
              return (
                <div
                  key={cert._id}
                  className={`rounded-xl border p-4 ${
                    isRevoked ? "border-slate-200 bg-slate-50" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-medium ${isRevoked ? "text-slate-400" : "text-slate-900"}`}>
                          {cert.intern_name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isRevoked
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {isRevoked ? "Revoked" : "Active"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {cert.department_name} · {cert.batch_name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-600">{cert.verification_code}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Issued {new Date(cert.issued_at).toLocaleDateString()} by {cert.issued_by_name}
                      </p>
                      {isRevoked && cert.revoked_reason && (
                        <p className="mt-1 text-xs text-rose-600">Reason: {cert.revoked_reason}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedQr(isQrOpen ? null : cert._id)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {isQrOpen ? "Hide QR" : "Show QR"}
                      </button>
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => void handleRevoke(cert)}
                          disabled={revokingId === cert._id}
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {revokingId === cert._id ? "Revoking…" : "Revoke"}
                        </button>
                      )}
                    </div>
                  </div>
                  {isQrOpen && (
                    <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4">
                      <img
                        src={getCertificateQrImageUrl(cert.verification_code)}
                        alt={`QR code for ${cert.verification_code}`}
                        className="h-32 w-32 rounded-md border border-slate-200"
                      />
                      <p className="text-xs text-slate-500">
                        Scanning this opens the public verification page for this certificate.
                        Verification code: <span className="font-mono">{cert.verification_code}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}