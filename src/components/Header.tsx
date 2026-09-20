import React from 'react';
import { Play, Pause, Zap, Flame, RefreshCw, Cpu, Brain, Dna, Activity } from 'lucide-react';
import { GenesisStats } from '../types';
import { GoogleDriveSync } from './GoogleDriveSync';

interface HeaderProps {
  stats: GenesisStats | null;
  onToggleSelfPlay: () => void;
  onStepSelfPlay: () => void;
  onRunBenchmarks: () => void;
  isSelfPlayLoading: boolean;
  isBenchmarkLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onToggleSelfPlay,
  onStepSelfPlay,
  onRunBenchmarks,
  isSelfPlayLoading,
  isBenchmarkLoading,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
        {/* Top brand row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-950/50 border border-amber-500/20">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  PROJECT GENESIS
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    HYBRID AI LAB
                  </span>
                </h1>
              </div>
              <p className="text-xs text-zinc-400 font-mono hidden sm:block">
                PPO • RLAIF • MCTS • Evolutionary Search • Hybrid Memory • Multi-Agent Debate • Self-Play
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSelfPlay}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all ${
                stats?.is_self_play_active
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700/50 hover:bg-emerald-900/50 shadow-sm shadow-emerald-950'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800'
              }`}
              title="Toggle continuous autonomous self-play background thread"
            >
              {stats?.is_self_play_active ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <Pause className="w-3.5 h-3.5" />
                  Self-Play: Running
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Self-Play: Paused
                </>
              )}
            </button>

            <button
              onClick={onStepSelfPlay}
              disabled={isSelfPlayLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-zinc-900 text-amber-400 border border-amber-600/30 hover:bg-amber-950/40 hover:border-amber-500/60 disabled:opacity-50 transition-all"
              title="Trigger a single MCTS Self-Play rollout episode immediately"
            >
              <Zap className={`w-3.5 h-3.5 ${isSelfPlayLoading ? 'animate-spin' : ''}`} />
              Step Episode
            </button>

            <button
              onClick={onRunBenchmarks}
              disabled={isBenchmarkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-zinc-900 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-950/40 hover:border-indigo-500/60 disabled:opacity-50 transition-all"
              title="Run test assertions across all 8 tasks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBenchmarkLoading ? 'animate-spin' : ''}`} />
              Run Benchmarks
            </button>

            <GoogleDriveSync stats={stats} />
          </div>
        </div>

        {/* Live Telemetry Pill Bar */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {/* Temperature */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              Temp
              <Cpu className="w-3 h-3 text-amber-400/80" />
            </span>
            <span className="text-sm font-semibold font-mono text-amber-300">
              {stats ? stats.temperature.toFixed(2) : '0.80'}
            </span>
          </div>

          {/* Top-p */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              Top-p
              <span className="text-zinc-500 font-bold">p</span>
            </span>
            <span className="text-sm font-semibold font-mono text-zinc-200">
              {stats ? stats.top_p.toFixed(2) : '0.90'}
            </span>
          </div>

          {/* Episodic Memory */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              Episodic
              <Brain className="w-3 h-3 text-sky-400/80" />
            </span>
            <span className="text-sm font-semibold font-mono text-sky-400">
              {stats ? `${stats.memory_count} vec` : '0 vec'}
            </span>
          </div>

          {/* Semantic Graph */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              Semantic
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="text-sm font-semibold font-mono text-cyan-300">
              {stats ? `${stats.semantic_nodes_count} n / ${stats.semantic_edges_count} e` : '0'}
            </span>
          </div>

          {/* Evolutionary Round */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              Evo Round
              <Dna className="w-3 h-3 text-emerald-400/80" />
            </span>
            <span className="text-sm font-semibold font-mono text-emerald-400">
              {stats ? `Gen ${stats.evo_round}` : 'Gen 0'}
            </span>
          </div>

          {/* Distillation Version */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              Policy
              <span className="text-[9px] px-1 bg-indigo-500/20 text-indigo-300 rounded font-mono">PPO</span>
            </span>
            <span className="text-xs font-semibold font-mono text-indigo-300 truncate" title={stats?.ppo_version}>
              {stats ? stats.ppo_version : 'v1.0'}
            </span>
          </div>

          {/* Reward Loss */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              BCE Loss
              <Activity className="w-3 h-3 text-rose-400/80" />
            </span>
            <span className="text-sm font-semibold font-mono text-rose-400">
              {stats ? stats.reward_model_loss.toFixed(4) : '0.3421'}
            </span>
          </div>

          {/* Win Rate */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              Win Rate
              <span className="text-emerald-400 font-bold">%</span>
            </span>
            <span className="text-sm font-semibold font-mono text-emerald-300">
              {stats ? `${stats.win_rate}%` : '85%'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
