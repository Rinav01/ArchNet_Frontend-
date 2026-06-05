import { create } from 'zustand';

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  optimizer: 'Adam' | 'SGD' | 'RMSprop' | 'AdamW' | string;
}

interface TrainingConfigState {
  trainingConfig: TrainingConfig;
  setTrainingConfig: (config: Partial<TrainingConfig>) => void;
  resetTrainingConfig: () => void;
}

export const useTrainingConfigStore = create<TrainingConfigState>((set) => ({
  trainingConfig: {
    epochs: 20,
    batchSize: 32,
    learningRate: 0.001,
    optimizer: 'Adam',
  },
  setTrainingConfig: (config) =>
    set((state) => ({
      trainingConfig: { ...state.trainingConfig, ...config },
    })),
  resetTrainingConfig: () =>
    set({
      trainingConfig: {
        epochs: 20,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'Adam',
      },
    }),
}));
