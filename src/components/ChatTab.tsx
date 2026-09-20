import React, { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, ThumbsDown, Play, Copy, Check, Sparkles, ShieldAlert, Cpu, Terminal, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { ChatMessage, DebateTurn } from '../types';

interface ChatTabProps {
  messages: ChatMessage[];
  onSendMessage: (prompt: string, mode: 'debate' | 'mcts' | 'direct') => Promise<void>;
  onRateResponse: (messageId: string, rating: number) => Promise<void>;
  onExecuteCode: (code: string) => void;
  isLoading: boolean;
}

const PRESET_PROMPTS = [
  'Write a Python function that returns the factorial of n.',
  'Write a function to check if a string is a palindrome.',
  'Implement a function that computes the nth Fibonacci number.',
  'Write a function that sorts a list of integers using bubble sort.',
  'Create a function that returns the sum of all even numbers in a list.',
  'Write a generator that yields prime numbers up to n.',
  'Implement a binary search tree with insert and search methods.',
  'Write a decorator that prints the execution time of a function.',
];

export const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  onSendMessage,
  onRateResponse,
  onExecuteCode,
  isLoading,
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'debate' | 'mcts' | 'direct'>('debate');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const promptToSend = input.trim();
    setInput('');
    onSendMessage(promptToSend, mode);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleTranscript = (id: string) => {
    setExpandedTranscripts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleContext = (id: string) => {
    setExpandedContexts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Extract clean code block from response
  const extractCode = (content: string): string => {
    if (content.includes('```python')) {
      return content.split('```python')[1].split('```')[0].trim();
    }
    if (content.includes('```')) {
      return content.split('```')[1].split('```')[0].trim();
    }
    return content;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto p-4 gap-4">
      {/* Mode Selector & Quick Presets */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-rose-400" />
            Reasoning Mode:
          </span>
          <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
            <button
              onClick={() => setMode('debate')}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
                mode === 'debate'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Multi-Agent Debate
            </button>
            <button
              onClick={() => setMode('mcts')}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
                mode === 'mcts'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              MCTS Planner
            </button>
            <button
              onClick={() => setMode('direct')}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
                mode === 'direct'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Direct Policy
            </button>
          </div>
        </div>

        {/* Quick prompt pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[11px] font-mono text-zinc-400 whitespace-nowrap">Examples:</span>
          {PRESET_PROMPTS.slice(0, 3).map((p, idx) => (
            <button
              key={idx}
              onClick={() => setInput(p)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white whitespace-nowrap transition-all"
            >
              {p.length > 28 ? p.slice(0, 28) + '...' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <Terminal className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Project Genesis Active</h2>
            <p className="text-sm text-zinc-400 max-w-md mb-6">
              Ask any algorithmic or software engineering task. Genesis uses episodic memory retrieval,
              runs Multi-Agent Debate between explorer and critic agents, or plans via MCTS rollouts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {PRESET_PROMPTS.slice(0, 4).map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(preset)}
                  className="text-left text-xs font-mono p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-rose-500/40 hover:text-white transition-all"
                >
                  ⚡ {preset}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-2xl bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-3 border border-zinc-700 font-mono text-sm shadow-md">
                  <div className="text-[10px] text-zinc-400 mb-1 font-bold">YOU</div>
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-3xl w-full bg-zinc-900/95 border border-zinc-800 rounded-2xl rounded-tl-sm p-4 shadow-xl text-zinc-200 space-y-3">
                  {/* Assistant Header & Mode Badge */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold font-mono text-xs text-white">GENESIS AGENT</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {msg.mode?.toUpperCase() || 'DEBATE'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Retrieved Episodic Memory Accordion */}
                  {msg.context && msg.context.length > 0 && (
                    <div className="border border-sky-900/40 bg-sky-950/20 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleContext(msg.id)}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-mono text-sky-400 hover:bg-sky-900/20 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          Retrieved Episodic Memory ({msg.context.length} traces)
                        </span>
                        {expandedContexts[msg.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {expandedContexts[msg.id] && (
                        <div className="p-3 bg-zinc-950/80 border-t border-sky-900/30 text-xs font-mono text-zinc-300 space-y-2 max-h-48 overflow-y-auto">
                          {msg.context.map((c, i) => (
                            <div key={i} className="p-2 rounded bg-zinc-900 border border-zinc-800 whitespace-pre-wrap">
                              {c}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-Agent Debate Transcript Accordion */}
                  {msg.transcript && msg.transcript.length > 0 && (
                    <div className="border border-amber-900/40 bg-amber-950/20 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleTranscript(msg.id)}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-mono text-amber-400 hover:bg-amber-900/20 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Multi-Agent Debate Transcript ({msg.transcript.length} turns)
                        </span>
                        {expandedTranscripts[msg.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {expandedTranscripts[msg.id] && (
                        <div className="p-3 bg-zinc-950/90 border-t border-amber-900/30 space-y-2.5 max-h-64 overflow-y-auto">
                          {msg.transcript.map((turn: DebateTurn, idx: number) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-lg border text-xs font-mono ${
                                turn.role === 'explorer'
                                  ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                                  : turn.role === 'critic'
                                  ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-200'
                                  : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1 text-[11px] font-bold opacity-90">
                                <span>{turn.agent}</span>
                                <span>Temp: {turn.temperature.toFixed(2)}</span>
                              </div>
                              <p className="whitespace-pre-wrap">{turn.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Response Text / Solution */}
                  <div className="text-sm font-sans whitespace-pre-wrap leading-relaxed">
                    {msg.content.includes('```') ? (
                      <div>
                        {msg.content.split(/```python|```/).map((part, index) => {
                          if (index % 2 === 1) {
                            // Code block
                            return (
                              <div key={index} className="my-3 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
                                <div className="bg-zinc-900 px-3 py-1.5 flex items-center justify-between border-b border-zinc-800">
                                  <span className="text-[11px] font-mono text-zinc-400">Python 3 Implementation</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => onExecuteCode(part.trim())}
                                      className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 transition-colors"
                                      title="Run in Code Execution Sandbox"
                                    >
                                      <Play className="w-3 h-3" />
                                      Run in Sandbox
                                    </button>
                                    <button
                                      onClick={() => handleCopy(part.trim(), `${msg.id}_${index}`)}
                                      className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                                    >
                                      {copiedId === `${msg.id}_${index}` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          Copy
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-5">
                                  <code>{part.trim()}</code>
                                </pre>
                              </div>
                            );
                          } else {
                            return <p key={index}>{part.trim()}</p>;
                          }
                        })}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>

                  {/* RLHF Thumbs Up/Down Feedback Area (Matching section 18 of prompt) */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 font-mono">Was this helpful?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onRateResponse(msg.id, 1)}
                          disabled={msg.rated}
                          className={`p-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1 ${
                            msg.rated && msg.rating === 1
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-600'
                              : 'bg-zinc-800/60 text-zinc-300 border-zinc-700 hover:bg-emerald-950/50 hover:text-emerald-300 hover:border-emerald-600/50'
                          } disabled:cursor-not-allowed`}
                          title="Reward Model Feedback: +1.0"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>👍</span>
                        </button>
                        <button
                          onClick={() => onRateResponse(msg.id, 0)}
                          disabled={msg.rated}
                          className={`p-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1 ${
                            msg.rated && msg.rating === 0
                              ? 'bg-rose-950 text-rose-400 border-rose-600'
                              : 'bg-zinc-800/60 text-zinc-300 border-zinc-700 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-600/50'
                          } disabled:cursor-not-allowed`}
                          title="Reward Model Feedback: 0.0"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>👎</span>
                        </button>
                      </div>
                    </div>

                    {msg.rated && (
                      <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40 animate-fade-in">
                        <span>Reward weights updated</span>
                        {msg.loss !== undefined && (
                          <span className="text-zinc-400">(Loss: {msg.loss.toFixed(4)})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm p-4 text-zinc-200 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-zinc-300">
                Project Genesis {mode === 'debate' ? 'conducting Multi-Agent Debate...' : 'expanding MCTS tree rollouts...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-2 focus-within:border-zinc-700 shadow-2xl">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a coding question or benchmark task (e.g. Write a Python function for Fibonacci)..."
            className="flex-1 bg-transparent px-3 py-2 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-all shadow-md shadow-rose-950"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
