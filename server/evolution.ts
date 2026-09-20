import { EvolutionIndividual, GenesisConfig } from './types';

export class EvolutionController {
  public population: EvolutionIndividual[] = [];
  public round: number = 0;
  public history: { round: number; best: EvolutionIndividual; avgFitness: number }[] = [];

  constructor(populationSize: number = 6) {
    this.initPopulation(populationSize);
  }

  private initPopulation(size: number) {
    this.population = Array.from({ length: size }, (_, i) => ({
      id: `ind_${i + 1}`,
      temp: Math.round((0.65 + 0.08 * i) * 100) / 100,
      top_p: Math.round((0.78 + 0.03 * i) * 100) / 100,
      rep_penalty: Math.round((1.0 + 0.04 * i) * 100) / 100,
      fitness: Math.round((0.55 + Math.random() * 0.3) * 100) / 100,
      generation: 0,
    }));
    this.rankPopulation();
  }

  private rankPopulation() {
    this.population.sort((a, b) => b.fitness - a.fitness);
    this.population.forEach((ind, i) => {
      ind.rank = i + 1;
    });
  }

  public stepEvolution(config: GenesisConfig, customFitness?: number[]): { best: EvolutionIndividual; round: number } {
    this.round++;

    // If custom fitness provided, assign it
    if (customFitness && customFitness.length === this.population.length) {
      this.population.forEach((ind, i) => {
        ind.fitness = Math.round(customFitness[i] * 100) / 100;
      });
    } else {
      // Natural fitness evaluation jitter based on temperature & top_p balance
      this.population.forEach(ind => {
        // Penalty for extremes (too high or too low)
        const tempOpt = 1.0 - Math.abs(ind.temp - 0.78) * 0.7;
        const toppOpt = 1.0 - Math.abs(ind.top_p - 0.88) * 0.6;
        const repOpt = 1.0 - Math.abs(ind.rep_penalty - 1.08) * 0.5;
        const target = Math.max(0.2, (tempOpt + toppOpt + repOpt) / 3 + (Math.random() - 0.5) * 0.15);
        ind.fitness = Math.round(Math.min(0.99, target) * 100) / 100;
      });
    }

    this.rankPopulation();

    // Select top 2 individuals for breeding
    const parent1 = this.population[0];
    const parent2 = this.population[1];

    // Crossover: average of parent chromosomes
    const child1: EvolutionIndividual = {
      id: `gen${this.round}_c1`,
      temp: Math.round(((parent1.temp + parent2.temp) / 2) * 100) / 100,
      top_p: Math.round(((parent1.top_p + parent2.top_p) / 2) * 100) / 100,
      rep_penalty: Math.round(((parent1.rep_penalty + parent2.rep_penalty) / 2) * 100) / 100,
      fitness: Math.round(((parent1.fitness + parent2.fitness) / 2) * 100) / 100,
      generation: this.round,
    };

    // Mutation: Gaussian jitter on child1
    const jitter = (val: number, delta: number, min: number, max: number) => {
      const perturbed = val + (Math.random() * 2 - 1) * delta;
      return Math.round(Math.max(min, Math.min(max, perturbed)) * 100) / 100;
    };

    const child2: EvolutionIndividual = {
      id: `gen${this.round}_c2`,
      temp: jitter(child1.temp, 0.05, 0.5, 1.2),
      top_p: jitter(child1.top_p, 0.03, 0.7, 0.98),
      rep_penalty: jitter(child1.rep_penalty, 0.04, 1.0, 1.25),
      fitness: Math.round((child1.fitness + (Math.random() - 0.45) * 0.1) * 100) / 100,
      generation: this.round,
    };

    // Replace the bottom 2 lowest fitness individuals with children
    const newPop = [...this.population.slice(0, this.population.length - 2), child1, child2];
    this.population = newPop;
    this.rankPopulation();

    const best = this.population[0];

    // Update active config hyperparameters with the champion individual
    config.temperature = best.temp;
    config.top_p = best.top_p;
    config.repetition_penalty = best.rep_penalty;

    const avgFitness = Math.round(
      (this.population.reduce((sum, ind) => sum + ind.fitness, 0) / this.population.length) * 100
    ) / 100;

    this.history.push({
      round: this.round,
      best: { ...best },
      avgFitness,
    });
    if (this.history.length > 30) this.history.shift();

    return { best, round: this.round };
  }
}
