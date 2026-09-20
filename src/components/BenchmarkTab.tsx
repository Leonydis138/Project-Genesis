import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Terminal,
  Award,
  Sparkles,
  RefreshCw,
  Code2,
  AlertTriangle,
  GitFork,
  Gauge,
  Check,
  Download,
} from 'lucide-react';
import { Task, StaticCriticAnalysis, ComplexityResult } from '../types';

interface BenchmarkTabProps {
  initialCode?: string;
  onCodeExecuted?: (code: string) => void;
}

export const BenchmarkTab: React.FC<BenchmarkTabProps> = ({ initialCode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [code, setCode] = useState(
    initialCode ||
`def fact(n):
    """Computes the factorial of non-negative integer n.
    
    Time: O(n), Space: O(1).
    """
    if n < 0:
        raise ValueError("Must be non-negative")
    ans = 1
    for i in range(2, n + 1):
        ans *= i
    return ans`
  );
  const [testCode, setTestCode] = useState('assert fact(5)==120 and fact(0)==1');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [enforceVerification, setEnforceVerification] = useState(true);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [critic, setCritic] = useState<StaticCriticAnalysis | null>(null);
  const [complexity, setComplexity] = useState<ComplexityResult | null>(null);
  const [rewardScore, setRewardScore] = useState<number | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    try {
      const res = await fetch('/api/tasks/run-all', { method: 'POST' });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to run all benchmarks:', err);
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleExportResultsJSON = () => {
    const passedCount = tasks.filter(t => t.lastPassed).length;
    const totalCount = tasks.length;
    const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

    const exportData = {
      project: 'Project Genesis AI Laboratory',
      timestamp: new Date().toISOString(),
      passRate: `${passRate.toFixed(1)}%`,
      summary: {
        passedTasks: passedCount,
        totalTasks: totalCount,
      },
      taskLogs: tasks.map(task => ({
        id: task.id,
        name: task.name,
        category: task.category,
        difficulty: task.difficulty,
        lastPassed: task.lastPassed ?? null,
        lastRunAt: task.lastRunAt ? new Date(task.lastRunAt).toISOString() : null,
        prompt: task.prompt,
        test: task.test,
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `genesis_benchmark_results_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleVerifyComplexity = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/verify-complexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setComplexity(data);
    } catch (err: any) {
      console.error('Failed to verify complexity:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExecuteSandbox = async () => {
    setIsExecuting(true);
    setOutput('');
    setError('');
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, testCode, enforceVerification }),
      });
      const data = await res.json();
      if (data.execution) {
        setOutput(data.execution.output || (data.execution.success ? 'Execution successful. All assertions passed.' : ''));
        setError(data.execution.error || '');
        setExecTime(data.execution.executionTimeMs);
        if (data.execution.complexity) {
          setComplexity(data.execution.complexity);
        }
      }
      if (data.critic) {
        setCritic(data.critic);
        if (data.critic.complexityResult) {
          setComplexity(data.critic.complexityResult);
        }
      }
      if (data.rewardScore !== undefined) setRewardScore(data.rewardScore);
    } catch (err: any) {
      setError(err.message || 'Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const loadTask = (task: Task) => {
    setTestCode(task.test);
    // Suggest starter or existing solution
    if (task.id === 'task_factorial') {
      setCode(
`def fact(n):
    """Computes factorial of n."""
    return 1 if n <= 1 else n * fact(n - 1)`
      );
    } else if (task.id === 'task_palindrome') {
      setCode(
`def is_pal(s):
    """Checks if string is palindrome."""
    return s == s[::-1]`
      );
    } else if (task.id === 'task_fibonacci') {
      setCode(
`def fib(n):
    """Computes nth Fibonacci number."""
    if n <= 1: return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b`
      );
    } else if (task.id === 'task_bubble_sort') {
      setCode(
`def bubble_sort(arr):
    """Sorts list using bubble sort."""
    a = list(arr)
    n = len(a)
    for i in range(n):
        for j in range(0, n - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a`
      );
    } else if (task.id === 'task_sum_even') {
      setCode(
`def sum_even(numbers):
    """Returns sum of even numbers."""
    return sum(x for x in numbers if x % 2 == 0)`
      );
    } else if (task.id === 'task_timer_decorator') {
      setCode(
`import time
from functools import wraps

def timer(fn):
    """Decorator timing function execution."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = time.time()
        res = fn(*args, **kwargs)
        print(f"Elapsed: {time.time() - t0:.4f}s")
        return res
    return wrapper`
      );
    } else if (task.id === 'task_gen_primes') {
      setCode(
`def gen_primes(n):
    """Yields primes up to n."""
    for num in range(2, n + 1):
        if all(num % i != 0 for i in range(2, int(num**0.5) + 1)):
            yield num`
      );
    } else if (task.id === 'task_bst') {
      setCode(
`class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class BST:
    """Binary Search Tree."""
    def __init__(self):
        self.root = None
        
    def insert(self, val):
        if not self.root:
            self.root = Node(val)
        else:
            self._insert(self.root, val)
            
    def _insert(self, curr, val):
        if val < curr.val:
            if not curr.left: curr.left = Node(val)
            else: self._insert(curr.left, val)
        else:
            if not curr.right: curr.right = Node(val)
            else: self._insert(curr.right, val)
            
    def search(self, val):
        return self._search(self.root, val)
        
    def _search(self, curr, val):
        if not curr: return False
        if curr.val == val: return True
        return self._search(curr.left if val < curr.val else curr.right, val)`
      );
    }
  };

  const passedTasks = tasks.filter(t => t.lastPassed).length;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Project Genesis Benchmark Testbed & Code Sandbox
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-950 text-indigo-400 border border-indigo-800">
              {passedTasks} / {tasks.length} Passed
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Sections 4, 8 & 9 implementation: Real-time execution sandbox with AST static critic heuristics
            and automated unit test assertion verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportResultsJSON}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md"
            title="Export test suite results as a JSON file with timestamps, pass rate, and task logs"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Export Results JSON
          </button>

          <button
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-indigo-950"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningAll ? 'animate-spin' : ''}`} />
            Run All 8 Benchmarks
          </button>
        </div>
      </div>

      {/* Benchmark Tasks Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">
            Benchmark Task Suite (Section 4)
          </h3>
          <span className="text-xs font-mono text-zinc-500">Click any task to load into Sandbox</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => loadTask(task)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 cursor-pointer hover:border-indigo-500/60 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                    task.difficulty === 'easy'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : task.difficulty === 'medium'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {task.difficulty}
                </span>

                <span
                  className={`flex items-center gap-1 text-[11px] font-mono ${
                    task.lastPassed === true
                      ? 'text-emerald-400'
                      : task.lastPassed === false
                      ? 'text-rose-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {task.lastPassed === true && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {task.lastPassed === false && <XCircle className="w-3.5 h-3.5" />}
                  {task.lastPassed === undefined ? 'Pending' : task.lastPassed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold font-mono text-white group-hover:text-indigo-300 transition-colors">
                  {task.name}
                </h4>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5 line-clamp-2">
                  {task.prompt}
                </p>
              </div>

              <div className="pt-1 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>{task.category}</span>
                <span className="text-indigo-400 group-hover:underline">Load &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Sandbox & Static Critic Dual Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor & Execution Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  Python Code Editor & Unit Test Sandbox
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Enforce Verification Safety Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-mono select-none px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={enforceVerification}
                    onChange={e => setEnforceVerification(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 w-3 h-3"
                  />
                  <span>Enforce Formal Safety</span>
                </label>

                {/* Verify Complexity Only */}
                <button
                  onClick={handleVerifyComplexity}
                  disabled={isVerifying || isExecuting}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 disabled:opacity-50 transition-all border border-zinc-700/60"
                  title="Run ast.NodeVisitor and DiGraph call-graph cycle detection without executing code"
                >
                  <Gauge className={`w-3.5 h-3.5 text-cyan-400 ${isVerifying ? 'animate-spin' : ''}`} />
                  {isVerifying ? 'Verifying...' : 'Verify AST'}
                </button>

                {/* Run in Sandbox */}
                <button
                  onClick={handleExecuteSandbox}
                  disabled={isExecuting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-md shadow-emerald-950"
                >
                  <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                  {isExecuting ? 'Executing...' : 'Run in Sandbox'}
                </button>
              </div>
            </div>

            {/* Formal Complexity Result Card (if analyzed) */}
            {complexity && (
              <div
                className={`p-3.5 rounded-xl border font-mono text-xs transition-all ${
                  complexity.is_safe
                    ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-800/60 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {complexity.is_safe ? (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700 text-emerald-200 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        FORMAL VERIFICATION PASSED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-900/60 border border-rose-700 text-rose-200 text-[11px] font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        VERIFICATION FAILED
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-bold">
                      Bound: <span className="text-amber-400 font-extrabold">{complexity.complexity_bound}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3 text-indigo-400" />
                      {complexity.has_recursion ? (
                        <span className="text-rose-400 font-semibold">Recursive Cycle Detected</span>
                      ) : (
                        <span className="text-zinc-400">DAG Call Graph (No Recursion)</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      Loop Depth: <span className="text-zinc-200 font-bold">{complexity.max_loop_depth ?? 0}</span> / 3
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-[11px] opacity-90 text-zinc-300">
                  {complexity.reason}
                </p>
              </div>
            )}

            {/* Code Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-zinc-400 block">Implementation (Python 3):</label>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                rows={9}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Test Assertions Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-zinc-400 block">Unit Test Assertions:</label>
              <textarea
                value={testCode}
                onChange={e => setTestCode(e.target.value)}
                rows={3}
                placeholder="e.g. assert fact(5)==120 and fact(0)==1"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                spellCheck={false}
              />
            </div>

            {/* Output / Terminal Window */}
            {(output || error || execTime !== null) && (
              <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                <div className="bg-zinc-900 px-3 py-1.5 flex items-center justify-between border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                    Sandbox Execution Output
                  </span>
                  {execTime !== null && <span>Elapsed: {execTime}ms</span>}
                </div>
                <div className="p-3 text-xs font-mono space-y-1.5">
                  {output && <div className="text-emerald-400 whitespace-pre-wrap">{output}</div>}
                  {error && <div className="text-rose-400 whitespace-pre-wrap">{error}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Static Critic & Neural Reward Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Static Critic & AST Heuristics (Section 8)
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Automatically checks syntactic quality, function definitions, docstrings, variable naming, and loop limits.
              </p>
            </div>

            {critic ? (
              <div className="space-y-3">
                {/* Total Score Meter */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 font-bold">Static Critic Score:</span>
                    <span className="text-xl font-mono font-bold text-amber-400">
                      {critic.score.toFixed(2)} / 1.00
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                      style={{ width: `${critic.score * 100}%` }}
                    />
                  </div>
                </div>

                {/* Heuristic Breakdown */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <span className="text-zinc-300">Function Definitions</span>
                    <span className={critic.hasFunctions ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                      {critic.hasFunctions ? `+${critic.breakdown.functions.toFixed(2)} (${critic.functionCount} defs)` : '0.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <span className="text-zinc-300">Docstring Documentation</span>
                    <span className={critic.hasDocstrings ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                      {critic.hasDocstrings ? `+${critic.breakdown.docstrings.toFixed(2)}` : '0.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <span className="text-zinc-300">Descriptive Identifier Naming</span>
                    <span className={critic.validNaming ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                      {critic.validNaming ? `+${critic.breakdown.naming.toFixed(2)}` : '0.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <span className="text-zinc-300">Loop Complexity & Bounds</span>
                    <span className="text-emerald-400 font-bold">
                      +{critic.breakdown.complexity.toFixed(2)} ({critic.loopCount} loops)
                    </span>
                  </div>

                  {critic.complexityResult && (
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                          AST Formal Bound:
                        </span>
                        <span className="font-bold text-amber-400 font-mono">
                          {critic.complexityResult.complexity_bound}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Call-Graph Status:</span>
                        <span className={critic.complexityResult.has_recursion ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                          {critic.complexityResult.has_recursion ? 'Cycle Detected' : 'DAG (No Cycles)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Neural Reward Estimate */}
                {rewardScore !== null && (
                  <div className="bg-sky-950/30 border border-sky-800/40 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-sky-300 font-bold">Neural Reward Model Value:</span>
                    <span className="text-sky-400 font-bold text-sm">{rewardScore.toFixed(3)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 font-mono text-xs">
                Click "Run in Sandbox" to trigger Static Critic AST parsing and neural reward estimation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
