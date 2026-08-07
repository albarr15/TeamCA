// frontend/src/features/offboarding/components/ReadinessScorePanel.tsx
// Self-contained panel for the "Readiness Score" tab. Fetches its own data
// (mirrors ClearanceTimelinePanel's pattern) rather than relying on
// OffboardingPage to pre-fetch and pass it down.

import { useEffect, useState } from 'react';
import { readinessService } from '../../../services/readinessService';
import type { ReadinessBreakdown } from '../../../types/readiness';
import ReadinessScoreCard from './ReadinessScoreCard';

interface ReadinessScorePanelProps {
  isIntern: boolean;
  canReview: boolean;
  currentUserId: string;
}

export default function ReadinessScorePanel({
  isIntern,
  canReview,
  currentUserId,
}: ReadinessScorePanelProps) {
  const [data, setData] = useState<ReadinessBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const fetcher = isIntern
      ? readinessService.getMine()
      : canReview
        ? readinessService.getForUser(currentUserId)
        : Promise.reject(new Error('You do not have access to this view.'));

    fetcher
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load readiness score.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isIntern, canReview, currentUserId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading readiness score...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-500">No readiness data available.</p>;
  }

  return (
    <div className="max-w-md">
      <ReadinessScoreCard data={data} />
    </div>
  );
}