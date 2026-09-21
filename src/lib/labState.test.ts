import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLabSnapshot, loadLabSnapshot, sanitizeLabSnapshot } from './labState.ts';

test('buildLabSnapshot captures the current lab state', () => {
  const snapshot = buildLabSnapshot({
    activeTab: 'benchmark',
    messages: [{ id: 'm1', role: 'user', content: 'hello', timestamp: 123 }],
    episodes: [{
      id: 'e1',
      round: 1,
      task: { id: 't1', name: 'Task', prompt: 'prompt', test: 'assert 1', difficulty: 'easy', category: 'examples' },
      code: 'print(1)',
      success: true,
      staticScore: 0.8,
      rewardScore: 0.9,
      combinedReward: 0.85,
      loss: 0.1,
      durationMs: 50,
      timestamp: 123,
      distillationTriggered: false,
      mctsNodesCount: 2,
    }],
    stats: { temperature: 0.5, top_p: 0.6, repetition_penalty: 1.0, memory_count: 2, semantic_nodes_count: 1, semantic_edges_count: 1, evo_round: 2, ppo_version: 'v1', distillation_step: 3, reward_model_loss: 0.2, is_self_play_active: true, total_episodes: 1, passed_tasks: 1, total_tasks: 1, win_rate: 100, replay_buffer_size: 3 },
  });

  assert.equal(snapshot.activeTab, 'benchmark');
  assert.equal(snapshot.messages[0].id, 'm1');
  assert.equal(snapshot.episodes[0].id, 'e1');
  assert.equal(snapshot.stats.win_rate, 100);
});

test('sanitizeLabSnapshot strips invalid values and keeps only supported keys', () => {
  const sanitized = sanitizeLabSnapshot({
    activeTab: 'chat',
    messages: [{ id: 'm1', role: 'user', content: 'hello', timestamp: 123 }],
    episodes: [],
    stats: null,
    badValue: 'drop-me',
  } as any);

  assert.equal(sanitized.activeTab, 'chat');
  assert.deepEqual(sanitized.episodes, []);
  assert.equal(sanitized.badValue, undefined);
});

test('loadLabSnapshot returns null when payload is invalid', () => {
  const snapshot = loadLabSnapshot('{not-json');
  assert.equal(snapshot, null);
});
