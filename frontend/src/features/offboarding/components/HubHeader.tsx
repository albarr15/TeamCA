// frontend/src/features/offboarding/components/HubHeader.tsx
// Page header for the Offboarding Hub.
// Matches the standard slate-based header style used across the rest of the app
// (e.g. Batches, Users pages): plain h1 + subtitle, no decorative gradients.

interface HubHeaderProps {
  roleLabel: string;
}

export default function HubHeader({ roleLabel }: HubHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Offboarding Hub</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your internship offboarding process
        </p>
      </div>

      {/* Role badge — consistent with how other pages surface context */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        {roleLabel}
      </span>
    </div>
  );
}
