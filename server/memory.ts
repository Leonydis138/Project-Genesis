import { EpisodicMemoryItem, SemanticNode, SemanticEdge, KnowledgeGraph } from './types';

export class HybridMemory {
  private episodicList: EpisodicMemoryItem[] = [];
  private nodes: Map<string, SemanticNode> = new Map();
  private edges: SemanticEdge[] = [];
  private readonly dim = 64;

  constructor() {
    this.seedInitialKnowledge();
  }

  // Pre-seed core knowledge graph reflecting the TASKS in Section 4
  private seedInitialKnowledge() {
    const seedNodes: SemanticNode[] = [
      { id: 'factorial', label: 'factorial(n)', category: 'function', details: 'Computes n! via recursion or iteration' },
      { id: 'recursion', label: 'Recursion', category: 'concept', details: 'Base case & recursive step paradigm' },
      { id: 'palindrome', label: 'is_palindrome(s)', category: 'function', details: 'Checks string symmetry' },
      { id: 'two_pointers', label: 'Two Pointers', category: 'heuristic', details: 'O(n) time, O(1) space traversal' },
      { id: 'fibonacci', label: 'fibonacci(n)', category: 'function', details: 'Computes nth Fibonacci number' },
      { id: 'memoization', label: 'Memoization', category: 'heuristic', details: 'Caches results to achieve O(n) complexity' },
      { id: 'bubble_sort', label: 'bubble_sort(arr)', category: 'function', details: 'Adjacent comparison sorting' },
      { id: 'sorting', label: 'Sorting Algorithm', category: 'concept', details: 'Orders elements monotonically' },
      { id: 'prime_generator', label: 'gen_primes(n)', category: 'function', details: 'Yields prime numbers lazily' },
      { id: 'generator', label: 'Python Generator', category: 'concept', details: 'Yield expressions with state retention' },
      { id: 'bst', label: 'BinarySearchTree', category: 'concept', details: 'Left < Root < Right ordered tree structure' },
      { id: 'decorator', label: '@timer decorator', category: 'function', details: 'Wraps function with execution telemetry' },
      { id: 'ppo_policy', label: 'PPO Policy Gradient', category: 'concept', details: 'Clipped objective surrogate optimization' },
      { id: 'mcts', label: 'MCTS Rollouts', category: 'concept', details: 'Monte Carlo Tree Search with UCB1 exploration' },
      { id: 'rlaif', label: 'RLAIF Distillation', category: 'concept', details: 'Reinforcement Learning from AI Feedback' }
    ];

    seedNodes.forEach(n => this.nodes.set(n.id, n));

    const seedEdges: SemanticEdge[] = [
      { id: 'e1', source: 'factorial', target: 'recursion', relation: 'implements', weight: 0.9 },
      { id: 'e2', source: 'palindrome', target: 'two_pointers', relation: 'optimizes', weight: 0.85 },
      { id: 'e3', source: 'fibonacci', target: 'memoization', relation: 'optimizes', weight: 0.95 },
      { id: 'e4', source: 'bubble_sort', target: 'sorting', relation: 'implements', weight: 0.9 },
      { id: 'e5', source: 'prime_generator', target: 'generator', relation: 'implements', weight: 0.9 },
      { id: 'e6', source: 'bst', target: 'recursion', relation: 'depends_on', weight: 0.8 },
      { id: 'e7', source: 'decorator', target: 'mcts', relation: 'related_to', weight: 0.7 },
      { id: 'e8', source: 'ppo_policy', target: 'rlaif', relation: 'solves', weight: 0.95 },
      { id: 'e9', source: 'mcts', target: 'ppo_policy', relation: 'optimizes', weight: 0.9 },
    ];

    this.edges.push(...seedEdges);

    // Initial episodic memories from TASKS
    this.addEpisodic(
      'Task: Write a Python function that returns the factorial of n.\nSolution: def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)',
      'factorial',
      'def fact(n): return 1 if n <= 1 else n * fact(n - 1)',
      1.0,
      ['math', 'recursion', 'benchmark']
    );

    this.addEpisodic(
      'Task: Write a function to check if a string is a palindrome.\nSolution: def is_pal(s):\n    return s == s[::-1]',
      'palindrome',
      'def is_pal(s): return s == s[::-1]',
      1.0,
      ['string', 'symmetry', 'benchmark']
    );

    this.addEpisodic(
      'Task: Implement a function that computes the nth Fibonacci number.\nSolution: def fib(n, memo={}):\n    if n in memo: return memo[n]\n    if n <= 1: return n\n    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)\n    return memo[n]',
      'fibonacci',
      'def fib(n, memo={}): ...',
      0.95,
      ['memoization', 'dynamic_programming']
    );
  }

  // Lightweight 64-dim vector embedding with cosine similarity
  private embedText(text: string): number[] {
    const vector = new Array(this.dim).fill(0);
    const words = text.toLowerCase().match(/\b[a-z0-9_]{2,}\b/g) || [];
    if (words.length === 0) return vector;

    words.forEach((w) => {
      let hash = 0;
      for (let j = 0; j < w.length; j++) {
        hash = (hash << 5) - hash + w.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % this.dim;
      vector[idx] += 1.0;
    });

    // L2 normalize
    const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0)) || 1.0;
    return vector.map(v => v / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  // Episodic Memory Management
  public addEpisodic(text: string, prompt?: string, solution?: string, reward: number = 0.8, tags: string[] = []): EpisodicMemoryItem {
    const item: EpisodicMemoryItem = {
      id: `ep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      prompt,
      solution,
      reward,
      timestamp: Date.now(),
      embedding: this.embedText(text),
      tags,
    };
    this.episodicList.unshift(item);
    if (this.episodicList.length > 200) {
      this.episodicList.pop();
    }
    return item;
  }

  public retrieveEpisodic(query: string, k: number = 3): string[] {
    if (this.episodicList.length === 0) return [];
    const queryEmb = this.embedText(query);

    const scored = this.episodicList.map(item => ({
      item,
      similarity: item.embedding ? this.cosineSimilarity(queryEmb, item.embedding) : 0,
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, Math.min(k, scored.length)).map(s => s.item.text);
  }

  public getEpisodicList(): EpisodicMemoryItem[] {
    return this.episodicList;
  }

  // Semantic Knowledge Graph Management
  public addSemantic(concept1: string, concept2: string, relation: SemanticEdge['relation']): void {
    const c1Id = concept1.toLowerCase().trim().replace(/\s+/g, '_');
    const c2Id = concept2.toLowerCase().trim().replace(/\s+/g, '_');

    if (!this.nodes.has(c1Id)) {
      this.nodes.set(c1Id, {
        id: c1Id,
        label: concept1,
        category: 'function',
      });
    }
    if (!this.nodes.has(c2Id)) {
      this.nodes.set(c2Id, {
        id: c2Id,
        label: concept2,
        category: 'concept',
      });
    }

    const edgeExists = this.edges.some(e => e.source === c1Id && e.target === c2Id && e.relation === relation);
    if (!edgeExists) {
      this.edges.push({
        id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        source: c1Id,
        target: c2Id,
        relation,
        weight: 1.0,
      });
    }
  }

  public retrieveSemantic(concept: string, depth: number = 1): string[] {
    const conceptId = concept.toLowerCase().trim().replace(/\s+/g, '_');
    const visited = new Set<string>();
    const queue: [string, number][] = [[conceptId, 0]];
    const neighbors = new Set<string>();

    while (queue.length > 0) {
      const [curr, d] = queue.shift()!;
      if (d >= depth) continue;

      for (const edge of this.edges) {
        if (edge.source === curr && !visited.has(edge.target)) {
          visited.add(edge.target);
          neighbors.add(edge.target);
          queue.push([edge.target, d + 1]);
        } else if (edge.target === curr && !visited.has(edge.source)) {
          visited.add(edge.source);
          neighbors.add(edge.source);
          queue.push([edge.source, d + 1]);
        }
      }
    }

    return Array.from(neighbors);
  }

  public getGraph(): KnowledgeGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  public getMemoryCount(): number {
    return this.episodicList.length;
  }
}
