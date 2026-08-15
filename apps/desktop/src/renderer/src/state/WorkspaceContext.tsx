import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { InvestorDetail } from '../../../shared/contracts';
import type {
  StudioAppBootstrap,
  StudioCommandMap,
  StudioCommandName,
  StudioCommandResult,
} from '../../../shared/hackathon-contracts';

interface ToastMessage {
  id: number;
  tone: 'success' | 'error' | 'info';
  title: string;
  detail?: string;
}

interface WorkspaceValue {
  data: StudioAppBootstrap | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  toasts: ToastMessage[];
  refresh: () => Promise<void>;
  command: <K extends StudioCommandName>(
    name: K,
    payload: StudioCommandMap[K],
  ) => Promise<StudioCommandResult<K>>;
  getInvestor: (id: string) => Promise<InvestorDetail>;
  notify: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: number) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);
const reportedCommandFailures = new WeakSet<object>();

const FULL_BOOTSTRAP_COMMANDS = new Set<string>([
  'onboarding.complete',
  'investor.target',
  'pipeline.move',
  'connector.syncCalendar',
  'connector.syncMail',
  'backup.restore',
]);

function objectReason(reason: unknown): object | null {
  return (typeof reason === 'object' && reason !== null) || typeof reason === 'function'
    ? reason
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

function executeStudioCommand<K extends StudioCommandName>(
  name: K,
  payload: StudioCommandMap[K],
): Promise<StudioCommandResult<K>> {
  const command = window.outreachr.command as unknown as <N extends StudioCommandName>(
    commandName: N,
    commandPayload: StudioCommandMap[N],
  ) => Promise<StudioCommandResult<N>>;
  return command(name, payload);
}

export function WorkspaceProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [data, setData] = useState<StudioAppBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      event.preventDefault();
      const reason = objectReason(event.reason);
      if (reason && reportedCommandFailures.has(reason)) return;
      notify({
        tone: 'error',
        title: 'Action could not be completed',
        detail: errorMessage(event.reason),
      });
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [notify]);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const bootstrap = (await window.outreachr.bootstrap()) as StudioAppBootstrap;
      setData(bootstrap);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const command = useCallback(
    async <K extends StudioCommandName>(name: K, payload: StudioCommandMap[K]) => {
      try {
        const result = await executeStudioCommand(name, payload);
        if (FULL_BOOTSTRAP_COMMANDS.has(name)) {
          setData(result as StudioAppBootstrap);
        } else if (
          name.startsWith('task.') ||
          name.startsWith('meeting.') ||
          name.startsWith('draft.') ||
          name.startsWith('source.') ||
          name.startsWith('investor.') ||
          name.startsWith('pipeline.') ||
          name.startsWith('round.') ||
          name.startsWith('list.') ||
          name.startsWith('connector.') ||
          name.startsWith('mail.') ||
          name.startsWith('communications.') ||
          name.startsWith('suppression.') ||
          name.startsWith('person.') ||
          name.startsWith('agent.') ||
          name.startsWith('knowledge.') ||
          name.startsWith('legalEntity.') ||
          name.startsWith('venture.') ||
          name.startsWith('narrative.') ||
          name.startsWith('canonicalDemo.') ||
          name.startsWith('capitalMandate.') ||
          name.startsWith('organization.') ||
          name.startsWith('opportunity.') ||
          name.startsWith('hackathon.')
        ) {
          await load(true);
        }
        return result;
      } catch (cause) {
        const message = errorMessage(cause);
        const reason = objectReason(cause);
        if (reason) reportedCommandFailures.add(reason);
        notify({ tone: 'error', title: 'Action could not be completed', detail: message });
        throw cause;
      }
    },
    [load, notify],
  );

  const getInvestor = useCallback(
    (id: string) => command('investor.get', { id }),
    [command],
  );

  const value = useMemo<WorkspaceValue>(
    () => ({
      data,
      loading,
      error,
      refreshing,
      toasts,
      refresh,
      command,
      getInvestor,
      notify,
      dismissToast,
    }),
    [command, data, dismissToast, error, getInvestor, loading, notify, refresh, refreshing, toasts],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider.');
  return value;
}
