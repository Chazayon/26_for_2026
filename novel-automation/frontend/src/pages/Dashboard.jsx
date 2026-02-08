import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProjects, getRuns, getBooks, getChapters } from '../api';
import {
  BookOpen, CheckCircle2, Sparkles, Activity, ArrowRight,
  TrendingUp, FileText, Feather, Zap, BarChart3
} from 'lucide-react';

const statusMap = {
  created: 'badge-pending', brainstorming: 'badge-running', brainstormed: 'badge-completed',
  outlining: 'badge-running', writing: 'badge-running', completed: 'badge-completed',
  running: 'badge-running', failed: 'badge-failed', cancelled: 'badge-cancelled', pending: 'badge-pending',
};
function StatusBadge({ status }) {
  return <span className={statusMap[status] || 'badge-pending'}>{status}</span>;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function Dashboard() {
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
  const { data: runs = [] } = useQuery({ queryKey: ['runs'], queryFn: () => getRuns(), refetchInterval: 5000 });

  const activeRuns = runs.filter(r => r.status === 'running');
  const completedRuns = runs.filter(r => r.status === 'completed');
  const recentCompleted = completedRuns.slice(0, 4);
  const totalChaptersCompleted = completedRuns.filter(r => r.workflow_type === 'chapter').length;

  const stats = [
    { label: 'Series', value: projects.length, icon: BookOpen, color: 'from-cyan-500 to-cyan-400', glow: 'shadow-cyan-500/20' },
    { label: 'Active Productions', value: activeRuns.length, icon: Activity, color: 'from-amber-500 to-amber-400', glow: 'shadow-amber-500/20' },
    { label: 'Chapters Done', value: totalChaptersCompleted, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-400', glow: 'shadow-emerald-500/20' },
    { label: 'Total Runs', value: runs.length, icon: BarChart3, color: 'from-violet-500 to-violet-400', glow: 'shadow-violet-500/20' },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-display font-bold text-gradient-hero">Dashboard</h1>
        <p className="text-base-400 mt-1 text-sm">Your AI-powered novel production pipeline</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, glow }) => (
          <motion.div
            key={label}
            whileHover={{ y: -2, scale: 1.01 }}
            className={`glass p-5 flex items-center gap-4 hover:${glow} hover:shadow-lg transition-shadow`}
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${glow}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-base-50">{value}</p>
              <p className="text-xs text-base-400 font-medium">{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Productions */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-base-100">Active Productions</h2>
            <Link to="/pipeline" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View Pipeline <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {activeRuns.length === 0 ? (
            <div className="glass p-10 text-center">
              <Zap className="w-10 h-10 text-base-600 mx-auto mb-3" />
              <p className="text-base-400 text-sm">No active productions</p>
              <Link to="/produce" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
                <Sparkles className="w-4 h-4" /> Start Production
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRuns.map(run => (
                <motion.div key={run.id} className="glass p-4 flex items-center gap-4" whileHover={{ scale: 1.005 }}>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-glow-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-base-100 capitalize">{run.workflow_type.replace('_', ' ')}</span>
                      <StatusBadge status={run.status} />
                    </div>
                    <p className="text-xs text-base-400 mt-0.5 truncate">
                      Phase: <span className="text-cyan-400">{run.current_step}</span>
                    </p>
                  </div>
                  {/* Phase progress bar */}
                  <div className="w-32 shrink-0">
                    <PhaseIndicator step={run.current_step} type={run.workflow_type} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Series Progress */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-base-100">Series</h2>
            <Link to="/library" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Library <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="glass p-8 text-center">
              <Feather className="w-8 h-8 text-base-600 mx-auto mb-3" />
              <p className="text-sm text-base-400">No series yet</p>
              <Link to="/produce" className="text-xs text-cyan-400 hover:underline mt-2 inline-block">Create one</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 6).map(p => (
                <Link key={p.id} to={`/library/${p.id}`} className="glass-subtle p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-base-100 group-hover:text-cyan-400 transition-colors truncate">{p.name}</p>
                    <p className="text-[11px] text-base-500">{p.genre}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Completions */}
      {recentCompleted.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-base-100">Recent Completions</h2>
            <Link to="/history" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Full History <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentCompleted.map(run => (
              <div key={run.id} className="glass-subtle p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-base-100 capitalize">{run.workflow_type.replace('_', ' ')}</span>
                </div>
                <p className="text-[11px] text-base-500">{run.current_step}</p>
                <p className="text-[11px] text-base-500">
                  {run.completed_at ? new Date(run.completed_at).toLocaleString() : '—'}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function PhaseIndicator({ step, type }) {
  const phases = type === 'brainstorm'
    ? ['brainstorm_expand', 'brainstorm_refine', 'done']
    : ['assemble_context', 'generate_scene_brief', 'review_scene_brief', 'generate_prose', 'review_prose', 'finalize_chapter', 'done'];
  const currentIdx = phases.indexOf(step);
  const progress = currentIdx >= 0 ? ((currentIdx + 1) / phases.length) * 100 : 10;

  return (
    <div className="space-y-1">
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[10px] text-base-500 text-right">{Math.round(progress)}%</p>
    </div>
  );
}
