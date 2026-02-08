import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight } from 'lucide-react';
import { getRuns } from '../api';

export default function ActiveRunBanner() {
  const { data: runs = [] } = useQuery({
    queryKey: ['runs', 'banner'],
    queryFn: () => getRuns(),
    refetchInterval: (query) => {
      const data = query.state.data || [];
      return data.some((run) => run.status === 'running' || run.status === 'retrying') ? 3000 : 6000;
    },
  });

  const active = runs.filter((run) => run.status === 'running' || run.status === 'retrying');
  if (active.length === 0) return null;

  const primary = active[0];
  const label = primary.workflow_type.replace('_', ' ');
  const detail = primary.current_step || 'starting';

  return (
    <div className="glass-strong border-cyan-500/20 px-4 py-3 mb-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-glow-pulse shrink-0" />
        <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-base-100 font-semibold">
            {active.length} active {active.length === 1 ? 'production' : 'productions'}
          </p>
          <p className="text-xs text-base-400 truncate">
            {label}: {detail}
          </p>
        </div>
      </div>
      <Link to="/pipeline" className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0">
        Open Pipeline <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
