import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProjects, getRuns } from '../api';
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
  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => getRuns(),
    refetchInterval: 3000,
  });

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
      {/* Header with Quick Actions */}
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient-hero">Dashboard</h1>
          <p className="text-base-400 mt-1 text-sm">Your AI-powered novel production pipeline</p>
        </div>
        <Link to="/produce" className="btn-primary flex items-center gap-2 group shadow-lg shadow-cyan-500/20">
          <Sparkles className="w-4 h-4 group-hover:animate-spin-slow" />
          <span>New Production</span>
        </Link>
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
        {/* Main Column: Active Productions & Series */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Productions */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-base-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Active Productions
              </h2>
              <Link to="/pipeline" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                View Pipeline <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {activeRuns.length === 0 ? (
              <div className="glass p-8 text-center flex flex-col items-center justify-center min-h-[160px]">
                <div className="w-12 h-12 rounded-full bg-base-800 flex items-center justify-center mb-3">
                  <Zap className="w-5 h-5 text-base-600" />
                </div>
                <p className="text-base-400 text-sm font-medium">No active productions</p>
                <p className="text-base-500 text-xs mt-1">Start a new workflow to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRuns.map(run => (
                  <motion.div key={run.id} className="glass p-4 flex items-center gap-4 group" whileHover={{ scale: 1.005 }}>
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-glow-pulse" />
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-amber-400 blur-sm opacity-50 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-base-100 capitalize">{run.workflow_type.replace('_', ' ')}</span>
                        <StatusBadge status={run.status} />
                      </div>
                      <p className="text-xs text-base-400 mt-0.5 truncate flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-base-600" />
                        Phase: <span className="text-cyan-400 font-medium">{run.current_step}</span>
                      </p>
                    </div>
                    {/* Phase progress bar */}
                    <div className="w-40 shrink-0 hidden sm:block">
                      <PhaseIndicator step={run.current_step} type={run.workflow_type} />
                    </div>
                    <Link to="/pipeline" className="btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Series List */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-base-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-400" /> Series Library
              </h2>
              <Link to="/library" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="glass p-8 text-center min-h-[140px] flex flex-col items-center justify-center">
                <Feather className="w-8 h-8 text-base-600 mx-auto mb-3" />
                <p className="text-sm text-base-400">Your library is empty</p>
                <Link to="/produce" className="text-xs text-cyan-400 hover:underline mt-2 inline-block">Create your first series</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.slice(0, 6).map(p => (
                  <Link key={p.id} to={`/library/${p.id}`} className="glass-subtle p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10 transition-colors">
                      <BookOpen className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-base-100 group-hover:text-cyan-400 transition-colors truncate">{p.name}</p>
                      <p className="text-[11px] text-base-500 truncate">{p.genre} • {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Side Column: Recent Activity & Quick Tips */}
        <div className="space-y-6">
          <motion.div variants={fadeUp} className="glass p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-display font-semibold text-base-100 uppercase tracking-wider">Recent Activity</h2>
              <Link to="/history" className="text-xs text-base-500 hover:text-base-300">View All</Link>
            </div>

            <div className="space-y-4">
              {recentCompleted.length > 0 ? (
                recentCompleted.map((run, i) => (
                  <div key={run.id} className="relative pl-4 pb-4 border-l border-white/10 last:pb-0">
                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-base-950 border border-emerald-500/50 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-base-200 capitalize">{run.workflow_type.replace('_', ' ')} Completed</p>
                      <p className="text-[10px] text-base-500">
                        {run.completed_at ? new Date(run.completed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-base-500 italic">No recent activity.</p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <h3 className="text-xs font-semibold text-base-200">Pro Tip</h3>
              </div>
              <p className="text-xs text-base-400 leading-relaxed">
                Set up different models for "Brainstorming" vs "Prose Writing" in Settings to optimize for creativity vs quality.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
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
