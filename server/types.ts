export interface GenesisConfig {
  lm_model: string;
  embedding_model: string;
  max_length: number;
  temperature: number;
  top_p: number;
  repetition_penalty: number;
  memory_retrieval_k: number;
  ppo_epochs: number;
  ppo_clip_ratio: number;
  value_lr: number;
  policy_lr: number;
  self_play_interval: number;
  mcts_iterations: number;
  mcts_exploration: number;
  distillation_batch_size: number;
  evolution_population: number;
  evolution_rounds: number;
  debate_rounds: number;
}

export interface Task {
  id: string;
  name: string;
  prompt: string;
  test: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  lastPassed?: boolean;
  lastRunAt?: number;
}

export interface EpisodicMemoryItem {
  id: string;
  text: string;
  prompt?: string;
  solution?: string;
  reward?: number;
  timestamp: number;
  embedding?: number[];
  tags?: string[];
}

export interface SemanticNode {
  id: string;
  label: string;
  category: 'concept' | 'function' | 'task' | 'heuristic';
  details?: string;
}

export interface SemanticEdge {
  id: string;
  source: string;
  target: string;
  relation: 'solves' | 'optimizes' | 'implements' | 'depends_on' | 'critiques' | 'related_to';
  weight?: number;
}

export interface KnowledgeGraph {
  nodes: SemanticNode[];
  edges: SemanticEdge[];
}

export interface ComplexityResult {
  is_safe: boolean;
  complexity_bound: string;
  reason: string;
  max_loop_depth?: number;
  has_recursion?: boolean;
}

export interface StaticCriticAnalysis {
  score: number;
  hasFunctions: boolean;
  functionCount: number;
  hasDocstrings: boolean;
  docstringCount: number;
  validNaming: boolean;
  loopCount: number;
  complexityScore: number;
  complexityResult?: ComplexityResult;
  breakdown: {
    functions: number;
    docstrings: number;
    naming: number;
    complexity: number;
  };
}

export interface MCTSNodeData {
  id: string;
  code: string;
  parentId: string | null;
  visits: number;
  value: number;
  staticScore: number;
  rewardScore: number;
  ucbScore: number;
  isBest?: boolean;
  executionResult?: {
    success: boolean;
    output: string;
    error: string;
  };
}

export interface DebateTurn {
  agent: string;
  role: 'explorer' | 'critic' | 'moderator';
  temperature: number;
  text: string;
  timestamp: number;
}

export interface EvolutionIndividual {
  id: string;
  temp: number;
  top_p: number;
  rep_penalty: number;
  fitness: number;
  rank?: number;
  generation: number;
}

export interface SelfPlayEpisode {
  id: string;
  round: number;
  task: Task;
  code: string;
  success: boolean;
  staticScore: number;
  rewardScore: number;
  combinedReward: number;
  loss: number;
  durationMs: number;
  timestamp: number;
  distillationTriggered: boolean;
  mctsNodesCount: number;
}

export interface DistillationCheckpoint {
  id: string;
  version: string;
  step: number;
  samplesCount: number;
  averageReward: number;
  loss: number;
  timestamp: number;
}

export interface ExperienceRecord {
  id: number;
  task_id: string;
  score: number;
  strategy: string;
  timestamp: string;
}

export interface OptimizerStatus {
  system_params: {
    version: string;
    learning_rate: number;
    current_strategy?: string;
    [key: string]: any;
  };
  total_experiences: number;
  in_memory_history_count: number;
  high_performing_count: number;
  average_score: number;
  max_score: number;
  db_path: string;
}

export interface OptimizerSynthesisResult {
  synthesized: boolean;
  strategy?: string;
  version?: string;
  reason?: string;
  system_params?: Record<string, any>;
}

