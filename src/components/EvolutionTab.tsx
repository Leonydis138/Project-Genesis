import React, { useState, useEffect } from 'react';
import { Dna, Trophy, Sparkles, TrendingUp, RefreshCw, Cpu, Award } from 'lucide-react';
import { EvolutionIndividual } from '../types';
import { fetchJson } from '../lib/http';

export const EvolutionTab: React.FC = () => {
  const [population, setPopulation] = useState<EvolutionIndividual[]>([]);
  const [round, setRound] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [activeConfig, setActiveConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchEvolution();
  }, []);

  const fetchEvolution = async () => {
    try {
      const data = await fetchJson<{ population?: EvolutionIndividual[]; round?: number; history?: any[]; activeConfig?: any }>('/api/evolution', undefined, { timeoutMs: 10000 });
      if (data.population) setPopulation(data.population);
      if (data.round !== undefined) setRound(data.round);
      if (data.history) setHistory(data.history);
      if (data.activeConfig) setActiveConfig(data.activeConfig);
    } catch (err) {
      console.error('Failed to fetch evolution:', err);
    }
  };

  const handleStepEvolution = async () => {
    setIsLoading(true);
    try {
      const data = await fetchJson<{ population?: EvolutionIndividual[]; round?: number }>('/api/evolution/step', { method: 'POST' }, { timeoutMs: 15000 });
      if (data.population) setPopulation(data.population);
      if (data.round !== undefined) setRound(data.round);
      await fetchEvolution();
    } catch (err) {
      console.error('Failed to step evolution:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Evolutionary Hyperparameter Optimization Chamber
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
              Generation #{round}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Section 14 implementation: Genetic algorithm maintains a population of candidate hyperparameters
            (Temperature, Top-p, Repetition Penalty). The top-performing chromosomes undergo crossover & Gaussian mutation
            to optimize reasoning accuracy.
          </p>
        </div>

        <button
          onClick={handleStepEvolution}
          disabled={isLoading}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-emerald-950"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Step Generation (Breed & Mutate)
        </button>
      </div>

      {/* Active Champion Hyperparameters Banner */}
      {activeConfig && (
        <div className="bg-zinc-950 border border-emerald-900/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold text-emerald-300">
              Active Deployed Configuration (Champion Chromosome):
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-zinc-500">Temperature: </span>
              <span className="text-amber-300 font-bold">{activeConfig.temperature}</span>
            </div>
            <div>
              <span className="text-zinc-500">Top-p: </span>
              <span className="text-cyan-300 font-bold">{activeConfig.top_p}</span>
            </div>
            <div>
              <span className="text-zinc-500">Repetition Penalty: </span>
              <span className="text-indigo-300 font-bold">{activeConfig.repetition_penalty}</span>
            </div>
          </div>
        </div>
      )}

      {/* Population Chromosomes Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">
          Current Population Chromosomes ({population.length} Individuals)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {population.map((ind, idx) => {
            const isChampion = idx === 0;
            const isRunnerUp = idx === 1;

            return (
              <div
                key={ind.id}
                className={`bg-zinc-900/90 border rounded-2xl p-4 space-y-3 transition-all ${
                  isChampion
                    ? 'border-amber-500/60 shadow-lg shadow-amber-950/20'
                    : isRunnerUp
                    ? 'border-emerald-500/40'
                    : 'border-zinc-800'
                }`}
              >
                {/* Header & Rank */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] font-mono font-bold flex items-center justify-center border ${
                        isChampion
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : isRunnerUp
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{ind.id}</span>
                  </div>

                  {isChampion && (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      Active Parent 1
                    </span>
                  )}
                  {isRunnerUp && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Active Parent 2
                    </span>
                  )}
                </div>

                {/* Fitness Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Fitness:</span>
                    <span className="text-emerald-400 font-bold">{ind.fitness.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ind.fitness * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Gene details */}
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono pt-1">
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 text-center">
                    <span className="text-zinc-500 text-[10px] block">Temp</span>
                    <span className="text-amber-300 font-bold">{ind.temp.toFixed(2)}</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 text-center">
                    <span className="text-zinc-500 text-[10px] block">Top-p</span>
                    <span className="text-cyan-300 font-bold">{ind.top_p.toFixed(2)}</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 text-center">
                    <span className="text-zinc-500 text-[10px] block">Rep Pen</span>
                    <span className="text-indigo-300 font-bold">{ind.rep_penalty.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Genetic Operators Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Genetic Algorithm Operators (Section 14)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span>🧬 Crossover Operator (Child 1)</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Takes Parent 1 (Rank #1) and Parent 2 (Rank #2) and computes the chromosome midpoint:
              <br />
              <code className="text-cyan-300 mt-1 block">
                child1 = (parent1[gene] + parent2[gene]) / 2.0
              </code>
            </p>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span>⚡ Gaussian Mutation Operator (Child 2)</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Introduces stochastic exploratory variance on temperature, top-p, and penalty bounds:
              <br />
              <code className="text-amber-300 mt-1 block">
                child2 = child1[gene] + uniform(-delta, +delta)
              </code>
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-mono font-bold text-zinc-400 mb-2">Generation History Drift:</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {history.slice(-5).reverse().map(h => (
                <div key={h.round} className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono">
                  <span className="text-emerald-400">Gen #{h.round}</span>
                  <span className="text-zinc-300">Mean Fitness: {h.avgFitness}</span>
                  <span className="text-amber-300">Best Temp: {h.best.temp}</span>
                  <span className="text-cyan-300">Best Top-p: {h.best.top_p}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
