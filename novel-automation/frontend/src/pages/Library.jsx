import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProjects } from '../api';
import {
  BookOpen, Search, Clock, Library as LibIcon, Sparkles, Filter
} from 'lucide-react';

const statusMap = {
  created: 'badge-pending', brainstormed: 'badge-completed', brainstorming: 'badge-running',
  writing: 'badge-running', completed: 'badge-completed', failed: 'badge-failed',
};
function StatusBadge({ status }) {
  return <span className={statusMap[status] || 'badge-pending'}>{status}</span>;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

export default function Library() {
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('all');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const genres = [...new Set(projects.map(p => p.genre).filter(Boolean))];
  const filtered = projects.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.series_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesGenre = filterGenre === 'all' || p.genre === filterGenre;
    return matchesSearch && matchesGenre;
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient-hero">Library</h1>
          <p className="text-base-400 mt-1 text-sm">{projects.length} series in your collection</p>
        </div>
        <Link to="/produce" className="btn-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> New Series
        </Link>
      </motion.div>

      {/* Search & Filter */}
      <motion.div variants={fadeUp} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
          <input
            className="input-field pl-10"
            placeholder="Search series, books, genres..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {genres.length > 1 && (
          <select className="select-field w-48" value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
            <option value="all">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <div className="glass p-16 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-base-400 mt-4 text-sm">Loading library...</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={fadeUp} className="glass p-16 text-center">
          <LibIcon className="w-14 h-14 text-base-700 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-base-300 mb-2">
            {search ? 'No matches found' : 'Your library is empty'}
          </h3>
          <p className="text-base-500 text-sm mb-6">
            {search ? 'Try a different search term' : 'Create your first series to get started'}
          </p>
          {!search && (
            <Link to="/produce" className="btn-primary inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Create Series
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => (
            <motion.div key={project.id} variants={fadeUp}>
              <Link
                to={`/library/${project.id}`}
                className="glass group block p-5 hover:bg-white/[0.06] transition-all duration-300 hover:border-cyan-500/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/10 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-cyan-500/30 transition-all">
                    <BookOpen className="w-5 h-5 text-violet-400" />
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                <h3 className="font-display font-semibold text-base-50 group-hover:text-cyan-400 transition-colors text-lg leading-tight">
                  {project.name}
                </h3>
                {project.series_name && (
                  <p className="text-xs text-violet-400/80 mt-1 font-medium">{project.series_name}</p>
                )}
                <p className="text-sm text-base-400 mt-2 line-clamp-2 leading-relaxed">
                  {project.description || project.idea_text || 'No description'}
                </p>

                <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center gap-4 text-[11px] text-base-500">
                  <span className="badge-violet">{project.genre}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
