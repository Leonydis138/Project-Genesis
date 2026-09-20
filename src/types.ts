export interface GenesisStats {
  temperature: number;
  top_p: number;
  repetition_penalty: number;
  memory_count: number;
  semantic_nodes_count: number;
  semantic_edges_count: number;
  evo_round: number;
  ppo_version: string;
  distillation_step: number;
  reward_model_loss: number;
  is_self_play_active: boolean;
  total_episodes: number;
  passed_tasks: number;
  total_tasks: number;
  win_rate: number;
  replay_buffer_size: number;
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
  x?: number;
  y?: number;
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

export interface DebateTurn {
  agent: string;
  role: 'explorer' | 'critic' | 'moderator';
  temperature: number;
  text: string;
  timestamp: number;
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

export interface EvolutionIndividual {
  id: string;
  temp: number;
  top_p: number;
  rep_penalty: number;
  fitness: number;
  rank?: number;
  generation: number;
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'debate' | 'mcts' | 'direct';
  transcript?: DebateTurn[];
  mctsTree?: MCTSNodeData[];
  context?: string[];
  rated?: boolean;
  rating?: number;
  loss?: number;
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

