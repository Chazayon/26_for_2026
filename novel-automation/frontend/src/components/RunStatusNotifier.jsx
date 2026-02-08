import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRuns } from '../api';
import { useToast } from './ToastProvider';

function runLabel(run) {
  if (run.workflow_type === 'brainstorm') return 'Brainstorm';
  if (run.workflow_type === 'full_book') return 'Book production';
  return 'Chapter generation';
}

export default function RunStatusNotifier() {
  const { toast } = useToast();
  const previousMapRef = useRef(new Map());
  const initializedRef = useRef(false);

  const { data: runs = [] } = useQuery({
    queryKey: ['runs', 'notifier'],
    queryFn: () => getRuns(),
    refetchInterval: (query) => {
      const data = query.state.data || [];
      return data.some((run) => run.status === 'running' || run.status === 'retrying') ? 3000 : 6000;
    },
  });

  useEffect(() => {
    const nextMap = new Map(runs.map((run) => [run.id, run]));
    if (!initializedRef.current) {
      previousMapRef.current = nextMap;
      initializedRef.current = true;
      return;
    }

    runs.forEach((run) => {
      const prev = previousMapRef.current.get(run.id);
      if (!prev) {
        if (run.status === 'running') {
          toast({
            type: 'info',
            title: `${runLabel(run)} started`,
            message: `Tracking ${run.workflow_type.replace('_', ' ')} in the pipeline.`,
          });
        }
        return;
      }

      if (prev.status === run.status) return;

      if (run.status === 'retrying') {
        const attempt = Math.max((run.retry_count || 0) + 1, 2);
        toast({
          type: 'warning',
          title: `${runLabel(run)} retrying`,
          message: `Attempt ${attempt}/${run.max_retries || 3}.`,
        });
      } else if (run.status === 'completed') {
        toast({
          type: 'success',
          title: `${runLabel(run)} completed`,
          message: run.chapter_id ? 'Output is ready in the chapter view.' : 'Output is ready in the project view.',
        });
      } else if (run.status === 'failed') {
        toast({
          type: 'error',
          title: `${runLabel(run)} failed`,
          message: run.error || 'Check run logs for details.',
        });
      } else if (run.status === 'cancelled') {
        toast({
          type: 'info',
          title: `${runLabel(run)} cancelled`,
          message: 'Generation stopped successfully.',
        });
      }
    });

    previousMapRef.current = nextMap;
  }, [runs, toast]);

  return null;
}
