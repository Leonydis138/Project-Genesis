import React, { useState } from 'react';
import { GitBranch, Trophy, Play, CheckCircle2, XCircle, Sparkles, Sliders, Code2, ArrowRight } from 'lucide-react';
import { MCTSNodeData } from '../types';

interface MctsTabProps {
  onExecuteCode: (code: string) => void;
}

export const MctsTab: React.FC<MctsTabProps> = ({ onExecuteCode }) => {
  const [prompt, setPrompt] = useState('Write a Python function that returns the factorial of n.');
  const [iterations, setIterations] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [nodes, setNodes] = useState<MCTSNodeData[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const runMcts = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/mcts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, iterations }),
      });
      const data = await res.json();
      if (data.tree) {
        setNodes(data.tree);
        const best = data.tree.find((n: MCTSNodeData) => n.isBest) || data.tree[1];
        if (best) setSelectedNodeId(best.id);
      }
    } catch (err) {
      console.error('MCTS error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes.find(n => n.isBest) || nodes[1];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Top Banner & Planner Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            MCTS Policy Planner & Rollout Tree Explorer
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Section 10 implementation: Monte Carlo Tree Search generates multiple diverse algorithmic trajectories,
            evaluates each candidate via Static Critic + Neural Reward + UCB1 exploration policy, and backpropagates rewards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Enter prompt for MCTS expansion..."
            className="flex-1 min-w-[280px] bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center gap-2 bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rollouts:</span>
            <select
              value={iterations}
              onChange={e => setIterations(Number(e.target.value))}
              className="bg-transparent text-white focus:outline-none font-bold"
            >
              <option value={3}>3 paths</option>
              <option value={5}>5 paths</option>
              <option value={8}>8 paths</option>
            </select>
          </div>

          <button
            onClick={runMcts}
            disabled={isLoading || !prompt.trim()}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-indigo-950"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Expanding Tree...' : 'Execute MCTS Search'}
          </button>
        </div>

        {/* Quick prompt presets */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-zinc-400">
          <span>Presets:</span>
          {[
            'Factorial of n',
            'Palindrome check',
            'Nth Fibonacci',
            'Bubble sort array',
            'Prime numbers generator',
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(`Write a Python function for: ${preset}`)}
              className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {nodes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tree Nodes List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                Candidate Trajectories ({nodes.filter(n => n.id !== 'root').length})
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">Ranked by UCB1</span>
            </div>

            <div className="space-y-2.5">
              {nodes
                .filter(n => n.id !== 'root')
                .sort((a, b) => b.ucbScore - a.ucbScore)
                .map((node, index) => {
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-zinc-800/90 border-indigo-500/80 shadow-lg shadow-indigo-950/40'
                          : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-zinc-950 border border-zinc-700 text-[10px] font-mono font-bold flex items-center justify-center text-zinc-300">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            Candidate Rollout {node.id.replace('node_', '')}
                          </span>
                          {node.isBest && (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <Trophy className="w-3 h-3 text-amber-400" />
                              Best Policy
                            </span>
                          )}
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-zinc-600'}`} />
                      </div>

                      {/* Node metrics badges */}
                      <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono">
                        <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Value Q</span>
                          <span className="text-emerald-400 font-bold">{node.value.toFixed(2)}</span>
                        </div>
                        <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">UCB1</span>
                          <span className="text-indigo-300 font-bold">{node.ucbScore.toFixed(2)}</span>
                        </div>
                        <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Critic</span>
                          <span className="text-amber-400">{node.staticScore.toFixed(2)}</span>
                        </div>
                        <div className="bg-zinc-950/80 p-1.5 rounded border border-zinc-800">
                          <span className="text-zinc-500 block">Reward</span>
                          <span className="text-sky-400">{node.rewardScore.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Node Inspector & Code Viewer */}
          <div className="lg:col-span-7 space-y-4">
            {selectedNode && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white font-mono">
                        Inspecting: {selectedNode.id}
                      </h4>
                      {selectedNode.isBest && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                          Highest Scoring Policy
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Visits: {selectedNode.visits} • UCB1 Exploration Score: {selectedNode.ucbScore.toFixed(3)}
                    </p>
                  </div>

                  <button
                    onClick={() => onExecuteCode(selectedNode.code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Test in Sandbox
                  </button>
                </div>

                {/* Score Breakdown Radar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">Overall Value (Q)</span>
                    <span className="text-lg font-bold text-emerald-400">{selectedNode.value.toFixed(3)}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">Static Critic</span>
                    <span className="text-lg font-bold text-amber-400">{selectedNode.staticScore.toFixed(3)}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">Neural Reward</span>
                    <span className="text-lg font-bold text-sky-400">{selectedNode.rewardScore.toFixed(3)}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">UCB1 Metric</span>
                    <span className="text-lg font-bold text-indigo-400">{selectedNode.ucbScore.toFixed(3)}</span>
                  </div>
                </div>

                {/* Code Window */}
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                  <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                      Candidate Implementation
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">Python 3</span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                    <code>{selectedNode.code}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
          <GitBranch className="w-10 h-10 text-indigo-400/60 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-200">No MCTS Tree Generated Yet</h3>
          <p className="text-xs text-zinc-500 font-mono max-w-md mx-auto">
            Click "Execute MCTS Search" above to sample rollout branches, compute heuristic AST metrics, and find the optimal implementation.
          </p>
        </div>
      )}
    </div>
  );
};
