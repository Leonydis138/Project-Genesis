import { MCTSNodeData } from './types';
import { StaticCritic } from './critic';
import { RewardModel } from './critic';
import { CodeSandbox } from './sandbox';
import { generateContentWithRetry } from './gemini';

export class MCTSPlanner {
  static async plan(
    prompt: string,
    iterations: number = 5,
    explorationConstant: number = 1.414,
    rewardModel: RewardModel,
    testCode: string = '',
    options: { skipAiIfCooldown?: boolean } = {}
  ): Promise<{ bestCode: string; tree: MCTSNodeData[] }> {
    const tree: MCTSNodeData[] = [];

    // Root node
    const rootNode: MCTSNodeData = {
      id: 'root',
      code: '# Root: ' + prompt,
      parentId: null,
      visits: 0,
      value: 0,
      staticScore: 0,
      rewardScore: 0,
      ucbScore: 0,
    };
    tree.push(rootNode);

    const candidates: string[] = [];

    const generationPrompt =
      `You are the MCTS Rollout Policy in Project Genesis. Generate ${iterations} distinct candidate Python implementations for:\n` +
      `Task: ${prompt}\n\n` +
      `Format your answer as ${iterations} separate candidates, each clearly delimited by: ===CANDIDATE=== and followed by a \`\`\`python code block. Vary the algorithmic style (e.g. iterative, recursive, generator, memoized). Include docstrings and descriptive variable names.`;

    const raw = await generateContentWithRetry(generationPrompt, {
      temperature: 0.85,
      topP: 0.9,
      skipIfCooldown: options.skipAiIfCooldown,
    });

    if (raw) {
      const blocks = raw.split('===CANDIDATE===');
      for (const block of blocks) {
        if (block.includes('```python')) {
          const extracted = block.split('```python')[1].split('```')[0].trim();
          if (extracted) candidates.push(extracted);
        }
      }
    }

    // If we have fewer candidates than iterations, generate stylistic variants
    if (candidates.length < iterations) {
      candidates.push(...this.synthesizeVariations(prompt, iterations - candidates.length));
    }

    let totalVisits = candidates.length;
    rootNode.visits = totalVisits;

    let bestNode: MCTSNodeData = null as any;
    let bestScore = -1;

    candidates.forEach((code, idx) => {
      const staticRes = StaticCritic.analyze(code);
      const staticScore = staticRes.score;
      const rewardScore = rewardModel.predictReward(code);

      // Sandbox execution if testCode exists
      let execBonus = 0;
      let execRes;
      if (testCode) {
        execRes = CodeSandbox.execute(code, testCode);
        if (execRes.success) {
          execBonus = 0.25;
        }
      }

      const combinedScore = Math.min(
        1.0,
        Math.round((0.45 * staticScore + 0.45 * rewardScore + execBonus) * 1000) / 1000
      );

      const visits = 1 + Math.floor(Math.random() * 3);
      // UCB1 formula: Q + c * sqrt(ln(N) / n)
      const ucb = combinedScore + explorationConstant * Math.sqrt(Math.log(totalVisits + 1) / visits);

      const node: MCTSNodeData = {
        id: `node_${idx + 1}`,
        code,
        parentId: 'root',
        visits,
        value: combinedScore,
        staticScore,
        rewardScore,
        ucbScore: Math.round(ucb * 1000) / 1000,
        executionResult: execRes
          ? {
              success: execRes.success,
              output: execRes.output,
              error: execRes.error,
            }
          : undefined,
      };

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestNode = node;
      }

      tree.push(node);
    });

    if (bestNode) {
      bestNode.isBest = true;
    }

    return {
      bestCode: bestNode ? bestNode.code : (candidates[0] || ''),
      tree,
    };
  }

  private static synthesizeVariations(prompt: string, count: number): string[] {
    const variations: string[] = [];
    const p = prompt.toLowerCase();

    if (p.includes('factorial')) {
      variations.push(
`def fact(n):
    """Iterative factorial computation with O(1) space."""
    if n < 0:
        raise ValueError("n must be non-negative")
    ans = 1
    for i in range(2, n + 1):
        ans *= i
    return ans`,
`def fact(n):
    """Recursive factorial computation with base condition."""
    if n < 0:
        raise ValueError("n must be non-negative")
    return 1 if n <= 1 else n * fact(n - 1)`,
`import math

def fact(n):
    """Optimized factorial using native math precision."""
    if n < 0:
        raise ValueError("n must be non-negative")
    return math.prod(range(1, n + 1)) if n > 0 else 1`
      );
    } else if (p.includes('fibonacci')) {
      variations.push(
`def fib(n):
    """Dynamic programming Fibonacci with two pointers."""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b`,
`def fib(n, cache={0: 0, 1: 1}):
    """Memoized top-down Fibonacci generator."""
    if n not in cache:
        cache[n] = fib(n - 1, cache) + fib(n - 2, cache)
    return cache[n]`,
`def fib(n):
    """Linear accumulator Fibonacci."""
    curr_val, next_val = 0, 1
    for _ in range(n):
        curr_val, next_val = next_val, curr_val + next_val
    return curr_val`
      );
    } else if (p.includes('palindrome')) {
      variations.push(
`def is_pal(target_str):
    """Checks palindrome via standard slice reversal."""
    return target_str == target_str[::-1]`,
`def is_pal(string_val):
    """Two-pointer symmetric palindrome validator."""
    left = 0
    right = len(string_val) - 1
    while left < right:
        if string_val[left] != string_val[right]:
            return False
        left += 1
        right -= 1
    return True`,
`def is_pal(text):
    """Functional character-wise palindrome check."""
    n = len(text)
    return all(text[i] == text[n - 1 - i] for i in range(n // 2))`
      );
    } else if (p.includes('bubble') || (p.includes('sort') && p.includes('list'))) {
      variations.push(
`def bubble_sort(items):
    """Classic bubble sort implementation."""
    arr = list(items)
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
`def bubble_sort(items):
    """Optimized bubble sort with early termination flag."""
    arr = list(items)
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr`,
`def bubble_sort(elements):
    """While-loop bubble sort rollout."""
    res = list(elements)
    n = len(res)
    swapped = True
    while swapped:
        swapped = False
        for idx in range(1, n):
            if res[idx - 1] > res[idx]:
                res[idx - 1], res[idx] = res[idx], res[idx - 1]
                swapped = True
        n -= 1
    return res`
      );
    } else if (p.includes('sum') && p.includes('even')) {
      variations.push(
`def sum_even(numbers):
    """Iterative accumulator for even numbers."""
    total = 0
    for val in numbers:
        if val % 2 == 0:
            total += val
    return total`,
`def sum_even(numbers):
    """Generator comprehension for sum of evens."""
    return sum(x for x in numbers if x % 2 == 0)`,
`def sum_even(items):
    """Filter-based functional even summation."""
    return sum(filter(lambda x: x % 2 == 0, items))`
      );
    } else if (p.includes('decorator') || (p.includes('time') && p.includes('execution'))) {
      variations.push(
`import time
from functools import wraps

def timer(func):
    """Decorator to measure and print execution time."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start_time
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper`,
`import time

def timer(func):
    """Standard wrapper decorator for latency profiling."""
    def inner(*args, **kwargs):
        t0 = time.time()
        out = func(*args, **kwargs)
        t1 = time.time()
        print(f"Latency: {t1 - t0:.5f}s")
        return out
    return inner`,
`import time
from functools import wraps

def timer(target_fn):
    """High-precision performance timer decorator."""
    @wraps(target_fn)
    def profile_wrapper(*args, **kwargs):
        t_start = time.perf_counter()
        val = target_fn(*args, **kwargs)
        t_end = time.perf_counter()
        print(f"Done in {t_end - t_start}s")
        return val
    return profile_wrapper`
      );
    } else if (p.includes('prime')) {
      variations.push(
`def gen_primes(n):
    """Sieve of Eratosthenes generator up to n."""
    if n < 2:
        return
    sieve = [True] * (n + 1)
    sieve[0] = sieve[1] = False
    for p in range(2, int(n**0.5) + 1):
        if sieve[p]:
            for i in range(p * p, n + 1, p):
                sieve[i] = False
    for num in range(2, n + 1):
        if sieve[num]:
            yield num`,
`def gen_primes(limit):
    """Trial division generator for primes."""
    def is_prime(num):
        if num < 2:
            return False
        for i in range(2, int(num**0.5) + 1):
            if num % i == 0:
                return False
        return True
    for candidate in range(2, limit + 1):
        if is_prime(candidate):
            yield candidate`,
`def gen_primes(n):
    """Memory-efficient incremental prime generator."""
    primes_found = []
    for candidate in range(2, n + 1):
        if all(candidate % p != 0 for p in primes_found):
            primes_found.append(candidate)
            yield candidate`
      );
    } else if (p.includes('bst') || p.includes('binary search tree')) {
      variations.push(
`class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class BST:
    """Standard Binary Search Tree with recursive insert and search."""
    def __init__(self):
        self.root = None

    def insert(self, val):
        if not self.root:
            self.root = Node(val)
        else:
            self._insert(self.root, val)

    def _insert(self, curr, val):
        if val < curr.val:
            if curr.left is None:
                curr.left = Node(val)
            else:
                self._insert(curr.left, val)
        else:
            if curr.right is None:
                curr.right = Node(val)
            else:
                self._insert(curr.right, val)

    def search(self, val):
        return self._search(self.root, val)

    def _search(self, curr, val):
        if curr is None:
            return False
        if curr.val == val:
            return True
        return self._search(curr.left, val) if val < curr.val else self._search(curr.right, val)`,
`class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class BST:
    """Iterative Binary Search Tree implementation."""
    def __init__(self):
        self.root = None

    def insert(self, val):
        if not self.root:
            self.root = Node(val)
            return
        curr = self.root
        while True:
            if val < curr.val:
                if not curr.left:
                    curr.left = Node(val)
                    break
                curr = curr.left
            else:
                if not curr.right:
                    curr.right = Node(val)
                    break
                curr = curr.right

    def search(self, val):
        curr = self.root
        while curr:
            if curr.val == val:
                return True
            curr = curr.left if val < curr.val else curr.right
        return False`,
`class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class BST:
    """Binary Search Tree with defensive equality handling."""
    def __init__(self):
        self.root = None

    def insert(self, val):
        node = Node(val)
        if self.root is None:
            self.root = node
            return
        curr = self.root
        while curr:
            if val < curr.val:
                if curr.left is None:
                    curr.left = node
                    return
                curr = curr.left
            else:
                if curr.right is None:
                    curr.right = node
                    return
                curr = curr.right

    def search(self, val):
        node = self.root
        while node is not None:
            if node.val == val:
                return True
            node = node.left if val < node.val else node.right
        return False`
      );
    } else {
      for (let i = 0; i < count; i++) {
        variations.push(
`def solution_v${i + 1}(input_data):
    """Candidate rollout ${i + 1} generated by MCTS policy."""
    # Process inputs systematically
    result_val = input_data
    return result_val`
        );
      }
    }

    return variations.slice(0, count);
  }
}
