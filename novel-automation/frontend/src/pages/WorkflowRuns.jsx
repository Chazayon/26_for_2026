import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRuns, getRun } from '../api';
import { Activity, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    running: 'badge-running',
    completed: 'badge-completed',
    failed: 'badge-failed',
    paused: 'badge-pending',
  };
  return <span className={map[status] || 'badge-pending'}>{status}</span>;
}

function StatusIcon({ status }) {
  if (status === 'running') return <Loader2 className="w-5 h-5 text-gold-500 animate-spin" />;
  if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (status === 'failed') return <XCircle className="w-5 h-5 text-crimson-500" />;
  return <Clock className="w-5 h-5 text-ink-400" />;
}

export default function WorkflowRuns() {
  const [expandedRun, setExpandedRun] = useState(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => getRuns(),
    refetchInterval: (query) => {
      const data = query.state.data || [];
      return data.some((run) => run.status === 'running') ? 3000 : false;
    },
  });

  const { data: expandedRunDetail } = useQuery({
    queryKey: ['run', expandedRun],
    queryFn: () => getRun(expandedRun),
    enabled: !!expandedRun,
    refetchInterval: (query) => {
      return query.state.data?.status === 'running' ? 3000 : false;
    },
  });

  const runningCount = runs.filter(r => r.status === 'running').length;
  const completedCount = runs.filter(r => r.status === 'completed').length;
  const failedCount = runs.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-crimson-500" />
          Workflow Runs
        </h1>
        <p className="text-ink-500 mt-1">Monitor all active and completed workflow runs</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="card px-4 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-gold-500" />
          <span className="text-sm font-medium">{runningCount} running</span>
        </div>
        <div className="card px-4 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">{completedCount} completed</span>
        </div>
        <div className="card px-4 py-2 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-crimson-500" />
          <span className="text-sm font-medium">{failedCount} failed</span>
        </div>
      </div>

      {/* Runs List */}
      {isLoading ? (
        <div className="card p-12 text-center text-ink-400">Loading runs...</div>
      ) : runs.length === 0 ? (
        <div className="card p-12 text-center">
          <Activity className="w-12 h-12 text-ink-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink-600 mb-2">No workflow runs</h3>
          <p className="text-ink-400">Start a brainstorm, chapter, or book run from a project page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <div key={run.id} className="card overflow-hidden">
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-parchment-50 transition-colors"
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
              >
                <StatusIcon status={run.status} />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-ink-800 capitalize">
                      {run.workflow_type.replace('_', ' ')}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-400 mt-1">
                    <span>Step: {run.current_step || '—'}</span>
                    <span>Started: {new Date(run.started_at).toLocaleString()}</span>
                    {run.completed_at && (
                      <span>Finished: {new Date(run.completed_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {expandedRun === run.id && (
                <div className="border-t border-parchment-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-ink-500">Run ID:</span>
                      <span className="ml-2 font-mono text-xs text-ink-600">{run.id}</span>
                    </div>
                    <div>
                      <span className="text-ink-500">Project ID:</span>
                      <span className="ml-2 font-mono text-xs text-ink-600">{run.project_id}</span>
                    </div>
                  </div>

                  {run.error && (
                    <div className="bg-crimson-50 border border-crimson-200 text-crimson-700 rounded-lg p-3 text-sm">
                      <strong>Error:</strong> {run.error}
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold text-ink-500 mb-2 uppercase tracking-wide">Logs</h4>
                    <div className="bg-ink-900 rounded-lg p-4 max-h-72 overflow-auto">
                      {(expandedRunDetail?.logs || run.logs || []).length > 0 ? (
                        (expandedRunDetail?.logs || run.logs).map((log, i) => (
                          <div key={i} className="text-xs font-mono text-green-400 py-0.5 leading-relaxed">
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs font-mono text-ink-500">
                          {run.status === 'running' ? 'Waiting for logs...' : 'No logs recorded.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
