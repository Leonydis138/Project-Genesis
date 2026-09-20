import { StaticCriticAnalysis } from './types';
import { CodeSandbox } from './sandbox';

// ---------- Section 8: Critic Model (Static Analysis) ----------
export class StaticCritic {
  static analyze(code: string): StaticCriticAnalysis {
    let score = 0.0;
    const breakdown = {
      functions: 0,
      docstrings: 0,
      naming: 0,
      complexity: 0,
    };

    if (!code || code.trim().length === 0) {
      return {
        score: 0,
        hasFunctions: false,
        functionCount: 0,
        hasDocstrings: false,
        docstringCount: 0,
        validNaming: false,
        loopCount: 0,
        complexityScore: 0,
        complexityResult: {
          is_safe: false,
          complexity_bound: 'Unknown',
          reason: 'Empty code string provided',
          max_loop_depth: 0,
          has_recursion: false,
        },
        breakdown,
      };
    }

    // Run formal AST Complexity verification
    const complexityResult = CodeSandbox.verifyComplexity(code);

    // 1. Function definitions (def func_name(...) or function / const f = () =>)
    const pythonFuncMatches = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g) || [];
    const jsFuncMatches = code.match(/(?:function\s+([a-zA-Z_][a-zA-Z0-9_]*)|const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_][a-zA-Z0-9_]*)\s*=>)/g) || [];
    const functionCount = pythonFuncMatches.length + jsFuncMatches.length;
    const hasFunctions = functionCount > 0;
    if (hasFunctions) {
      breakdown.functions = 0.3;
      score += 0.3;
    }

    // 2. Docstrings & documentation (triple quotes """ or ''' or /** ... */ or leading comments)
    const docstringMatches = code.match(/("""[\s\S]*?"""|'''[\s\S]*?'''|\/\*\*[\s\S]*?\*\/)/g) || [];
    const docstringCount = docstringMatches.length;
    const hasDocstrings = docstringCount > 0 || /#\s+[A-Za-z0-9]/.test(code);
    if (hasDocstrings) {
      breakdown.docstrings = 0.2;
      score += 0.2;
    }

    // 3. Variable naming heuristic (all variables > 1 character, not single letters like a, b, c except loop indexes)
    const identifierMatches = code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    // Filter out common reserved words
    const reserved = new Set([
      'def', 'return', 'if', 'else', 'elif', 'for', 'in', 'while', 'import', 'from',
      'as', 'class', 'try', 'except', 'finally', 'with', 'assert', 'yield', 'lambda',
      'None', 'True', 'False', 'function', 'const', 'let', 'var', 'and', 'or', 'not'
    ]);
    const identifiers = identifierMatches.filter(id => !reserved.has(id));
    const singleLetterIds = identifiers.filter(id => id.length === 1 && !['i', 'j', 'k', 'n', 'x'].includes(id));
    const validNaming = identifiers.length > 0 && (singleLetterIds.length / Math.max(1, identifiers.length) < 0.15);
    if (validNaming) {
      breakdown.naming = 0.2;
      score += 0.2;
    }

    // 4. Complexity checking (AST graph cycle detection & max loop nesting)
    const loopMatches = code.match(/\b(for|while)\b/g) || [];
    const loopCount = Math.max(loopMatches.length, complexityResult.max_loop_depth || 0);

    if (complexityResult.is_safe) {
      breakdown.complexity = 0.3;
      score += 0.3;
    } else if (complexityResult.has_recursion) {
      // Recursive cycle without guaranteed termination / O(2^n)
      breakdown.complexity = 0.1;
      score += 0.1;
    } else if (complexityResult.max_loop_depth && complexityResult.max_loop_depth > 3) {
      // Excessive loop nesting O(n^k)
      breakdown.complexity = 0.05;
      score += 0.05;
    } else if (loopCount <= 2) {
      breakdown.complexity = 0.3;
      score += 0.3;
    } else if (loopCount <= 4) {
      breakdown.complexity = 0.15;
      score += 0.15;
    }

    return {
      score: Math.min(1.0, Math.round(score * 100) / 100),
      hasFunctions,
      functionCount,
      hasDocstrings,
      docstringCount,
      validNaming,
      loopCount,
      complexityScore: breakdown.complexity,
      complexityResult,
      breakdown,
    };
  }
}

// ---------- Section 7: Reward Model (Neural + TF-IDF) ----------
export class RewardModel {
  private dim: number = 64;
  private weights1: number[][]; // dim x 32
  private weights2: number[]; // 32 x 1
  private bias2: number = 0.05;
  private vocabulary: Map<string, number> = new Map();
  private tfidfWeights: Map<string, number> = new Map();
  private trainingHistory: { textSnippet: string; rating: number; pred: number; loss: number; timestamp: number }[] = [];
  public currentLoss: number = 0.3421;

  constructor() {
    // Initialize neural weights pseudo-randomly
    this.weights1 = Array.from({ length: this.dim }, () =>
      Array.from({ length: 32 }, () => (Math.random() - 0.5) * 0.2)
    );
    this.weights2 = Array.from({ length: 32 }, () => (Math.random() - 0.5) * 0.2);

    // Seed positive programming terms in vocabulary
    const seedTerms = [
      'def', 'return', 'docstring', 'assert', 'test', 'clean', 'algorithm',
      'optimal', 'efficient', 'pass', 'solution', 'complexity', 'memoize', 'handle'
    ];
    seedTerms.forEach((term, idx) => {
      this.vocabulary.set(term, idx);
      this.tfidfWeights.set(term, 0.4 + Math.random() * 0.4);
    });
  }

  // Generate lightweight 64-dim embedding from text
  private embedText(text: string): number[] {
    const vector = new Array(this.dim).fill(0);
    const words = text.toLowerCase().match(/\b[a-z0-9_]{2,}\b/g) || [];
    if (words.length === 0) return vector;

    words.forEach((w, i) => {
      let hash = 0;
      for (let j = 0; j < w.length; j++) {
        hash = (hash << 5) - hash + w.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % this.dim;
      vector[idx] += 1.0 / Math.sqrt(words.length);
    });
    return vector;
  }

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
  }

  public predictReward(text: string): number {
    const emb = this.embedText(text);

    // Neural pass: fc1 -> ReLU -> fc2 -> Sigmoid
    const hidden = new Array(32).fill(0);
    for (let j = 0; j < 32; j++) {
      let sum = 0;
      for (let i = 0; i < this.dim; i++) {
        sum += emb[i] * this.weights1[i][j];
      }
      hidden[j] = Math.max(0, sum); // ReLU
    }

    let neuralZ = this.bias2;
    for (let j = 0; j < 32; j++) {
      neuralZ += hidden[j] * this.weights2[j];
    }
    const neuralScore = this.sigmoid(neuralZ);

    // TF-IDF score pass
    const words = text.toLowerCase().match(/\b[a-z0-9_]{2,}\b/g) || [];
    let tfidfSum = 0;
    let matchedWords = 0;
    words.forEach(w => {
      if (this.tfidfWeights.has(w)) {
        tfidfSum += this.tfidfWeights.get(w)!;
        matchedWords++;
      }
    });
    const tfidfScore = matchedWords > 0 ? Math.min(1.0, tfidfSum / Math.max(1, matchedWords)) : 0.5;

    // Combined score: (neural + tfidf) / 2
    const combined = (neuralScore * 0.6 + tfidfScore * 0.4);
    return Math.min(0.99, Math.max(0.05, Math.round(combined * 1000) / 1000));
  }

  public updateReward(text: string, rating: number): number {
    const pred = this.predictReward(text);
    const target = Math.max(0, Math.min(1, rating));

    // Binary Cross Entropy Loss: - (y * log(p) + (1-y) * log(1-p))
    const eps = 1e-7;
    const loss = -(target * Math.log(pred + eps) + (1 - target) * Math.log(1 - pred + eps));
    this.currentLoss = Math.round(loss * 10000) / 10000;

    // Gradient descent step on weights
    const err = pred - target;
    const emb = this.embedText(text);
    const lr = 0.05;

    for (let j = 0; j < 32; j++) {
      this.weights2[j] -= lr * err * 0.1;
    }
    this.bias2 -= lr * err * 0.1;

    // Update TF-IDF terms
    const words = text.toLowerCase().match(/\b[a-z0-9_]{2,}\b/g) || [];
    words.forEach(w => {
      const cur = this.tfidfWeights.get(w) || 0.5;
      const updated = cur + (target - cur) * 0.15;
      this.tfidfWeights.set(w, Math.max(0.01, Math.min(0.99, updated)));
    });

    this.trainingHistory.push({
      textSnippet: text.slice(0, 80),
      rating: target,
      pred,
      loss: this.currentLoss,
      timestamp: Date.now(),
    });
    if (this.trainingHistory.length > 50) this.trainingHistory.shift();

    return this.currentLoss;
  }

  public getHistory() {
    return this.trainingHistory;
  }
}
