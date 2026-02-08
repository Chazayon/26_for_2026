import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ActiveRunBanner from './ActiveRunBanner';
import RunStatusNotifier from './RunStatusNotifier';
import {
  LayoutDashboard, Library, Sparkles, GitBranch, Clock,
  Settings, Feather, Zap
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/produce', icon: Sparkles, label: 'New Production' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-base-950">
      <RunStatusNotifier />
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-violet-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-500/[0.02] rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="relative w-[260px] shrink-0 flex flex-col border-r border-white/[0.06] bg-base-900/80 backdrop-blur-xl z-10">
        {/* Logo */}
        <div className="p-5 pb-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-all duration-300">
              <Feather className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm text-base-50 tracking-tight">Novel Studio</h1>
              <p className="text-[10px] font-medium text-base-400 tracking-wider uppercase">Automation</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 mt-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'text-cyan-400'
                    : 'text-base-400 hover:text-base-100 hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/[0.15]"
                    transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <Icon className={`w-[18px] h-[18px] relative z-10 transition-colors ${isActive ? 'text-cyan-400' : 'text-base-500 group-hover:text-base-300'}`} />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 mx-3 mb-3 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.05]">
          <div className="flex items-center gap-2 text-[11px] text-base-400">
            <Zap className="w-3.5 h-3.5 text-cyan-500" />
            <span>LangGraph + OpenRouter</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
            <span className="text-[10px] text-emerald-400/80">System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="max-w-7xl mx-auto px-8 py-6"
          >
            <ActiveRunBanner />
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
