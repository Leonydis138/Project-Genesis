import { spawnSync } from 'child_process';
import path from 'path';
import { OptimizerStatus, ExperienceRecord, OptimizerSynthesisResult } from './types';

export class GenesisOptimizerBridge {
  private static scriptPath = path.join(process.cwd(), 'server', 'genesis_optimizer.py');
  private static dbPath = path.join(process.cwd(), 'agent_experience.db');

  /**
   * Fetch current system parameters, total experiences, and performance metrics
   */
  static getStatus(): OptimizerStatus {
    try {
      const proc = spawnSync('python3', [this.scriptPath, '--db', this.dbPath, '--cmd', 'status'], {
        encoding: 'utf-8',
        timeout: 5000,
      });

      if (proc.status === 0 && proc.stdout.trim()) {
        return JSON.parse(proc.stdout.trim());
      }
    } catch (err) {
      console.error('[GenesisOptimizerBridge] Error getting status:', err);
    }

    return {
      system_params: { version: '1.0', learning_rate: 0.1 },
      total_experiences: 0,
      in_memory_history_count: 0,
      high_performing_count: 0,
      average_score: 0.0,
      max_score: 0.0,
      db_path: this.dbPath,
    };
  }

  /**
   * Record an execution experience into the SQLite experience buffer
   */
  static recordExperience(taskId: string, score: number, strategy: string): boolean {
    try {
      const proc = spawnSync(
        'python3',
        [
          this.scriptPath,
          '--db',
          this.dbPath,
          '--cmd',
          'record',
          '--task-id',
          taskId,
          '--score',
          score.toString(),
        ],
        {
          input: strategy,
          encoding: 'utf-8',
          timeout: 5000,
        }
      );

      if (proc.status === 0 && proc.stdout.trim()) {
        const parsed = JSON.parse(proc.stdout.trim());
        return parsed.success === true;
      }
    } catch (err) {
      console.error('[GenesisOptimizerBridge] Error recording experience:', err);
    }
    return false;
  }

  /**
   * Synthesize strategy by analyzing high-performing historical strategies (score > 0.8),
   * validating syntax with AST, and updating version & policy parameters
   */
  static synthesizeStrategy(): OptimizerSynthesisResult {
    try {
      const proc = spawnSync('python3', [this.scriptPath, '--db', this.dbPath, '--cmd', 'synthesize'], {
        encoding: 'utf-8',
        timeout: 5000,
      });

      if (proc.status === 0 && proc.stdout.trim()) {
        return JSON.parse(proc.stdout.trim());
      }
    } catch (err) {
      console.error('[GenesisOptimizerBridge] Error synthesizing strategy:', err);
    }

    return {
      synthesized: false,
      reason: 'Failed to execute synthesis subprocess',
    };
  }

  /**
   * Fetch recent experiences stored in SQLite
   */
  static getExperiences(limit: number = 50): ExperienceRecord[] {
    try {
      const proc = spawnSync(
        'python3',
        [this.scriptPath, '--db', this.dbPath, '--cmd', 'history', '--limit', limit.toString()],
        {
          encoding: 'utf-8',
          timeout: 5000,
        }
      );

      if (proc.status === 0 && proc.stdout.trim()) {
        return JSON.parse(proc.stdout.trim());
      }
    } catch (err) {
      console.error('[GenesisOptimizerBridge] Error getting experiences:', err);
    }
    return [];
  }

  /**
   * Check logic validity using AST parser
   */
  static validateLogic(codeStr: string): boolean {
    try {
      const proc = spawnSync('python3', [this.scriptPath, '--db', this.dbPath, '--cmd', 'validate'], {
        input: codeStr,
        encoding: 'utf-8',
        timeout: 3000,
      });

      if (proc.status === 0 && proc.stdout.trim()) {
        const parsed = JSON.parse(proc.stdout.trim());
        return parsed.valid === true;
      }
    } catch (err) {
      console.error('[GenesisOptimizerBridge] Error validating logic:', err);
    }
    return false;
  }
}
