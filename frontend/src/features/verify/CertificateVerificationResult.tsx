// frontend/src/features/verify/CertificateVerificationResult.tsx
//
// Public-facing component — rendered on frontend/src/pages/verify/[code].astro.
// No authentication, no app shell/nav — this is meant to be reachable by
// anyone with a certificate's code or QR (employers, schools), completely
// outside the logged-in Offboarding Hub.
//
// Calls certificateService.verifyCertificate, which hits the public
// backend endpoint (GET /api/verify/:code) — no auth token required or sent.

import { useEffect, useState } from "react";
import { verifyCertificate } from "../../services/certificateService";
import type { PublicVerificationResult } from "../../types/certificate";

export default function CertificateVerificationResult({ code }: { code: string }) {
  const [result, setResult] = useState<PublicVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    verifyCertificate(code)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-slate-500">Verifying…</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">
          Something went wrong while verifying this certificate. Please try again later.
        </p>
      </div>
    );
  }

  if (result.status === "not_found") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <div className="mb-3 text-3xl">✕</div>
        <h1 className="text-lg font-semibold text-rose-800">Certificate not found</h1>
        <p className="mt-2 text-sm text-rose-700">
          The code <span className="font-mono">{result.verification_code}</span> doesn't match
          any issued certificate. Double-check the code, or contact the issuing organization.
        </p>
      </div>
    );
  }

  if (result.status === "revoked") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <div className="mb-3 text-3xl">⚠</div>
        <h1 className="text-lg font-semibold text-amber-800">Certificate revoked</h1>
        <p className="mt-2 text-sm text-amber-700">
          The certificate with code{" "}
          <span className="font-mono">{result.verification_code}</span> has been revoked and is
          no longer valid.
        </p>
      </div>
    );
  }

  // status === "valid"
  return (
    <div className="mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
      <div className="mb-3 text-3xl">✓</div>
      <h1 className="text-lg font-semibold text-emerald-800">Certificate verified</h1>
      <div className="mt-4 space-y-2 text-left text-sm">
        <Row label="Name" value={result.intern_name} />
        <Row label="Program" value={result.department_name} />
        <Row label="Batch" value={result.batch_name} />
        <Row label="Completion date" value={new Date(result.completion_date).toLocaleDateString()} />
        <Row label="Issued" value={new Date(result.issued_at).toLocaleDateString()} />
        <Row label="Verification code" value={result.verification_code} mono />
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-emerald-100 py-1.5">
      <span className="text-emerald-700">{label}</span>
      <span className={`font-medium text-emerald-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}