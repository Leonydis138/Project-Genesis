import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Zap,
  CheckCircle2,
  XCircle,
  Award,
  Terminal,
  Code2,
  Clock,
  Sparkles,
  Database,
  Cpu,
  History,
  RefreshCw,
  Plus,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { SelfPlayEpisode, OptimizerStatus, ExperienceRecord } from '../types';

interface SelfPlayTabProps {
  episodes: SelfPlayEpisode[];
  isActive: boolean;
  interval: number;
  onToggle: () => void;
  onStep: () => void;
  isLoading: boolean;
}

export const SelfPlayTab: React.FC<SelfPlayTabProps> = ({
  episodes,
  isActive,
  interval,
  onToggle,
  onStep,
  isLoading,
}) => {
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);

  // GenesisOptimizer state
  const [optimizerStatus, setOptimizerStatus] = useState<OptimizerStatus | null>(null);
  const [experiences, setExperiences] = useState<ExperienceRecord[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [synthesisMsg, setSynthesisMsg] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [newTaskId, setNewTaskId] = useState('task_quicksort');
  const [newScore, setNewScore] = useState('0.92');
  const [newStrategy, setNewStrategy] = useState("def qsort(arr): return arr if len(arr)<=1 else qsort([x for x in arr[1:] if x<=arr[0]]) + [arr[0]] + qsort([x for x in arr[1:] if x>arr[0]])");

  useEffect(() => {
    fetchOptimizerData();
  }, [episodes.length]);

  const fetchOptimizerData = async () => {
    try {
      const [statusRes, histRes] = await Promise.all([
        fetch('/api/optimizer/status'),
        fetch('/api/optimizer/history?limit=10'),
      ]);
      if (statusRes.ok) {
        const s = await statusRes.json();
        setOptimizerStatus(s);
      }
      if (histRes.ok) {
        const h = await histRes.json();
        if (h.history) setExperiences(h.history);
      }
    } catch (err) {
      console.error('Failed to fetch optimizer data:', err);
    }
  };

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    setSynthesisMsg(null);
    try {
      const res = await fetch('/api/optimizer/synthesize', { method: 'POST' });
      const data = await res.json();
      if (data.synthesized) {
        setSynthesisMsg(`Success: Policy synthesized to v${data.version} with AST validation.`);
      } else {
        setSynthesisMsg(`Notice: ${data.reason || 'No high-performing strategy (> 0.8) available.'}`);
      }
      await fetchOptimizerData();
    } catch (err: any) {
      setSynthesisMsg(`Error: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRecordExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecording(true);
    try {
      const res = await fetch('/api/optimizer/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: newTaskId,
          score: parseFloat(newScore),
          strategy: newStrategy,
        }),
      });
      if (res.ok) {
        setShowRecordModal(false);
        await fetchOptimizerData();
      }
    } catch (err) {
      console.error('Failed to record experience:', err);
    } finally {
      setIsRecording(false);
    }
  };

  const passedCount = episodes.filter(e => e.success).length;
  const winRate = episodes.length > 0 ? Math.round((passedCount / episodes.length) * 100) : 85;
  const avgReward = episodes.length > 0
    ? (episodes.reduce((acc, e) => acc + e.combinedReward, 0) / episodes.length).toFixed(3)
    : '0.820';

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Control Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Autonomous Self-Play Loop (MCTS + RLAIF + PPO)
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              Interval: {interval}s
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Genesis continuously samples benchmark tasks, executes MCTS candidate rollouts, evaluates code in sandbox,
            updates neural reward model weights, indexes episodic & semantic graph memory, and evolves hyperparameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
              isActive
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/50'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4" />
                Pause Loop
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Resume Loop
              </>
            )}
          </button>

          <button
            onClick={onStep}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 border border-amber-500/30 disabled:opacity-50 transition-all shadow-md shadow-amber-950"
          >
            <Zap className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Step Single Episode
          </button>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl">
          <div className="text-xs font-mono text-zinc-400">Total Episodes</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{episodes.length}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Continuous buffer</div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl">
          <div className="text-xs font-mono text-zinc-400">Sandbox Test Pass Rate</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{winRate}%</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{passedCount} passed out of {episodes.length}</div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl">
          <div className="text-xs font-mono text-zinc-400">Mean Combined Reward</div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{avgReward}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">0.5 * static + 0.5 * reward</div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl">
          <div className="text-xs font-mono text-zinc-400">PPO Distillations</div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {episodes.filter(e => e.distillationTriggered).length}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Rollouts with reward &gt; 0.65</div>
        </div>
      </div>

      {/* GenesisOptimizer: SQLite Experience Buffer & AST Strategy Synthesizer Panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                GenesisOptimizer: SQLite Experience Buffer & AST Policy Engine
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Autonomous performance optimization buffer in SQLite (<code className="text-cyan-300">agent_experience.db</code>) with AST-validated policy synthesis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecordModal(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium flex items-center gap-1.5 border border-zinc-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Experience
            </button>
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-cyan-950 disabled:opacity-50 transition-all"
            >
              <Cpu className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
              {isSynthesizing ? 'Synthesizing...' : 'Synthesize Strategy'}
            </button>
            <button
              onClick={fetchOptimizerData}
              title="Refresh Optimizer data"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Synthesis feedback toast if available */}
        {synthesisMsg && (
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/80 text-cyan-300 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              {synthesisMsg}
            </span>
            <button onClick={() => setSynthesisMsg(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Optimizer Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 block">Agent Policy Version</span>
            <div className="text-xl font-mono font-bold text-cyan-400">
              v{optimizerStatus?.system_params?.version || '1.0'}
            </div>
            <span className="text-[10px] font-mono text-zinc-500">LR: {optimizerStatus?.system_params?.learning_rate ?? 0.1}</span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 block">Total Experiences (DB)</span>
            <div className="text-xl font-mono font-bold text-white">
              {optimizerStatus?.total_experiences || 0}
            </div>
            <span className="text-[10px] font-mono text-zinc-500">In-memory deque: {optimizerStatus?.in_memory_history_count || 0}</span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 block">Best Practices (Score &gt; 0.8)</span>
            <div className="text-xl font-mono font-bold text-emerald-400">
              {optimizerStatus?.high_performing_count || 0}
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Eligible for synthesis</span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 block">Performance Mean / Max</span>
            <div className="text-xl font-mono font-bold text-amber-400">
              {optimizerStatus?.average_score?.toFixed(2) ?? '0.00'} / {optimizerStatus?.max_score?.toFixed(2) ?? '0.00'}
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Historical reward score</span>
          </div>
        </div>

        {/* Current Active Strategy */}
        {optimizerStatus?.system_params?.current_strategy && (
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Active Synthesized Strategy:
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">AST Validated</span>
            </div>
            <pre className="text-xs font-mono text-cyan-300 p-2.5 bg-zinc-900/90 rounded-lg overflow-x-auto border border-zinc-800/80">
              <code>{optimizerStatus.system_params.current_strategy}</code>
            </pre>
          </div>
        )}

        {/* Recent Experiences from SQLite */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 font-bold">
              <History className="w-3.5 h-3.5 text-zinc-400" />
              Recent SQLite Experience Logs (agent_experience.db)
            </span>
            <span>{experiences.length} logged records</span>
          </div>

          {experiences.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800">
              No experiences recorded in SQLite yet. Self-play episodes automatically record here!
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {experiences.map(exp => (
                <div
                  key={exp.id}
                  className="bg-zinc-950 border border-zinc-800/70 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-zinc-500 text-[10px]">#{exp.id}</span>
                    <span className="font-bold text-zinc-200">{exp.task_id}</span>
                    <span className="text-zinc-400 truncate max-w-xs md:max-w-md text-[11px]">
                      {exp.strategy}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        exp.score >= 0.8
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      Score: {exp.score.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-500">{exp.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Record Experience into SQLite Buffer
              </h3>
              <button onClick={() => setShowRecordModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordExperience} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Task Identifier:</label>
                <input
                  type="text"
                  value={newTaskId}
                  onChange={e => setNewTaskId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Score (0.00 - 1.00):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={newScore}
                  onChange={e => setNewScore(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Strategy Logic / Expression:</label>
                <textarea
                  value={newStrategy}
                  onChange={e => setNewStrategy(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecording}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  {isRecording ? 'Saving...' : 'Save to SQLite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Episodes Stream List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono text-zinc-300 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-rose-400" />
            Live Self-Play Telemetry Stream
          </h3>
          <span className="text-xs text-zinc-500 font-mono">Auto-refreshes on episode completion</span>
        </div>

        {episodes.length === 0 ? (
          <div className="p-8 text-center bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 font-mono text-xs">
            No self-play episodes completed yet. Click "Step Single Episode" or enable the autonomous loop above.
          </div>
        ) : (
          episodes.map(ep => {
            const isExpanded = expandedEpisode === ep.id;
            return (
              <div
                key={ep.id}
                className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4 transition-all hover:border-zinc-700 shadow-md space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Round #{ep.round}
                    </span>
                    <span className="text-sm font-bold text-white">{ep.task.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800 font-mono">
                      {ep.task.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ep.distillationTriggered && (
                      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                        <Sparkles className="w-3 h-3" />
                        PPO Distilled
                      </span>
                    )}
                    <span
                      className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        ep.success
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {ep.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {ep.success ? 'TEST PASSED' : 'TEST FAILED'}
                    </span>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Static Critic Score</span>
                    <span className="text-amber-400 font-semibold">{ep.staticScore.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Neural Reward</span>
                    <span className="text-sky-400 font-semibold">{ep.rewardScore.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Combined Reward</span>
                    <span className="text-emerald-400 font-bold">{ep.combinedReward.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Loss Value</span>
                    <span className="text-rose-400 font-semibold">{ep.loss.toFixed(4)}</span>
                  </div>
                </div>

                {/* Footer and Code toggle */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ep.durationMs}ms
                    </span>
                    <span>MCTS nodes: {ep.mctsNodesCount}</span>
                  </div>
                  <button
                    onClick={() => setExpandedEpisode(isExpanded ? null : ep.id)}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Code2 className="w-3 h-3" />
                    {isExpanded ? 'Hide Code' : 'View Code & Tests'}
                  </button>
                </div>

                {/* Expanded Code & Assertions */}
                {isExpanded && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-[11px] font-mono text-zinc-400 mb-1">Generated Code:</div>
                      <pre className="text-xs font-mono text-emerald-300 overflow-x-auto p-2 bg-zinc-900 rounded">
                        <code>{ep.code}</code>
                      </pre>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <div className="text-[11px] font-mono text-zinc-400 mb-1">Unit Test Assertions:</div>
                      <pre className="text-xs font-mono text-amber-300 overflow-x-auto p-2 bg-zinc-900 rounded">
                        <code>{ep.task.test}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
