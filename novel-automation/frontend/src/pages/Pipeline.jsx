import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getRuns, getRun, cancelRun } from '../api';
import {
  GitBranch, XCircle, CheckCircle2, Loader2, Clock,
  ChevronDown, ChevronRight, AlertTriangle, Ban, RefreshCw,
  ArrowRight, Zap
} from 'lucide-react';

const CHAPTER_PHASES = [
  { key: 'assemble_context', label: 'Context', icon: '📦' },
  { key: 'generate_scene_brief', label: 'Brief Gen', icon: '📝' },
  { key: 'review_scene_brief', label: 'Brief Review', icon: '🔍' },
  { key: 'generate_prose', label: 'Prose Gen', icon: '✍️' },
  { key: 'review_prose', label: 'Prose Review', icon: '🔍' },
  { key: 'finalize_chapter', label: 'Finalize', icon: '✅' },
];

const BRAINSTORM_PHASES = [
  { key: 'brainstorm_expand', label: 'Expand', icon: '💡' },
  { key: 'brainstorm_refine', label: 'Refine', icon: '✨' },
];

const statusMap = {
  running: 'badge-running', completed: 'badge-completed',
  failed: 'badge-failed', cancelled: 'badge-cancelled',
};

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [expandedRun, setExpandedRun] = useState(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => getRuns(),
    refetchInterval: (query) => {
      const data = query.state.data || [];
      return data.some((run) => run.status === 'running') ? 3000 : false;
    },
  });

  const { data: runDetail } = useQuery({
    queryKey: ['run', expandedRun],
    queryFn: () => getRun(expandedRun),
    enabled: !!expandedRun,
    refetchInterval: (query) => {
      return query.state.data?.status === 'running' ? 3000 : false;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelRun,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['runs'] }),
  });

  const activeRuns = runs.filter(r => r.status === 'running');
  const otherRuns = runs.filter(r => r.status !== 'running');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-display font-bold text-gradient-hero">Pipeline</h1>
        <p className="text-base-400 mt-1 text-sm">Monitor and control your production workflows</p>
      </motion.div>

      {/* Active Productions */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-display font-semibold text-base-100 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Active Productions
          {activeRuns.length > 0 && (
            <span className="badge-running ml-2">{activeRuns.length} running</span>
          )}
        </h2>

        {activeRuns.length === 0 ? (
          <div className="glass p-12 text-center">
            <GitBranch className="w-10 h-10 text-base-600 mx-auto mb-3" />
            <p className="text-base-400 text-sm">No active productions right now</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeRuns.map(run => (
              <ActiveRunCard
                key={run.id}
                run={run}
                expanded={expandedRun === run.id}
                onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                detail={expandedRun === run.id ? runDetail : null}
                onCancel={() => cancelMutation.mutate(run.id)}
                cancelling={cancelMutation.isPending}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Completed / Failed */}
      {otherRuns.length > 0 && (
        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-display font-semibold text-base-100 mb-4">Recent Runs</h2>
          <div className="space-y-2">
            {otherRuns.slice(0, 10).map(run => (
              <CompletedRunRow
                key={run.id}
                run={run}
                expanded={expandedRun === run.id}
                onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                detail={expandedRun === run.id ? runDetail : null}
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ActiveRunCard({ run, expanded, onToggle, detail, onCancel, cancelling }) {
  const phases = run.workflow_type === 'brainstorm' ? BRAINSTORM_PHASES : CHAPTER_PHASES;
  const currentIdx = phases.findIndex(p => p.key === run.current_step);

  return (
    <div className="glass glow-cyan overflow-hidden">
      {/* Phase tracker */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-glow-pulse" />
            <h3 className="font-display font-semibold text-base-50 capitalize">
              {run.workflow_type.replace('_', ' ')}
            </h3>
            <span className="badge-running">{run.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} disabled={cancelling} className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" /> {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        </div>

        {/* Visual phase tracker */}
        <div className="flex items-center gap-1">
          {phases.map((phase, i) => {
            const isComplete = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isFuture = i > currentIdx;
            return (
              <div key={phase.key} className="flex items-center gap-1 flex-1">
                <motion.div
                  className={`flex-1 relative rounded-xl p-3 text-center transition-all ${
                    isCurrent ? 'bg-cyan-500/15 border border-cyan-500/30 glow-cyan' :
                    isComplete ? 'bg-emerald-500/10 border border-emerald-500/20' :
                    'bg-white/[0.02] border border-white/[0.04]'
                  }`}
                  animate={isCurrent ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <div className="text-lg mb-1">{phase.icon}</div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isCurrent ? 'text-cyan-400' : isComplete ? 'text-emerald-400' : 'text-base-500'
                  }`}>{phase.label}</p>
                  {isCurrent && (
                    <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-400 rounded-full" />
                  )}
                </motion.div>
                {i < phases.length - 1 && (
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isComplete ? 'text-emerald-500' : 'text-base-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Revision loop indicator */}
        {(run.current_step === 'review_scene_brief' || run.current_step === 'review_prose') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-3"
          >
            <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
            <div>
              <p className="text-xs font-semibold text-violet-300">Revision Loop Active</p>
              <p className="text-[11px] text-base-400">Orchestrator reviewing — may request revisions (max 3)</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Expandable logs */}
      <button onClick={onToggle} className="w-full px-5 py-2 border-t border-white/[0.05] flex items-center justify-center gap-2 text-xs text-base-400 hover:text-base-200 hover:bg-white/[0.02] transition-colors">
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {expanded ? 'Hide' : 'Show'} Logs
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <LogViewer logs={detail?.logs || run.logs} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompletedRunRow({ run, expanded, onToggle, detail }) {
  const StatusIcon = run.status === 'completed' ? CheckCircle2 :
                     run.status === 'failed' ? XCircle :
                     run.status === 'cancelled' ? Ban : Clock;
  const statusColor = run.status === 'completed' ? 'text-emerald-400' :
                      run.status === 'failed' ? 'text-rose-400' :
                      run.status === 'cancelled' ? 'text-base-400' : 'text-amber-400';

  return (
    <div className="glass-subtle overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left">
        <StatusIcon className={`w-5 h-5 ${statusColor} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-base-100 capitalize">{run.workflow_type.replace('_', ' ')}</span>
            <span className={statusMap[run.status] || 'badge-pending'}>{run.status}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-base-500 mt-0.5">
            <span>Step: {run.current_step}</span>
            <span>{new Date(run.started_at).toLocaleString()}</span>
            {run.completed_at && <span>Duration: {getDuration(run.started_at, run.completed_at)}</span>}
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-base-500" /> : <ChevronRight className="w-4 h-4 text-base-500" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {run.error && (
              <div className="mx-4 mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
                {run.error}
              </div>
            )}
            <LogViewer logs={detail?.logs || run.logs} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LogViewer({ logs = [] }) {
  return (
    <div className="bg-base-950/60 border-t border-white/[0.04] p-4 max-h-64 overflow-auto">
      {logs.length > 0 ? (
        logs.map((log, i) => (
          <div key={i} className="flex gap-3 py-0.5">
            <span className="text-[11px] font-mono text-base-600 shrink-0 w-5 text-right">{i + 1}</span>
            <span className="text-[11px] font-mono text-emerald-400/80 leading-relaxed">{log}</span>
          </div>
        ))
      ) : (
        <p className="text-[11px] font-mono text-base-600">No logs recorded yet...</p>
      )}
    </div>
  );
}

function getDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}
