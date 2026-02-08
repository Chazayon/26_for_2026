import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { getProject, getChapter, updateChapter, startChapterRun, getRuns, cancelRun, submitChapterReview } from '../api';
import { useToast } from '../components/ToastProvider';
import {
  ArrowLeft, Play, PenTool, Save, BookOpen,
  ScrollText, ClipboardList, BarChart3, ShieldCheck, Ban
} from 'lucide-react';

const LIVE_CHAPTER_STATUSES = new Set([
  'brief_generating',
  'brief_review',
  'prose_generating',
  'prose_review',
  'running',
  'retrying',
  'awaiting_human_review',
  'needs_revision',
]);

const statusMap = {
  pending: 'badge-pending', completed: 'badge-completed',
  brief_generating: 'badge-running', prose_generating: 'badge-running',
  brief_review: 'badge-running', prose_review: 'badge-running',
  running: 'badge-running', retrying: 'badge-running',
  awaiting_human_review: 'badge-pending', needs_revision: 'badge-failed',
  failed: 'badge-failed', cancelled: 'badge-cancelled',
};
function StatusBadge({ status }) {
  return <span className={statusMap[status] || 'badge-pending'}>{status}</span>;
}

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ChapterView() {
  const { projectId, bookId, chapterId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('prose');
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId) });
  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => getChapter(projectId, bookId, chapterId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && LIVE_CHAPTER_STATUSES.has(status) ? 3000 : false;
    },
  });
  const { data: runs = [] } = useQuery({
    queryKey: ['runs', projectId],
    queryFn: () => getRuns(projectId),
    refetchInterval: (query) => {
      const data = query.state.data || [];
      return data.some((run) => run.status === 'running' || run.status === 'retrying') ? 3000 : false;
    },
  });

  const activeRun = runs.find(
    (run) => run.chapter_id === chapterId && (run.status === 'running' || run.status === 'retrying'),
  );

  const saveMutation = useMutation({
    mutationFn: (data) => updateChapter(projectId, bookId, chapterId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] }); setEditing(null); },
  });
  const runMutation = useMutation({
    mutationFn: () => startChapterRun(projectId, bookId, chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['runs', projectId] });
      toast({ type: 'success', title: 'Generation started', message: 'Live status is now tracking this chapter.' });
    },
    onError: (error) => toast({ type: 'error', title: 'Could not start generation', message: error.message }),
  });
  const cancelMutation = useMutation({
    mutationFn: (runId) => cancelRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] });
      toast({ type: 'info', title: 'Generation cancelled', message: 'This chapter run has been stopped.' });
    },
    onError: (error) => toast({ type: 'error', title: 'Cancel failed', message: error.message }),
  });
  const reviewMutation = useMutation({
    mutationFn: (payload) => submitChapterReview(projectId, bookId, chapterId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] });
      toast({ type: 'success', title: 'Review saved', message: 'Chapter approval state updated.' });
    },
    onError: (error) => toast({ type: 'error', title: 'Review update failed', message: error.message }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" /></div>;
  if (!chapter) return <div className="text-center py-12 text-rose-400">Chapter not found</div>;

  const tabs = [
    { id: 'prose', label: 'Prose', icon: BookOpen },
    { id: 'brief', label: 'Scene Brief', icon: ScrollText },
    { id: 'review', label: 'Review', icon: ShieldCheck },
    { id: 'details', label: 'Details', icon: ClipboardList },
    { id: 'log', label: 'Production Log', icon: BarChart3 },
  ];

  const startEdit = (field) => { setEditText(chapter[field] || ''); setEditing(field); };
  const handleSave = () => {
    if (editing === 'prose') saveMutation.mutate({ prose: editText });
    else if (editing === 'scene_brief') saveMutation.mutate({ scene_brief: editText });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(`/library/${projectId}`)} className="text-xs text-base-400 hover:text-cyan-400 flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to {project?.name || 'Project'}
          </button>
          <h1 className="text-2xl font-display font-bold text-base-50">
            Chapter {chapter.chapter_number}: {chapter.title || 'Untitled'}
          </h1>
          <div className="flex items-center gap-4 mt-1.5">
            {chapter.pov_character && <span className="text-sm text-base-400">POV: <strong className="text-violet-400">{chapter.pov_character}</strong></span>}
            {chapter.word_count > 0 && <span className="text-sm text-base-400">{chapter.word_count.toLocaleString()} words</span>}
            <StatusBadge status={chapter.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {(activeTab === 'prose' || activeTab === 'brief') && !editing && (
            <button onClick={() => startEdit(activeTab === 'prose' ? 'prose' : 'scene_brief')} className="btn-ghost flex items-center gap-2 text-sm">
              <PenTool className="w-4 h-4" /> Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm" disabled={saveMutation.isPending}>
                <Save className="w-4 h-4" /> Save
              </button>
            </>
          )}
          {activeRun ? (
            <button
              onClick={() => cancelMutation.mutate(activeRun.id)}
              disabled={cancelMutation.isPending}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              <Ban className="w-4 h-4" /> {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Generation'}
            </button>
          ) : (
            <button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="btn-primary flex items-center gap-2 text-sm">
              <Play className="w-4 h-4" /> {runMutation.isPending ? 'Starting...' : 'Generate'}
            </button>
          )}
        </div>
      </div>

      {chapter.status === 'awaiting_human_review' && (
        <div className="glass-subtle border-cyan-500/20 p-3">
          <p className="text-sm text-base-200">
            Generation is complete. Review and approve Scene Brief + Prose in the <strong>Review</strong> tab.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] relative">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveTab(id); setEditing(null); }}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === id ? 'text-cyan-400' : 'text-base-400 hover:text-base-200'}`}>
            {activeTab === id && <motion.div layoutId="chapterTab" className="absolute inset-x-0 -bottom-px h-0.5 bg-cyan-500 rounded-full" />}
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'prose' && (
        editing === 'prose' ? (
          <textarea className="textarea-field font-serif text-base leading-relaxed" value={editText} onChange={e => setEditText(e.target.value)} rows={30} />
        ) : chapter.prose ? (
          <div className="glass p-8 max-w-4xl mx-auto"><div className="prose-preview text-base leading-[1.9]"><ReactMarkdown>{chapter.prose}</ReactMarkdown></div></div>
        ) : (
          <EmptyState icon={BookOpen} message="No prose generated yet. Click Generate to start." />
        )
      )}

      {activeTab === 'brief' && (
        editing === 'scene_brief' ? (
          <textarea className="textarea-field font-mono text-xs" value={editText} onChange={e => setEditText(e.target.value)} rows={30} />
        ) : chapter.scene_brief ? (
          <div className="glass p-6 prose-preview"><ReactMarkdown>{chapter.scene_brief}</ReactMarkdown></div>
        ) : (
          <EmptyState icon={ScrollText} message="No scene brief generated yet." />
        )
      )}

      {activeTab === 'review' && (
        <ReviewPanel
          chapter={chapter}
          isSaving={reviewMutation.isPending}
          onApprove={(target, approved) => reviewMutation.mutate({ target, approved })}
        />
      )}

      {activeTab === 'details' && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-5 space-y-4">
            <h3 className="font-display font-semibold text-base-100">Chapter Info</h3>
            <div className="space-y-2.5 text-sm">
              <DetailRow label="Chapter #" value={chapter.chapter_number} />
              <DetailRow label="Title" value={chapter.title || '—'} />
              <DetailRow label="POV Character" value={chapter.pov_character || '—'} />
              <DetailRow label="Location" value={chapter.location || '—'} />
              <DetailRow label="Status" value={<StatusBadge status={chapter.status} />} />
              <DetailRow label="Word Count" value={chapter.word_count?.toLocaleString() || '0'} />
              <DetailRow label="Brief Revisions" value={chapter.scene_brief_revisions || 0} />
              <DetailRow label="Prose Revisions" value={chapter.prose_revisions || 0} />
              <DetailRow label="Brief Approved (Human)" value={chapter.scene_brief_human_approved ? 'Yes' : 'No'} />
              <DetailRow label="Prose Approved (Human)" value={chapter.prose_human_approved ? 'Yes' : 'No'} />
            </div>
          </div>
          <div className="glass p-5 space-y-4">
            <h3 className="font-display font-semibold text-base-100">Plot Summary</h3>
            <p className="text-sm text-base-300">{chapter.plot_summary || 'No plot summary'}</p>
            <h3 className="font-display font-semibold text-base-100 pt-2">Characters</h3>
            <p className="text-sm text-base-300">{chapter.character_list || 'No character list'}</p>
            {chapter.context_summary && (
              <>
                <h3 className="font-display font-semibold text-base-100 pt-2">Context Summary</h3>
                <p className="text-sm text-base-200 bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">{chapter.context_summary}</p>
              </>
            )}
          </div>
          {chapter.metadata_yaml && (
            <div className="glass p-5 lg:col-span-2">
              <h3 className="font-display font-semibold text-base-100 mb-3">Metadata</h3>
              <pre className="bg-base-950/60 text-emerald-400/80 rounded-xl p-4 text-xs font-mono overflow-auto max-h-60 border border-white/[0.04]">
                {chapter.metadata_yaml}
              </pre>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'log' && (
        chapter.production_log ? (
          <div className="glass p-6 prose-preview"><ReactMarkdown>{chapter.production_log}</ReactMarkdown></div>
        ) : (
          <EmptyState icon={BarChart3} message="No production log yet." />
        )
      )}
    </motion.div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-base-400">{label}</span>
      <span className="text-base-100 font-medium">{value}</span>
    </div>
  );
}

function ReviewPanel({ chapter, onApprove, isSaving }) {
  const briefApproved = Boolean(chapter.scene_brief_human_approved);
  const proseApproved = Boolean(chapter.prose_human_approved);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      <div className="glass p-5">
        <h3 className="font-display font-semibold text-base-100 mb-2">Human Approval</h3>
        <p className="text-sm text-base-400">
          Confirm both artifacts before the chapter is marked complete.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReviewCard
          title="Scene Brief Review"
          approved={briefApproved}
          reviewText={chapter.scene_brief_review}
          onApprove={() => onApprove('scene_brief', true)}
          onReject={() => onApprove('scene_brief', false)}
          isSaving={isSaving}
        />
        <ReviewCard
          title="Prose Review"
          approved={proseApproved}
          reviewText={chapter.prose_review}
          onApprove={() => onApprove('prose', true)}
          onReject={() => onApprove('prose', false)}
          isSaving={isSaving}
        />
      </div>

      {chapter.human_review_notes && (
        <div className="glass p-5">
          <h4 className="font-display font-semibold text-base-100 mb-3">Review Notes</h4>
          <pre className="bg-base-950/60 rounded-xl p-3 text-xs text-base-300 whitespace-pre-wrap">{chapter.human_review_notes}</pre>
        </div>
      )}
    </motion.div>
  );
}

function ReviewCard({ title, approved, reviewText, onApprove, onReject, isSaving }) {
  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-base-100">{title}</h4>
        <span className={approved ? 'badge-completed' : 'badge-pending'}>
          {approved ? 'approved' : 'pending'}
        </span>
      </div>
      <div className="bg-base-950/60 rounded-xl border border-white/[0.05] p-3 max-h-64 overflow-auto">
        {reviewText ? (
          <div className="prose-preview text-xs">
            <ReactMarkdown>{reviewText}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-base-500">No AI review notes captured.</p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onReject} disabled={isSaving} className="btn-danger text-xs px-3 py-1.5">Needs Revision</button>
        <button onClick={onApprove} disabled={isSaving} className="btn-primary text-xs px-3 py-1.5">Approve</button>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="glass p-14 text-center">
      <Icon className="w-12 h-12 text-base-700 mx-auto mb-4" />
      <p className="text-base-400 text-sm">{message}</p>
    </div>
  );
}
