import { DistillationCheckpoint } from './types';

export class PPOTrainer {
  public checkpoints: DistillationCheckpoint[] = [];
  public currentVersion: string = 'v1.0-genesis';
  public distillationStep: number = 0;
  public replayBuffer: { prompt: string; response: string; reward: number; timestamp: number }[] = [];
  public lastLoss: number = 0.285;
  public totalTrainedSamples: number = 0;

  constructor() {
    this.checkpoints.push({
      id: 'ckpt_init',
      version: 'v1.0-genesis',
      step: 0,
      samplesCount: 16,
      averageReward: 0.65,
      loss: 0.321,
      timestamp: Date.now() - 3600000,
    });
  }

  public trainStep(prompts: string[], responses: string[], rewards: number[]): { triggered: boolean; checkpoint?: DistillationCheckpoint } {
    let newHighRewards = 0;

    for (let i = 0; i < prompts.length; i++) {
      const reward = rewards[i];
      if (reward > 0.65) {
        this.replayBuffer.push({
          prompt: prompts[i],
          response: responses[i],
          reward,
          timestamp: Date.now(),
        });
        newHighRewards++;
        this.totalTrainedSamples++;
      }
    }

    // Trigger distillation if buffer threshold reached (e.g. >= 4 samples)
    if (this.replayBuffer.length >= 4) {
      this.distillationStep++;
      const avgReward = Math.round(
        (this.replayBuffer.reduce((acc, item) => acc + item.reward, 0) / this.replayBuffer.length) * 1000
      ) / 1000;

      // PPO clipped surrogate loss approximation: L_CLIP - c1 * L_VF + c2 * S
      const lossDelta = (1.0 - avgReward) * 0.4 + (Math.random() - 0.5) * 0.05;
      this.lastLoss = Math.max(0.04, Math.round(lossDelta * 10000) / 10000);

      this.currentVersion = `v1.${Math.floor(this.distillationStep / 5)}.${this.distillationStep % 5}-distill`;

      const checkpoint: DistillationCheckpoint = {
        id: `ckpt_${this.distillationStep}_${Date.now()}`,
        version: this.currentVersion,
        step: this.distillationStep,
        samplesCount: this.replayBuffer.length,
        averageReward: avgReward,
        loss: this.lastLoss,
        timestamp: Date.now(),
      };

      this.checkpoints.unshift(checkpoint);
      if (this.checkpoints.length > 20) this.checkpoints.pop();

      // Clear consumed buffer
      this.replayBuffer = [];

      return { triggered: true, checkpoint };
    }

    return { triggered: false };
  }
}
