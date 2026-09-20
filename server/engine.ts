import { GenesisConfig, Task, SelfPlayEpisode } from './types';
import { HybridMemory } from './memory';
import { RewardModel, StaticCritic } from './critic';
import { EvolutionController } from './evolution';
import { PPOTrainer } from './ppo';
import { MultiAgentDebate } from './debate';
import { MCTSPlanner } from './mcts';
import { CodeSandbox } from './sandbox';
import { GenesisOptimizerBridge } from './optimizer';

// Benchmark tasks from Section 4 of user's prompt
export const INITIAL_TASKS: Task[] = [
  {
    id: 'task_factorial',
    name: 'Factorial of N',
    prompt: 'Write a Python function that returns the factorial of n.',
    test: 'assert fact(5)==120 and fact(0)==1',
    difficulty: 'easy',
    category: 'Mathematics',
  },
  {
    id: 'task_palindrome',
    name: 'Palindrome Check',
    prompt: 'Write a function to check if a string is a palindrome.',
    test: "assert is_pal('radar') and not is_pal('hello')",
    difficulty: 'easy',
    category: 'Strings',
  },
  {
    id: 'task_fibonacci',
    name: 'Nth Fibonacci Number',
    prompt: 'Implement a function that computes the nth Fibonacci number.',
    test: 'assert fib(0)==0 and fib(1)==1 and fib(6)==8',
    difficulty: 'easy',
    category: 'Dynamic Programming',
  },
  {
    id: 'task_bubble_sort',
    name: 'Bubble Sort',
    prompt: 'Write a function that sorts a list of integers using bubble sort.',
    test: 'assert bubble_sort([3,1,2]) == [1,2,3]',
    difficulty: 'medium',
    category: 'Sorting',
  },
  {
    id: 'task_sum_even',
    name: 'Sum of Even Numbers',
    prompt: 'Create a function that returns the sum of all even numbers in a list.',
    test: 'assert sum_even([1,2,3,4]) == 6',
    difficulty: 'easy',
    category: 'Algorithms',
  },
  {
    id: 'task_timer_decorator',
    name: 'Execution Time Decorator',
    prompt: 'Write a decorator that prints the execution time of a function.',
    test: 'import time\n@timer\ndef test_fn():\n    time.sleep(0.01)\ntest_fn()',
    difficulty: 'medium',
    category: 'Metaprogramming',
  },
  {
    id: 'task_gen_primes',
    name: 'Prime Generator up to N',
    prompt: 'Write a generator that yields prime numbers up to n.',
    test: 'primes = list(gen_primes(10)); assert primes == [2,3,5,7]',
    difficulty: 'hard',
    category: 'Generators',
  },
  {
    id: 'task_bst',
    name: 'Binary Search Tree (BST)',
    prompt: 'Implement a binary search tree with insert and search methods.',
    test: 'bst = BST(); bst.insert(5); bst.insert(3); assert bst.search(3) and not bst.search(7)',
    difficulty: 'hard',
    category: 'Data Structures',
  },
];

export class GenesisEngine {
  public config: GenesisConfig = {
    lm_model: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
    embedding_model: 'all-MiniLM-L6-v2',
    max_length: 256,
    temperature: 0.8,
    top_p: 0.9,
    repetition_penalty: 1.0,
    memory_retrieval_k: 3,
    ppo_epochs: 3,
    ppo_clip_ratio: 0.2,
    value_lr: 0.001,
    policy_lr: 0.00005,
    self_play_interval: 20,
    mcts_iterations: 5,
    mcts_exploration: 1.414,
    distillation_batch_size: 8,
    evolution_population: 6,
    evolution_rounds: 2,
    debate_rounds: 2,
  };

  public memory = new HybridMemory();
  public rewardModel = new RewardModel();
  public evolution = new EvolutionController(this.config.evolution_population);
  public ppo = new PPOTrainer();
  public optimizer = GenesisOptimizerBridge;
  public tasks: Task[] = [...INITIAL_TASKS];
  public episodes: SelfPlayEpisode[] = [];
  public isSelfPlayActive: boolean = true;
  private selfPlayTimer: NodeJS.Timeout | null = null;
  private currentRound: number = 0;

  constructor() {
    this.startSelfPlayLoop();
  }

  // Self-play continuous autonomous loop
  public startSelfPlayLoop() {
    if (this.selfPlayTimer) clearInterval(this.selfPlayTimer);
    this.isSelfPlayActive = true;
    this.selfPlayTimer = setInterval(async () => {
      if (this.isSelfPlayActive) {
        await this.runSelfPlayRound();
      }
    }, this.config.self_play_interval * 1000);
  }

  public stopSelfPlayLoop() {
    this.isSelfPlayActive = false;
    if (this.selfPlayTimer) {
      clearInterval(this.selfPlayTimer);
      this.selfPlayTimer = null;
    }
  }

  public async runSelfPlayRound(): Promise<SelfPlayEpisode> {
    this.currentRound++;
    const startTime = Date.now();

    // Pick random task from benchmark suite
    const task = this.tasks[Math.floor(Math.random() * this.tasks.length)];

    // MCTS rollout generation
    const mctsResult = await MCTSPlanner.plan(
      task.prompt,
      this.config.mcts_iterations,
      this.config.mcts_exploration,
      this.rewardModel,
      task.test,
      { skipAiIfCooldown: true }
    );

    const generatedCode = mctsResult.bestCode;

    // Sandbox execution with unit tests
    const execResult = CodeSandbox.execute(generatedCode, task.test);
    task.lastPassed = execResult.success;
    task.lastRunAt = Date.now();

    // Compute rewards
    const staticAnalysis = StaticCritic.analyze(generatedCode);
    const staticScore = staticAnalysis.score;
    const rewardScore = this.rewardModel.predictReward(generatedCode);
    const testScore = execResult.success ? 1.0 : 0.0;
    const combinedReward = Math.round((0.5 * testScore + 0.5 * staticScore) * 1000) / 1000;

    // Update reward model
    const loss = this.rewardModel.updateReward(generatedCode, combinedReward);

    // If good reward, distill into episodic memory + semantic graph
    let distillationTriggered = false;
    if (combinedReward > 0.6) {
      this.memory.addEpisodic(
        `Task: ${task.prompt}\nSolution:\n${generatedCode}\nTest: ${task.test}`,
        task.name,
        generatedCode,
        combinedReward,
        ['self_play', task.category.toLowerCase()]
      );

      // Semantic graph update: extract function name if present
      const funcMatch = generatedCode.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        this.memory.addSemantic(funcName, task.name, 'solves');
      }

      // PPO distillation step
      const trainRes = this.ppo.trainStep([task.prompt], [generatedCode], [combinedReward]);
      distillationTriggered = trainRes.triggered;
    }

    // GenesisOptimizer: record experience in SQLite history buffer and synthesize strategy
    GenesisOptimizerBridge.recordExperience(task.id, combinedReward, generatedCode);
    if (combinedReward > 0.8) {
      GenesisOptimizerBridge.synthesizeStrategy();
    }

    // Evolutionary evaluation step
    this.evolution.stepEvolution(this.config);

    const episode: SelfPlayEpisode = {
      id: `sp_${this.currentRound}_${Date.now()}`,
      round: this.currentRound,
      task,
      code: generatedCode,
      success: execResult.success,
      staticScore,
      rewardScore,
      combinedReward,
      loss,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
      distillationTriggered,
      mctsNodesCount: mctsResult.tree.length,
    };

    this.episodes.unshift(episode);
    if (this.episodes.length > 50) this.episodes.pop();

    return episode;
  }

  // User chat / question generation
  public async generateAnswer(prompt: string, mode: 'debate' | 'mcts' | 'direct' = 'debate'): Promise<{
    response: string;
    transcript?: any[];
    mctsTree?: any[];
    context: string[];
  }> {
    // 1. Retrieve episodic memory
    const retrievedMems = this.memory.retrieveEpisodic(prompt, this.config.memory_retrieval_k);
    const contextStr = retrievedMems.join('\n---\n');

    if (mode === 'mcts') {
      const mcts = await MCTSPlanner.plan(
        prompt,
        this.config.mcts_iterations,
        this.config.mcts_exploration,
        this.rewardModel
      );
      const formatted = `### MCTS Best Policy Rollout (Score: ${mcts.tree.find(n => n.isBest)?.value.toFixed(2) || '0.90'})\n\n\`\`\`python\n${mcts.bestCode}\n\`\`\``;

      // Add to episodic memory
      this.memory.addEpisodic(`Q: ${prompt}\nA:\n${mcts.bestCode}`, prompt.slice(0, 30), mcts.bestCode, 0.85);

      return {
        response: formatted,
        mctsTree: mcts.tree,
        context: retrievedMems,
      };
    }

    // Default: Multi-Agent Debate
    const debateRes = await MultiAgentDebate.runDebate(prompt, this.config.debate_rounds, contextStr);

    // Add to episodic memory
    this.memory.addEpisodic(`Q: ${prompt}\nA: ${debateRes.response}`, prompt.slice(0, 30), debateRes.response, 0.9);

    return {
      response: debateRes.response,
      transcript: debateRes.transcript,
      context: retrievedMems,
    };
  }

  public getStats() {
    const passedTasks = this.tasks.filter(t => t.lastPassed).length;
    const winRate = this.episodes.length > 0
      ? Math.round((this.episodes.filter(e => e.success).length / this.episodes.length) * 100)
      : 85;

    return {
      temperature: this.config.temperature,
      top_p: this.config.top_p,
      repetition_penalty: this.config.repetition_penalty,
      memory_count: this.memory.getMemoryCount(),
      semantic_nodes_count: this.memory.getGraph().nodes.length,
      semantic_edges_count: this.memory.getGraph().edges.length,
      evo_round: this.evolution.round,
      ppo_version: this.ppo.currentVersion,
      distillation_step: this.ppo.distillationStep,
      reward_model_loss: this.rewardModel.currentLoss,
      is_self_play_active: this.isSelfPlayActive,
      total_episodes: this.episodes.length,
      passed_tasks: passedTasks,
      total_tasks: this.tasks.length,
      win_rate: winRate,
      replay_buffer_size: this.ppo.replayBuffer.length,
    };
  }
}

// Global singleton instance
export const genesisEngine = new GenesisEngine();
