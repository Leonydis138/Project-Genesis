import React, { useState, useEffect } from 'react';
import { MessageSquare, Repeat, GitBranch, Brain, Dna, FlaskConical, Bell } from 'lucide-react';
import { Header } from './components/Header';
import { ChatTab } from './components/ChatTab';
import { SelfPlayTab } from './components/SelfPlayTab';
import { MctsTab } from './components/MctsTab';
import { MemoryTab } from './components/MemoryTab';
import { EvolutionTab } from './components/EvolutionTab';
import { BenchmarkTab } from './components/BenchmarkTab';
import { GenesisStats, ChatMessage, SelfPlayEpisode } from './types';
import { fetchJson } from './lib/http';
import { buildLabSnapshot, persistLabSnapshot, restoreLabSnapshot, LabTab } from './lib/labState';

export default function App() {
  const [activeTab, setActiveTab] = useState<LabTab>('chat');
  const [stats, setStats] = useState<GenesisStats | null>(null);
  const [episodes, setEpisodes] = useState<SelfPlayEpisode[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sandboxCode, setSandboxCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSelfPlayLoading, setIsSelfPlayLoading] = useState(false);
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Sync telemetry on interval
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    const restored = restoreLabSnapshot();
    if (restored) {
      setActiveTab(restored.activeTab);
      setMessages(restored.messages);
      setEpisodes(restored.episodes);
      setStats(restored.stats);
      setLastSavedAt(restored.savedAt);
    }

    setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchStats();
    fetchSelfPlay();
    const interval = setInterval(() => {
      fetchStats();
      fetchSelfPlay();
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const snapshot = buildLabSnapshot({ activeTab, messages, episodes, stats });
    persistLabSnapshot(snapshot);
    setLastSavedAt(snapshot.savedAt);
  }, [activeTab, messages, episodes, stats]);

  const fetchStats = async () => {
    try {
      const data = await fetchJson<GenesisStats>('/api/stats', undefined, { timeoutMs: 8000 });
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSelfPlay = async () => {
    try {
      const data = await fetchJson<{ episodes?: SelfPlayEpisode[] }>('/api/selfplay', undefined, { timeoutMs: 8000 });
      if (data.episodes) setEpisodes(data.episodes);
    } catch (err) {
      console.error('Error fetching selfplay:', err);
    }
  };

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Send message in Chat Tab
  const handleSendMessage = async (prompt: string, mode: 'debate' | 'mcts' | 'direct') => {
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const data = await fetchJson<{ response?: string; transcript?: any[]; mctsTree?: any[]; context?: string[] }>(
        '/api/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, mode }),
        },
        { timeoutMs: 20000 }
      );
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response returned.',
        mode,
        transcript: data.transcript,
        mctsTree: data.mctsTree,
        context: data.context,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
      await fetchStats();
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Error generating solution: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // RLHF Feedback
  const handleRateResponse = async (messageId: string, rating: number) => {
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg) return;

    try {
      const data = await fetchJson<{ loss?: number; currentLoss?: number }>(
        '/api/feedback',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: targetMsg.content, rating }),
        },
        { timeoutMs: 15000 }
      );

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, rated: true, rating, loss: data.loss }
            : m
        )
      );

      triggerToast(`RLHF feedback registered! Neural Reward Model updated (Loss: ${data.loss?.toFixed(4)})`);
      await fetchStats();
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  // Toggle Self-Play loop
  const handleToggleSelfPlay = async () => {
    try {
      const data = await fetchJson<{ isActive: boolean }>('/api/selfplay/toggle', { method: 'POST' }, { timeoutMs: 10000 });
      if (stats) {
        setStats({ ...stats, is_self_play_active: data.isActive });
      }
      triggerToast(`Autonomous Self-Play ${data.isActive ? 'resumed' : 'paused'}`);
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Step Self-Play episode
  const handleStepSelfPlay = async () => {
    setIsSelfPlayLoading(true);
    try {
      const data = await fetchJson<{ episode?: any }>('/api/selfplay/step', { method: 'POST' }, { timeoutMs: 20000 });
      if (data.episode) {
        setEpisodes(prev => [data.episode, ...prev]);
        triggerToast(
          `Self-Play Episode #${data.episode.round} complete: ${data.episode.success ? 'PASSED' : 'FAILED'} (Reward: ${data.episode.combinedReward})`
        );
      }
      await fetchStats();
    } catch (err) {
      console.error('Step selfplay error:', err);
    } finally {
      setIsSelfPlayLoading(false);
    }
  };

  // Run full benchmark suite
  const handleRunBenchmarks = async () => {
    setIsBenchmarkLoading(true);
    try {
      const data = await fetchJson<{ results: any[] }>('/api/tasks/run-all', { method: 'POST' }, { timeoutMs: 30000 });
      const passed = data.results.filter((r: any) => r.passed).length;
      triggerToast(`Benchmark Suite Complete: ${passed} / ${data.results.length} tasks passed assertions`);
      await fetchStats();
    } catch (err) {
      console.error('Run benchmarks error:', err);
    } finally {
      setIsBenchmarkLoading(false);
    }
  };

  // Switch to Sandbox and load code
  const handleExecuteCode = (code: string) => {
    setSandboxCode(code);
    setActiveTab('benchmark');
  };

  const handleExportLab = () => {
    const snapshot = buildLabSnapshot({ activeTab, messages, episodes, stats });
    const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `project-genesis-lab-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast('Lab snapshot exported');
  };

  const handleResetLabState = () => {
    setMessages([]);
    setEpisodes([]);
    setStats(null);
    setSandboxCode('');
    setActiveTab('chat');
    localStorage.removeItem('project-genesis-lab-state');
    triggerToast('Lab session reset');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-white">
      {/* Top Mission Control Header */}
      <Header
        stats={stats}
        onToggleSelfPlay={handleToggleSelfPlay}
        onStepSelfPlay={handleStepSelfPlay}
        onRunBenchmarks={handleRunBenchmarks}
        onExportLab={handleExportLab}
        onResetLabState={handleResetLabState}
        isSelfPlayLoading={isSelfPlayLoading}
        isBenchmarkLoading={isBenchmarkLoading}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-amber-500/60 text-amber-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-mono animate-fade-in backdrop-blur-md">
          <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>{notification}</span>
        </div>
      )}

      {!navigator.onLine && (
        <div className="sticky top-[110px] z-20 border-b border-amber-700/50 bg-amber-950/70 px-4 py-2 text-center text-xs font-mono text-amber-200">
          Offline mode: the app is still loaded, but live generation and sync requests will retry when connectivity returns.
        </div>
      )}

      {lastSavedAt && (
        <div className="px-4 pt-3 text-right text-[10px] font-mono text-zinc-400">
          Autosave: {new Date(lastSavedAt).toLocaleTimeString()}
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm sticky top-[110px] sm:top-[98px] z-30">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-none py-1.5">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
            Genesis Terminal
          </button>

          <button
            onClick={() => setActiveTab('selfplay')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
              activeTab === 'selfplay'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Repeat className="w-3.5 h-3.5 text-emerald-400" />
            Self-Play Loop
            {episodes.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                {episodes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('mcts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
              activeTab === 'mcts'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            MCTS Rollouts
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
              activeTab === 'memory'
                ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-sky-400" />
            Hybrid Memory (FAISS + Graph)
          </button>

          <button
            onClick={() => setActiveTab('evolution')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
              activeTab === 'evolution'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Dna className="w-3.5 h-3.5 text-emerald-400" />
            Evolution Chamber
          </button>

          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
              activeTab === 'benchmark'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
            Benchmark Testbed & Sandbox
          </button>
        </div>
      </div>

      {/* Main Tab Content View */}
      <main className="flex-1 pb-10">
        {activeTab === 'chat' && (
          <ChatTab
            messages={messages}
            onSendMessage={handleSendMessage}
            onRateResponse={handleRateResponse}
            onExecuteCode={handleExecuteCode}
            isLoading={isGenerating}
          />
        )}

        {activeTab === 'selfplay' && (
          <SelfPlayTab
            episodes={episodes}
            isActive={stats?.is_self_play_active || false}
            interval={15}
            onToggle={handleToggleSelfPlay}
            onStep={handleStepSelfPlay}
            isLoading={isSelfPlayLoading}
          />
        )}

        {activeTab === 'mcts' && (
          <MctsTab onExecuteCode={handleExecuteCode} />
        )}

        {activeTab === 'memory' && (
          <MemoryTab onExecuteCode={handleExecuteCode} />
        )}

        {activeTab === 'evolution' && (
          <EvolutionTab />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkTab initialCode={sandboxCode} />
        )}
      </main>
    </div>
  );
}
