import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getRuns } from '../api';
import {
  Clock, CheckCircle2, XCircle, Ban, Loader2, GitBranch,
  Brain, BookOpen, Layers
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.04 } } };

const typeIcons = {
  brainstorm: Brain,
  chapter: BookOpen,
  full_book: Layers,
};
const typeColors = {
  brainstorm: 'from-amber-500 to-amber-400',
  chapter: 'from-cyan-500 to-cyan-400',
  full_book: 'from-violet-500 to-violet-400',
};
const statusIcons = {
  running: Loader2,
  retrying: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: Ban,
};
const statusColors = {
  running: 'text-amber-400',
  retrying: 'text-amber-400',
  completed: 'text-emerald-400',
  failed: 'text-rose-400',
  cancelled: 'text-base-400',
};
const statusBadges = {
  running: 'badge-running',
  retrying: 'badge-running',
  completed: 'badge-completed',
  failed: 'badge-failed',
  cancelled: 'badge-cancelled',
};

function getDuration(start, end) {
  if (!end) return '—';
  const ms = new Date(end) - new Date(start);
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function groupByDate(runs) {
  const groups = {};
  runs.forEach(run => {
    const date = new Date(run.started_at).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(run);
  });
  return groups;
}

export default function History() {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => getRuns(),
    refetchInterval: (query) => {
      const data = query.state.data || [];
      return data.some((run) => run.status === 'running' || run.status === 'retrying') ? 5000 : false;
    },
  });

  const grouped = groupByDate(runs);
  const totalCompleted = runs.filter(r => r.status === 'completed').length;
  const totalFailed = runs.filter(r => r.status === 'failed').length;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-display font-bold text-gradient-hero">History</h1>
        <p className="text-base-400 mt-1 text-sm">Complete production activity timeline</p>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={fadeUp} className="flex gap-4 flex-wrap">
        <div className="glass-subtle px-4 py-2.5 flex items-center gap-2.5">
          <GitBranch className="w-4 h-4 text-base-400" />
          <span className="text-sm font-medium text-base-200">{runs.length} total runs</span>
        </div>
        <div className="glass-subtle px-4 py-2.5 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-base-200">{totalCompleted} completed</span>
        </div>
        {totalFailed > 0 && (
          <div className="glass-subtle px-4 py-2.5 flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-medium text-base-200">{totalFailed} failed</span>
          </div>
        )}
      </motion.div>

      {/* Timeline */}
      {isLoading ? (
        <div className="glass p-16 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-base-400 mt-4 text-sm">Loading history...</p>
        </div>
      ) : runs.length === 0 ? (
        <motion.div variants={fadeUp} className="glass p-16 text-center">
          <Clock className="w-14 h-14 text-base-700 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-base-300 mb-2">No history yet</h3>
          <p className="text-base-500 text-sm">Start a production to see activity here</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, dateRuns]) => (
            <motion.div key={date} variants={fadeUp}>
              <h3 className="text-xs font-semibold text-base-500 uppercase tracking-wider mb-3 pl-10">{date}</h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[17px] top-0 bottom-0 w-px bg-gradient-to-b from-white/[0.08] to-transparent" />

                <div className="space-y-1">
                  {dateRuns.map((run, i) => {
                    const TypeIcon = typeIcons[run.workflow_type] || GitBranch;
                    const StatusIcon = statusIcons[run.status] || Clock;
                    const gradient = typeColors[run.workflow_type] || 'from-base-500 to-base-400';
                    const sColor = statusColors[run.status] || 'text-base-400';

                    return (
                      <div key={run.id} className="relative flex items-start gap-4 pl-0 group">
                        {/* Timeline dot */}
                        <div className={`relative z-10 w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                          <TypeIcon className="w-4 h-4 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 glass-subtle p-4 hover:bg-white/[0.04] transition-colors -mt-0.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="font-semibold text-sm text-base-100 capitalize">
                                {run.workflow_type.replace('_', ' ')}
                              </span>
                              <span className={statusBadges[run.status] || 'badge-pending'}>{run.status}</span>
                            </div>
                            <span className="text-[11px] text-base-500">
                              {new Date(run.started_at).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mt-1.5 text-[11px] text-base-500">
                            <span className="flex items-center gap-1">
                              <StatusIcon className={`w-3 h-3 ${sColor} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                              {run.current_step}
                            </span>
                            {run.completed_at && (
                              <span>Duration: {getDuration(run.started_at, run.completed_at)}</span>
                            )}
                          </div>

                          {run.error && (
                            <p className="mt-2 text-xs text-rose-400/80 bg-rose-500/10 rounded-lg px-3 py-1.5 border border-rose-500/15">
                              {run.error}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
