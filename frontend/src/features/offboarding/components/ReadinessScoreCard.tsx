// frontend/src/features/offboarding/components/ReadinessScoreCard.tsx
import type { ReadinessBreakdown, ReadinessState } from '../../../types/readiness';

const STATE_STYLES: Record<ReadinessState, { text: string; bar: string; label: string }> = {
  'Not Ready': { text: 'text-red-700', bar: 'bg-red-500', label: '🔴 Not Ready' },
  'Almost Ready': { text: 'text-yellow-700', bar: 'bg-yellow-500', label: '🟡 Almost Ready' },
  Eligible: { text: 'text-green-700', bar: 'bg-green-500', label: '🟢 Eligible' },
};

interface ReadinessScoreCardProps {
  data: ReadinessBreakdown;
}

export default function ReadinessScoreCard({ data }: ReadinessScoreCardProps) {
  const style = STATE_STYLES[data.state];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold">{data.overallScore}%</span>
        <span className={`text-sm font-semibold ${style.text}`}>{style.label}</span>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${style.bar}`}
          style={{ width: `${data.overallScore}%` }}
        />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs text-gray-600">
        <div>
          <dt className="font-medium">Hours</dt>
          <dd>
            {data.hoursScore}% ({data.details.renderedHours}/{data.details.requiredHours}h)
          </dd>
        </div>
        <div>
          <dt className="font-medium">Tasks</dt>
          <dd>
            {data.taskScore}% ({data.details.tasksCompleted}/{data.details.tasksTotal})
          </dd>
        </div>
        <div>
          <dt className="font-medium">Attendance</dt>
          <dd>{data.attendanceScore}%</dd>
        </div>
        <div>
          <dt className="font-medium">Deliverables</dt>
          <dd>
            {data.deliverablesScore}% ({data.details.deliverablesApproved}/
            {data.details.deliverablesTotal})
          </dd>
        </div>
      </dl>
    </div>
  );
}