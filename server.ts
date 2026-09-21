import express from 'express';
import path from 'path';
import { spawnSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { genesisEngine } from './server/engine';
import { CodeSandbox } from './server/sandbox';
import { StaticCritic } from './server/critic';
import { MCTSPlanner } from './server/mcts';
import { MultiAgentDebate } from './server/debate';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const MAX_PROMPT_LENGTH = 2000;
  const MAX_CODE_LENGTH = 15000;
  const MAX_TEST_LENGTH = 12000;

  const sanitizeText = (value: unknown, fieldName: string, maxLength: number) => {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`${fieldName} is required`);
    }
    if (trimmed.length > maxLength) {
      throw new Error(`${fieldName} is too long (${trimmed.length} > ${maxLength})`);
    }
    return trimmed;
  };

  const normalizeCode = (value: unknown, fieldName: string, maxLength: number) => {
    let code = sanitizeText(value, fieldName, maxLength);
    if (code.startsWith('```')) {
      code = code.replace(/^```(?:python|py)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    return code;
  };

  app.use(express.json({ limit: '1mb' }));

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'Project Genesis Engine' });
  });

  // Genesis Core Telemetry & Stats (Matches section 18 of user prompt)
  app.get('/api/stats', (req, res) => {
    res.json(genesisEngine.getStats());
  });

  // Chat & Problem Solving Generation (Debate / MCTS / Self-Consistency)
  app.post('/api/generate', async (req, res) => {
    try {
      const rawPrompt = req.body?.prompt;
      const mode = typeof req.body?.mode === 'string' ? req.body.mode : 'debate';
      const prompt = sanitizeText(rawPrompt, 'Prompt', MAX_PROMPT_LENGTH);
      const normalizedMode = ['debate', 'mcts', 'direct'].includes(mode) ? mode : 'debate';
      const result = await genesisEngine.generateAnswer(prompt, normalizedMode as 'debate' | 'mcts' | 'direct');
      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/generate:', err);
      res.status(400).json({ error: err.message || 'Generation failed' });
    }
  });

  // RLHF Feedback Endpoint (Matches Section 18 /feedback)
  app.post('/api/feedback', (req, res) => {
    try {
      const response = sanitizeText(req.body?.response ?? '', 'Response', MAX_PROMPT_LENGTH);
      const numericRating = Number(req.body?.rating ?? 0);
      if (!Number.isFinite(numericRating)) {
        return res.status(400).json({ error: 'Rating must be numeric' });
      }
      const rating = Math.min(1, Math.max(0, numericRating));
      const loss = genesisEngine.rewardModel.updateReward(response, rating);
      res.json({
        success: true,
        loss,
        currentLoss: genesisEngine.rewardModel.currentLoss,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Feedback update failed' });
    }
  });

  // Code Execution Sandbox & AST Static Critic
  app.post('/api/execute', (req, res) => {
    try {
      const code = normalizeCode(req.body?.code ?? '', 'Code', MAX_CODE_LENGTH);
      const testCode = normalizeCode(req.body?.testCode ?? '', 'Test code', MAX_TEST_LENGTH);
      const enforceVerification = Boolean(req.body?.enforceVerification);
      const execResult = CodeSandbox.execute(code, testCode, { enforceVerification });
      const criticAnalysis = StaticCritic.analyze(code);
      const rewardScore = genesisEngine.rewardModel.predictReward(code);

      res.json({
        execution: execResult,
        critic: criticAnalysis,
        rewardScore,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Execution failed' });
    }
  });

  // Dedicated AST Complexity Analyzer verification route
  app.post('/api/verify-complexity', (req, res) => {
    try {
      const code = normalizeCode(req.body?.code ?? '', 'Code', MAX_CODE_LENGTH);
      const analysis = CodeSandbox.verifyComplexity(code);
      res.json(analysis);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Verification failed' });
    }
  });

  // GenesisOptimizer: SQLite Experience Buffer & AST Strategy Synthesizer
  app.get('/api/optimizer/status', (req, res) => {
    try {
      const status = genesisEngine.optimizer.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/optimizer/history', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = genesisEngine.optimizer.getExperiences(limit);
      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/optimizer/record', (req, res) => {
    try {
      const { taskId = 'task_custom', score = 0.9, strategy = '' } = req.body;
      const success = genesisEngine.optimizer.recordExperience(taskId, Number(score), strategy);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/optimizer/synthesize', (req, res) => {
    try {
      const result = genesisEngine.optimizer.synthesizeStrategy();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/optimizer/validate', (req, res) => {
    try {
      const { code = '' } = req.body;
      const valid = genesisEngine.optimizer.validateLogic(code);
      res.json({ valid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Hardened Complexity Verifier Endpoint with Subprocess Protection
  app.post('/api/verifier/hardened', (req, res) => {
    try {
      const { code = '' } = req.body || {};
      const scriptPath = path.join(process.cwd(), 'server', 'hardened_verifier.py');

      const pyRes = spawnSync('python3', [scriptPath], {
        input: code,
        encoding: 'utf-8',
        timeout: 3000,
        maxBuffer: 1024 * 512,
      });

      if (pyRes.error || pyRes.status !== 0 || !pyRes.stdout) {
        const fallback = CodeSandbox.verifyComplexity(code);
        const errMsg = pyRes.error?.message || (pyRes.stderr ? pyRes.stderr.trim() : '') || 'Python verifier process exit non-zero or unavailable';
        return res.json({
          ...fallback,
          verifierEngine: 'js_fallback',
          note: `Subprocess warning: ${errMsg}. Applied JS AST complexity fallback.`,
        });
      }

      try {
        const parsed = JSON.parse(pyRes.stdout.trim());
        return res.json({
          ...parsed,
          verifierEngine: 'python_hardened',
        });
      } catch (parseErr: any) {
        const fallback = CodeSandbox.verifyComplexity(code);
        return res.json({
          ...fallback,
          verifierEngine: 'js_fallback',
          note: `JSON parse error on Python output (${parseErr.message}). Applied JS AST fallback.`,
        });
      }
    } catch (err: any) {
      const fallback = CodeSandbox.verifyComplexity(req.body?.code || '');
      return res.json({
        ...fallback,
        verifierEngine: 'js_fallback',
        error: err.message || 'Unexpected verifier error',
      });
    }
  });

  // MCTS Planner
  app.post('/api/mcts', async (req, res) => {
    try {
      const { prompt, iterations = 5, testCode = '' } = req.body;
      const result = await MCTSPlanner.plan(
        prompt,
        iterations,
        genesisEngine.config.mcts_exploration,
        genesisEngine.rewardModel,
        testCode
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Multi-Agent Debate
  app.post('/api/debate', async (req, res) => {
    try {
      const { prompt, rounds = 2 } = req.body;
      const mems = genesisEngine.memory.retrieveEpisodic(prompt, 3);
      const result = await MultiAgentDebate.runDebate(prompt, rounds, mems.join('\n'));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Hybrid Memory: Episodic + Semantic Knowledge Graph
  app.get('/api/memory', (req, res) => {
    res.json({
      episodic: genesisEngine.memory.getEpisodicList(),
      graph: genesisEngine.memory.getGraph(),
    });
  });

  app.post('/api/memory/semantic', (req, res) => {
    try {
      const { concept1, concept2, relation = 'solves' } = req.body;
      if (!concept1 || !concept2) {
        return res.status(400).json({ error: 'concept1 and concept2 required' });
      }
      genesisEngine.memory.addSemantic(concept1, concept2, relation);
      res.json({ success: true, graph: genesisEngine.memory.getGraph() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Evolutionary Hyperparameter Controller
  app.get('/api/evolution', (req, res) => {
    res.json({
      population: genesisEngine.evolution.population,
      round: genesisEngine.evolution.round,
      history: genesisEngine.evolution.history,
      activeConfig: {
        temperature: genesisEngine.config.temperature,
        top_p: genesisEngine.config.top_p,
        repetition_penalty: genesisEngine.config.repetition_penalty,
      },
    });
  });

  app.post('/api/evolution/step', (req, res) => {
    const stepRes = genesisEngine.evolution.stepEvolution(genesisEngine.config);
    res.json({
      success: true,
      best: stepRes.best,
      round: stepRes.round,
      population: genesisEngine.evolution.population,
    });
  });

  // Autonomous Self-Play Control
  app.get('/api/selfplay', (req, res) => {
    res.json({
      isActive: genesisEngine.isSelfPlayActive,
      interval: genesisEngine.config.self_play_interval,
      episodes: genesisEngine.episodes,
      rewardLoss: genesisEngine.rewardModel.currentLoss,
      distillationStep: genesisEngine.ppo.distillationStep,
    });
  });

  app.post('/api/selfplay/toggle', (req, res) => {
    if (genesisEngine.isSelfPlayActive) {
      genesisEngine.stopSelfPlayLoop();
    } else {
      genesisEngine.startSelfPlayLoop();
    }
    res.json({ isActive: genesisEngine.isSelfPlayActive });
  });

  app.post('/api/selfplay/step', async (req, res) => {
    try {
      const episode = await genesisEngine.runSelfPlayRound();
      res.json({ success: true, episode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Benchmark Tasks Suite
  app.get('/api/tasks', (req, res) => {
    res.json({ tasks: genesisEngine.tasks });
  });

  app.post('/api/tasks/run-all', async (req, res) => {
    try {
      const results = [];
      for (const task of genesisEngine.tasks) {
        const mctsRes = await MCTSPlanner.plan(
          task.prompt,
          3,
          genesisEngine.config.mcts_exploration,
          genesisEngine.rewardModel,
          task.test,
          { skipAiIfCooldown: true }
        );
        const exec = CodeSandbox.execute(mctsRes.bestCode, task.test);
        task.lastPassed = exec.success;
        task.lastRunAt = Date.now();
        results.push({
          taskId: task.id,
          name: task.name,
          passed: exec.success,
          code: mctsRes.bestCode,
          output: exec.output,
          error: exec.error,
        });
      }
      res.json({ results, tasks: genesisEngine.tasks });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PPO & Distillation Telemetry
  app.get('/api/ppo', (req, res) => {
    res.json({
      checkpoints: genesisEngine.ppo.checkpoints,
      currentVersion: genesisEngine.ppo.currentVersion,
      distillationStep: genesisEngine.ppo.distillationStep,
      replayBufferSize: genesisEngine.ppo.replayBuffer.length,
      totalTrained: genesisEngine.ppo.totalTrainedSamples,
      lastLoss: genesisEngine.ppo.lastLoss,
    });
  });

  // 404 handler for API routes to prevent falling through to HTML SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 Project Genesis active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
