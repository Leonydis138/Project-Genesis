import { ChatMessage, GenesisStats, SelfPlayEpisode } from '../types';

export type LabTab = 'chat' | 'selfplay' | 'mcts' | 'memory' | 'evolution' | 'benchmark';

export interface LabSnapshot {
  activeTab: LabTab;
  messages: ChatMessage[];
  episodes: SelfPlayEpisode[];
  stats: GenesisStats | null;
  savedAt: number;
}

export function buildLabSnapshot(params: {
  activeTab: LabTab;
  messages: ChatMessage[];
  episodes: SelfPlayEpisode[];
  stats: GenesisStats | null;
}): LabSnapshot {
  return {
    activeTab: params.activeTab,
    messages: Array.isArray(params.messages) ? params.messages : [],
    episodes: Array.isArray(params.episodes) ? params.episodes : [],
    stats: params.stats ?? null,
    savedAt: Date.now(),
  };
}

export function sanitizeLabSnapshot(raw: unknown): Partial<LabSnapshot> & Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const validTabs: LabTab[] = ['chat', 'selfplay', 'mcts', 'memory', 'evolution', 'benchmark'];

  if (typeof candidate.activeTab === 'string' && validTabs.includes(candidate.activeTab as LabTab)) {
    safe.activeTab = candidate.activeTab;
  }

  if (Array.isArray(candidate.messages)) {
    safe.messages = candidate.messages.filter((msg) => msg && typeof msg === 'object' && 'id' in msg && 'content' in msg);
  }

  if (Array.isArray(candidate.episodes)) {
    safe.episodes = candidate.episodes.filter((ep) => ep && typeof ep === 'object' && 'id' in ep && 'task' in ep);
  }

  if (candidate.stats && typeof candidate.stats === 'object') {
    safe.stats = candidate.stats as GenesisStats;
  }

  return safe;
}

export function loadLabSnapshot(raw: string | null): LabSnapshot | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const safe = sanitizeLabSnapshot(parsed);
    return {
      activeTab: (safe.activeTab as LabTab) ?? 'chat',
      messages: Array.isArray(safe.messages) ? safe.messages as ChatMessage[] : [],
      episodes: Array.isArray(safe.episodes) ? safe.episodes as SelfPlayEpisode[] : [],
      stats: (safe.stats as GenesisStats) ?? null,
      savedAt: typeof (safe as any).savedAt === 'number' ? (safe as any).savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function persistLabSnapshot(snapshot: LabSnapshot): void {
  localStorage.setItem('project-genesis-lab-state', JSON.stringify(snapshot));
}

export function restoreLabSnapshot(): LabSnapshot | null {
  return loadLabSnapshot(localStorage.getItem('project-genesis-lab-state'));
}
