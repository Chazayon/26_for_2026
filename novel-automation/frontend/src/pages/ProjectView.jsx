import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  getProject, getBooks, createBook, deleteBook,
  getChapters, createChapter, deleteChapter,
  getCallsheets, createCallsheet, deleteCallsheet,
  startBrainstorm, startChapterRun, startBookRun, cancelRun,
  getRuns, updateProject,
} from '../api';
import { useToast } from '../components/ToastProvider';
import {
  BookOpen, Plus, Play, Trash2, ChevronRight, ChevronDown,
  Users, Brain, Scroll, ArrowLeft, Eye, PenTool, Save, Ban, ExternalLink
} from 'lucide-react';

const statusMap = {
  created: 'badge-pending', pending: 'badge-pending', brainstormed: 'badge-completed',
  completed: 'badge-completed', running: 'badge-running', writing: 'badge-running',
  brief_generating: 'badge-running', prose_generating: 'badge-running', retrying: 'badge-running',
  brief_review: 'badge-running', prose_review: 'badge-running',
  awaiting_human_review: 'badge-pending', needs_revision: 'badge-failed',
  failed: 'badge-failed', cancelled: 'badge-cancelled',
};
function StatusBadge({ status }) {
  return <span className={statusMap[status] || 'badge-pending'}>{status}</span>;
}

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ProjectView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedBook, setExpandedBook] = useState(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(null);
  const [showAddCallsheet, setShowAddCallsheet] = useState(false);

  const { data: project, isLoading } = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId) });
  const { data: books = [] } = useQuery({ queryKey: ['books', projectId], queryFn: () => getBooks(projectId) });
  const { data: callsheets = [] } = useQuery({ queryKey: ['callsheets', projectId], queryFn: () => getCallsheets(projectId) });
  const { data: runs = [] } = useQuery({
    queryKey: ['runs', projectId],
    queryFn: () => getRuns(projectId),
    refetchInterval: (query) => {
      const data = query.state.data || [];
      return data.some((run) => run.status === 'running' || run.status === 'retrying') ? 3000 : false;
    },
  });

  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get('tab');
    if (requestedTab && ['overview', 'books', 'callsheets', 'bible', 'runs'].includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [location.search]);

  const brainstormMutation = useMutation({
    mutationFn: () => startBrainstorm(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', projectId] });
      setActiveTab('runs');
      toast({ type: 'success', title: 'Brainstorm started', message: 'Track progress in Workflow Runs.' });
    },
    onError: (error) => toast({ type: 'error', title: 'Could not start brainstorm', message: error.message }),
  });
  const addBookMutation = useMutation({
    mutationFn: (data) => createBook(projectId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['books', projectId] }); setShowAddBook(false); },
  });
  const deleteBookMutation = useMutation({
    mutationFn: (bookId) => deleteBook(projectId, bookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books', projectId] }),
  });
  const bookRunMutation = useMutation({
    mutationFn: (bookId) => startBookRun(projectId, bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', projectId] });
      setActiveTab('runs');
      toast({ type: 'success', title: 'Book production started', message: 'Live updates are now available.' });
    },
    onError: (error) => toast({ type: 'error', title: 'Could not start book run', message: error.message }),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', projectId] });
      toast({ type: 'info', title: 'Generation cancelled', message: 'The run was stopped.' });
    },
    onError: (error) => toast({ type: 'error', title: 'Cancel failed', message: error.message }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" /></div>;
  if (!project) return <div className="text-center py-12 text-rose-400">Project not found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'books', label: 'Books & Chapters', icon: BookOpen },
    { id: 'callsheets', label: 'Voice Callsheets', icon: Users },
    { id: 'bible', label: 'Story Bible', icon: Scroll },
    { id: 'runs', label: 'Workflow Runs', icon: Play },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/library')} className="text-xs text-base-400 hover:text-cyan-400 flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Library
          </button>
          <h1 className="text-2xl font-display font-bold text-base-50 flex items-center gap-3">
            {project.name}
            <StatusBadge status={project.status} />
          </h1>
          {project.series_name && <p className="text-base-400 text-sm mt-1">{project.series_name} &middot; {project.genre}</p>}
        </div>
        <div className="flex gap-2">
          {(project.input_type === 'idea' || project.status === 'created') && (
            <button onClick={() => brainstormMutation.mutate()} disabled={brainstormMutation.isPending} className="btn-primary flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4" /> {brainstormMutation.isPending ? 'Starting...' : 'Brainstorm'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] relative">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id ? 'text-cyan-400' : 'text-base-400 hover:text-base-200'
            }`}
          >
            {activeTab === id && (
              <motion.div layoutId="projectTab" className="absolute inset-x-0 -bottom-px h-0.5 bg-cyan-500 rounded-full" />
            )}
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab project={project} books={books} runs={runs} />}
      {activeTab === 'books' && (
        <BooksTab projectId={projectId} books={books} expandedBook={expandedBook} setExpandedBook={setExpandedBook}
          showAddBook={showAddBook} setShowAddBook={setShowAddBook} showAddChapter={showAddChapter} setShowAddChapter={setShowAddChapter}
          addBookMutation={addBookMutation} deleteBookMutation={deleteBookMutation} bookRunMutation={bookRunMutation} queryClient={queryClient} />
      )}
      {activeTab === 'callsheets' && <CallsheetsTab projectId={projectId} callsheets={callsheets} showAdd={showAddCallsheet} setShowAdd={setShowAddCallsheet} queryClient={queryClient} />}
      {activeTab === 'bible' && <BibleTab project={project} projectId={projectId} queryClient={queryClient} />}
      {activeTab === 'runs' && <RunsTab runs={runs} onCancel={(runId) => cancelMutation.mutate(runId)} cancelling={cancelMutation.isPending} />}
    </motion.div>
  );
}

function OverviewTab({ project, books, runs }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass p-5 space-y-4">
        <h3 className="font-display font-semibold text-base-100">Details</h3>
        <div className="space-y-2.5 text-sm">
          <Row label="Genre" value={project.genre} />
          <Row label="Input" value={project.input_type} />
          <Row label="Status" value={<StatusBadge status={project.status} />} />
          <Row label="Created" value={new Date(project.created_at).toLocaleString()} />
        </div>
        {project.idea_text && (
          <div>
            <p className="text-[11px] text-base-500 uppercase tracking-wider font-semibold mb-1.5">Idea</p>
            <p className="text-sm text-base-200 bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">{project.idea_text}</p>
          </div>
        )}
        {project.ship_vibes && (
          <div>
            <p className="text-[11px] text-base-500 uppercase tracking-wider font-semibold mb-1.5">Ship Vibes</p>
            <p className="text-sm text-base-200 bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">{project.ship_vibes}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="glass p-5">
          <h3 className="font-display font-semibold text-base-100 mb-3">Books</h3>
          {books.length === 0 ? <p className="text-sm text-base-500">No books yet.</p> : (
            <div className="space-y-2">
              {books.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-sm font-medium text-base-200">{b.title}</span>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass p-5">
          <h3 className="font-display font-semibold text-base-100 mb-3">Recent Runs</h3>
          {runs.length === 0 ? <p className="text-sm text-base-500">No runs yet.</p> : (
            <div className="space-y-2">
              {runs.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-sm text-base-200 capitalize">{r.workflow_type.replace('_', ' ')}</span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-base-400">{label}</span>
      <span className="text-base-100 font-medium">{value}</span>
    </div>
  );
}

function BooksTab({ projectId, books, expandedBook, setExpandedBook, showAddBook, setShowAddBook, showAddChapter, setShowAddChapter, addBookMutation, deleteBookMutation, bookRunMutation, queryClient }) {
  const [bookForm, setBookForm] = useState({ title: '', book_number: books.length + 1, outline: '' });

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display font-semibold text-base-100">Books & Chapters</h3>
        <button onClick={() => setShowAddBook(!showAddBook)} className="btn-secondary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Book
        </button>
      </div>

      <AnimatePresence>
        {showAddBook && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => { e.preventDefault(); addBookMutation.mutate(bookForm); setBookForm({ title: '', book_number: books.length + 2, outline: '' }); }}
            className="glass p-4 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" placeholder="Book Title" value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} required />
              <input className="input-field" type="number" placeholder="Book #" value={bookForm.book_number} onChange={e => setBookForm({ ...bookForm, book_number: parseInt(e.target.value) })} />
            </div>
            <textarea className="textarea-field font-mono text-xs" placeholder="Book outline (chapter breakdown)..." value={bookForm.outline} onChange={e => setBookForm({ ...bookForm, outline: e.target.value })} rows={4} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddBook(false)} className="btn-ghost text-sm">Cancel</button>
              <button type="submit" className="btn-primary text-sm" disabled={addBookMutation.isPending}>Add Book</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {books.length === 0 ? (
        <div className="glass p-10 text-center">
          <BookOpen className="w-10 h-10 text-base-600 mx-auto mb-3" />
          <p className="text-base-400 text-sm">No books yet. Add one manually or run Brainstorm.</p>
        </div>
      ) : (
        books.map(book => (
          <BookCard key={book.id} projectId={projectId} book={book} expanded={expandedBook === book.id}
            onToggle={() => setExpandedBook(expandedBook === book.id ? null : book.id)}
            showAddChapter={showAddChapter === book.id} setShowAddChapter={(v) => setShowAddChapter(v ? book.id : null)}
            onDelete={() => deleteBookMutation.mutate(book.id)} onRunBook={() => bookRunMutation.mutate(book.id)} queryClient={queryClient} />
        ))
      )}
    </motion.div>
  );
}

function BookCard({ projectId, book, expanded, onToggle, showAddChapter, setShowAddChapter, onDelete, onRunBook, queryClient }) {
  const { toast } = useToast();
  const { data: chapters = [] } = useQuery({ queryKey: ['chapters', projectId, book.id], queryFn: () => getChapters(projectId, book.id), enabled: expanded });
  const [chForm, setChForm] = useState({ chapter_number: 1, title: '', pov_character: '', plot_summary: '', character_list: '', location: '' });
  const addChapterMut = useMutation({
    mutationFn: (data) => createChapter(projectId, book.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chapters', projectId, book.id] }); setShowAddChapter(false); setChForm({ ...chForm, chapter_number: chForm.chapter_number + 1, title: '', pov_character: '', plot_summary: '', character_list: '', location: '' }); },
  });
  const chRunMut = useMutation({
    mutationFn: (cid) => startChapterRun(projectId, book.id, cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', projectId] });
      toast({ type: 'success', title: 'Chapter generation started', message: 'Follow progress in Workflow Runs.' });
    },
    onError: (error) => toast({ type: 'error', title: 'Could not start chapter run', message: error.message }),
  });
  const chDelMut = useMutation({ mutationFn: (cid) => deleteChapter(projectId, book.id, cid), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters', projectId, book.id] }) });

  return (
    <div className="glass overflow-hidden">
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-base-400" /> : <ChevronRight className="w-4 h-4 text-base-400" />}
          <div>
            <h4 className="font-semibold text-base-100">Book {book.book_number}: {book.title}</h4>
            <p className="text-[11px] text-base-500">{chapters.length > 0 ? `${chapters.length} chapters` : 'No chapters'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <StatusBadge status={book.status} />
          <button onClick={onRunBook} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"><Play className="w-3 h-3" /> Run</button>
          <button onClick={onDelete} className="p-1.5 text-base-500 hover:text-rose-400 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-white/[0.05] p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-base-300">Chapters</span>
                <button onClick={() => setShowAddChapter(!showAddChapter)} className="text-xs btn-ghost flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
              </div>
              {showAddChapter && (
                <form onSubmit={(e) => { e.preventDefault(); addChapterMut.mutate(chForm); }} className="bg-white/[0.02] rounded-xl p-3 space-y-2 border border-white/[0.04]">
                  <div className="grid grid-cols-3 gap-2">
                    <input className="input-field text-sm" type="number" placeholder="Ch #" value={chForm.chapter_number} onChange={e => setChForm({ ...chForm, chapter_number: parseInt(e.target.value) })} />
                    <input className="input-field text-sm" placeholder="Title" value={chForm.title} onChange={e => setChForm({ ...chForm, title: e.target.value })} />
                    <input className="input-field text-sm" placeholder="POV Character" value={chForm.pov_character} onChange={e => setChForm({ ...chForm, pov_character: e.target.value })} />
                  </div>
                  <textarea className="textarea-field text-sm" placeholder="Plot summary..." value={chForm.plot_summary} onChange={e => setChForm({ ...chForm, plot_summary: e.target.value })} rows={2} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input-field text-sm" placeholder="Characters" value={chForm.character_list} onChange={e => setChForm({ ...chForm, character_list: e.target.value })} />
                    <input className="input-field text-sm" placeholder="Location" value={chForm.location} onChange={e => setChForm({ ...chForm, location: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddChapter(false)} className="btn-ghost text-xs">Cancel</button>
                    <button type="submit" className="btn-primary text-xs" disabled={addChapterMut.isPending}>Add</button>
                  </div>
                </form>
              )}
              {chapters.length === 0 ? <p className="text-sm text-base-500 text-center py-4">No chapters yet</p> : (
                <div className="space-y-1">
                  {chapters.map(ch => (
                    <div key={ch.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] group transition-colors">
                      <Link to={`/library/${projectId}/books/${book.id}/chapters/${ch.id}`} className="flex-1 flex items-center gap-3">
                        <span className="text-xs font-mono text-base-500 w-8">#{ch.chapter_number}</span>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-base-200">{ch.title || `Chapter ${ch.chapter_number}`}</span>
                          {ch.pov_character && <span className="text-xs text-base-500 ml-2">({ch.pov_character})</span>}
                        </div>
                        {ch.word_count > 0 && <span className="text-xs text-base-500">{ch.word_count.toLocaleString()} words</span>}
                        <StatusBadge status={ch.status} />
                      </Link>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button onClick={() => chRunMut.mutate(ch.id)} className="p-1 text-base-500 hover:text-cyan-400 rounded"><Play className="w-3.5 h-3.5" /></button>
                        <button onClick={() => chDelMut.mutate(ch.id)} className="p-1 text-base-500 hover:text-rose-400 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CallsheetsTab({ projectId, callsheets, showAdd, setShowAdd, queryClient }) {
  const [form, setForm] = useState({ character_name: '', content: '' });
  const addMut = useMutation({ mutationFn: (data) => createCallsheet(projectId, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['callsheets', projectId] }); setShowAdd(false); setForm({ character_name: '', content: '' }); } });
  const delMut = useMutation({ mutationFn: (id) => deleteCallsheet(projectId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['callsheets', projectId] }) });

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display font-semibold text-base-100">Voice Callsheets</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add</button>
      </div>
      {showAdd && (
        <form onSubmit={(e) => { e.preventDefault(); addMut.mutate(form); }} className="glass p-4 space-y-3">
          <input className="input-field" placeholder="Character Name" value={form.character_name} onChange={e => setForm({ ...form, character_name: e.target.value })} required />
          <textarea className="textarea-field font-mono text-xs" placeholder="Voice callsheet content..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} required />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={addMut.isPending}>Add</button>
          </div>
        </form>
      )}
      {callsheets.length === 0 ? (
        <div className="glass p-10 text-center"><Users className="w-10 h-10 text-base-600 mx-auto mb-3" /><p className="text-base-400 text-sm">No voice callsheets yet.</p></div>
      ) : (
        <div className="space-y-3">
          {callsheets.map(cs => (
            <details key={cs.id} className="glass group">
              <summary className="p-4 cursor-pointer flex items-center justify-between">
                <span className="font-medium text-base-100">{cs.character_name}</span>
                <button onClick={(e) => { e.preventDefault(); delMut.mutate(cs.id); }} className="p-1 text-base-500 hover:text-rose-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
              </summary>
              <div className="px-4 pb-4 border-t border-white/[0.05] pt-3">
                <div className="prose-preview text-sm max-h-96 overflow-auto"><ReactMarkdown>{cs.content}</ReactMarkdown></div>
              </div>
            </details>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function BibleTab({ project, projectId, queryClient }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(project.story_bible || '');
  const saveMut = useMutation({ mutationFn: (bible) => updateProject(projectId, { story_bible: bible }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', projectId] }); setEditing(false); } });

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display font-semibold text-base-100">Story Bible</h3>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={() => saveMut.mutate(text)} className="btn-primary text-sm flex items-center gap-2" disabled={saveMut.isPending}><Save className="w-4 h-4" /> Save</button>
            </>
          ) : (
            <button onClick={() => { setText(project.story_bible || ''); setEditing(true); }} className="btn-secondary flex items-center gap-2 text-sm"><PenTool className="w-4 h-4" /> Edit</button>
          )}
        </div>
      </div>
      {editing ? (
        <textarea className="textarea-field font-mono text-xs" value={text} onChange={e => setText(e.target.value)} rows={30} />
      ) : project.story_bible ? (
        <div className="glass p-6 prose-preview max-h-[70vh] overflow-auto"><ReactMarkdown>{project.story_bible}</ReactMarkdown></div>
      ) : (
        <div className="glass p-10 text-center"><Scroll className="w-10 h-10 text-base-600 mx-auto mb-3" /><p className="text-base-400 text-sm">No story bible yet.</p></div>
      )}
    </motion.div>
  );
}

function RunsTab({ runs, onCancel, cancelling }) {
  const [expandedRun, setExpandedRun] = useState(null);

  const outputHref = (run) => {
    if (run.chapter_id && run.book_id) {
      return `/library/${run.project_id}/books/${run.book_id}/chapters/${run.chapter_id}`;
    }
    if (run.workflow_type === 'brainstorm') {
      return `/library/${run.project_id}?tab=bible`;
    }
    return `/library/${run.project_id}?tab=books`;
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      <h3 className="font-display font-semibold text-base-100">Workflow Runs</h3>
      {runs.length === 0 ? (
        <div className="glass p-10 text-center"><Play className="w-10 h-10 text-base-600 mx-auto mb-3" /><p className="text-base-400 text-sm">No runs yet.</p></div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <div key={run.id} className="glass-subtle overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}>
                <div className="flex items-center gap-3">
                  {(run.status === 'running' || run.status === 'retrying') && <div className="w-2 h-2 rounded-full bg-amber-400 animate-glow-pulse" />}
                  <div>
                    <span className="font-medium text-sm text-base-200 capitalize">{run.workflow_type.replace('_', ' ')}</span>
                    <span className="text-xs text-base-500 ml-2">{run.current_step}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {run.retry_count > 0 && (
                    <span className="text-[11px] text-amber-400">attempt {run.retry_count + 1}/{run.max_retries || 3}</span>
                  )}
                  <StatusBadge status={run.status} />
                  <span className="text-[11px] text-base-500">{new Date(run.started_at).toLocaleString()}</span>
                </div>
              </div>
              {expandedRun === run.id && (
                <div className="border-t border-white/[0.04] p-4">
                  <div className="flex items-center justify-end gap-2 mb-3">
                    {run.cancellable && (
                      <button
                        onClick={() => onCancel(run.id)}
                        disabled={cancelling}
                        className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        {cancelling ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                    {(run.status === 'completed' || run.status === 'failed') && (
                      <Link to={outputHref(run)} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Output
                      </Link>
                    )}
                  </div>
                  {run.error && <div className="bg-rose-500/10 text-rose-400 rounded-xl p-3 mb-3 text-xs border border-rose-500/15">{run.error}</div>}
                  <div className="bg-base-950/60 rounded-xl p-3 max-h-60 overflow-auto">
                    {(run.logs || []).map((log, i) => <div key={i} className="text-[11px] font-mono text-emerald-400/80 py-0.5">{log}</div>)}
                    {(!run.logs || run.logs.length === 0) && <div className="text-[11px] font-mono text-base-600">No logs yet...</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
