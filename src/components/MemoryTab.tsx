import React, { useState, useEffect } from 'react';
import { Brain, Network, Search, Plus, Layers, Tag, ArrowRight, Share2, Sparkles } from 'lucide-react';
import { EpisodicMemoryItem, KnowledgeGraph, SemanticNode, SemanticEdge } from '../types';
import { D3ForceGraph } from './D3ForceGraph';
import { fetchJson } from '../lib/http';

interface MemoryTabProps {
  onExecuteCode: (code: string) => void;
}

export const MemoryTab: React.FC<MemoryTabProps> = ({ onExecuteCode }) => {
  const [activeSubTab, setActiveSubTab] = useState<'episodic' | 'semantic'>('episodic');
  const [episodicList, setEpisodicList] = useState<EpisodicMemoryItem[]>([]);
  const [graph, setGraph] = useState<KnowledgeGraph>({ nodes: [], edges: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New relationship form
  const [concept1, setConcept1] = useState('');
  const [concept2, setConcept2] = useState('');
  const [relation, setRelation] = useState<SemanticEdge['relation']>('solves');
  const [addMsg, setAddMsg] = useState('');

  // Semantic query tester
  const [semanticQuery, setSemanticQuery] = useState('fibonacci');
  const [connectedNodes, setConnectedNodes] = useState<string[]>([]);

  useEffect(() => {
    fetchMemory();
  }, []);

  const fetchMemory = async () => {
    try {
      const data = await fetchJson<{ episodic?: EpisodicMemoryItem[]; graph?: KnowledgeGraph }>('/api/memory', undefined, { timeoutMs: 10000 });
      if (data.episodic) setEpisodicList(data.episodic);
      if (data.graph) setGraph(data.graph);
    } catch (err) {
      console.error('Failed to fetch memory:', err);
    }
  };

  const handleVectorSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = episodicList.filter(item =>
      item.text.toLowerCase().includes(q) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
    );
    setSearchResults(matches.map(m => m.text));
  };

  const handleAddSemantic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept1.trim() || !concept2.trim()) return;
    setIsLoading(true);
    try {
      const data = await fetchJson<{ graph?: KnowledgeGraph }>('/api/memory/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept1, concept2, relation }),
      }, { timeoutMs: 15000 });
      if (data.graph) {
        setGraph(data.graph);
        setAddMsg(`Linked "${concept1}" --[${relation}]--> "${concept2}"`);
        setConcept1('');
        setConcept2('');
        setTimeout(() => setAddMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreSemantic = (query: string) => {
    setSemanticQuery(query);
    const target = query.toLowerCase().trim().replace(/\s+/g, '_');
    const neighbors = new Set<string>();

    graph.edges.forEach(edge => {
      if (edge.source.toLowerCase() === target) {
        neighbors.add(edge.target);
      } else if (edge.target.toLowerCase() === target) {
        neighbors.add(edge.source);
      }
    });

    setConnectedNodes(Array.from(neighbors));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('episodic')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'episodic'
                ? 'bg-sky-950/80 text-sky-300 border border-sky-700/60 shadow-md shadow-sky-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Brain className="w-4 h-4 text-sky-400" />
            Episodic Vector Memory ({episodicList.length} items)
          </button>

          <button
            onClick={() => setActiveSubTab('semantic')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'semantic'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-md shadow-cyan-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Network className="w-4 h-4 text-cyan-400" />
            Semantic Knowledge Graph ({graph.nodes.length} nodes / {graph.edges.length} edges)
          </button>
        </div>

        <button
          onClick={fetchMemory}
          className="text-xs font-mono text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800"
        >
          Refresh Store
        </button>
      </div>

      {activeSubTab === 'episodic' ? (
        <div className="space-y-4">
          {/* Vector Search Input */}
          <form onSubmit={handleVectorSearch} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-400 ml-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Query episodic memory vectors with cosine similarity (e.g. 'factorial recursion', 'fibonacci memoization')..."
                className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-md shadow-sky-950"
              >
                Search Vectors
              </button>
            </div>
          </form>

          {/* Search Result Matches if any */}
          {searchResults.length > 0 && (
            <div className="bg-sky-950/20 border border-sky-800/40 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-mono font-bold text-sky-300">
                Vector Matches for "{searchQuery}":
              </div>
              <div className="space-y-2">
                {searchResults.map((res, i) => (
                  <div key={i} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                    {res}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Episodic Items Feed */}
          <div className="space-y-3">
            <div className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">
              Episodic Memory Bank (FAISS Normalized L2 64-dim)
            </div>

            {episodicList.map(item => (
              <div
                key={item.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 hover:border-zinc-700 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-300">
                      {item.prompt || 'Memory Trace'}
                    </span>
                    {item.reward !== undefined && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Reward: {item.reward.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-xs font-mono text-zinc-300 whitespace-pre-wrap bg-zinc-950 p-3 rounded-lg border border-zinc-800/60">
                  {item.text}
                </div>

                {item.solution && (
                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => onExecuteCode(item.solution!)}
                      className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Test Memory Code in Sandbox
                    </button>
                  </div>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {item.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add Semantic Relationship Form */}
          <form onSubmit={handleAddSemantic} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Add Semantic Knowledge Relation (NetworkX Graph)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                value={concept1}
                onChange={e => setConcept1(e.target.value)}
                placeholder="Concept 1 (e.g. quicksort)"
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />

              <select
                value={relation}
                onChange={e => setRelation(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="solves">solves</option>
                <option value="optimizes">optimizes</option>
                <option value="implements">implements</option>
                <option value="depends_on">depends_on</option>
                <option value="related_to">related_to</option>
              </select>

              <input
                type="text"
                value={concept2}
                onChange={e => setConcept2(e.target.value)}
                placeholder="Concept 2 (e.g. divide_and_conquer)"
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />

              <button
                type="submit"
                disabled={isLoading || !concept1.trim() || !concept2.trim()}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all shadow-md shadow-cyan-950"
              >
                <Share2 className="w-3.5 h-3.5" />
                Commit Edge
              </button>
            </div>

            {addMsg && (
              <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800">
                {addMsg}
              </div>
            )}
          </form>

          {/* Interactive Topology Graph Visualizer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  Semantic Graph Neighborhood & Relational Topology
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Click any concept node to query its connected neighbors up to depth 1.
                </p>
              </div>

              {/* Semantic search explorer */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={e => handleExploreSemantic(e.target.value)}
                  placeholder="Target concept..."
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Connected neighbors inspection */}
            {connectedNodes.length > 0 && (
              <div className="bg-cyan-950/20 border border-cyan-800/40 p-3 rounded-xl flex items-center gap-2 text-xs font-mono flex-wrap">
                <span className="text-cyan-300 font-bold">Neighbors of "{semanticQuery}":</span>
                {connectedNodes.map(n => (
                  <span
                    key={n}
                    onClick={() => handleExploreSemantic(n)}
                    className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 cursor-pointer hover:border-cyan-400 transition-colors"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            {/* D3.js Force-Directed Interactive Graph Visualizer */}
            <D3ForceGraph
              graph={graph}
              selectedConcept={semanticQuery}
              onSelectNode={handleExploreSemantic}
            />

            {/* Nodes catalog table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {graph.nodes.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleExploreSemantic(n.id)}
                  className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-left hover:border-cyan-500/50 transition-colors"
                >
                  <div className="text-xs font-mono font-bold text-zinc-200 truncate">{n.label}</div>
                  <div className="text-[10px] font-mono text-zinc-500">{n.category}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
