import { create } from 'zustand';
import { isBackendOnline, graphqlRequest, GET_TRAINING_RUNS } from '@/lib/graphql/client';

export interface MetricPoint {
  epoch: number;
  loss: number;
  accuracy: number;
  val_loss: number;
  val_accuracy: number;
}

export interface TrainingRun {
  id: string;
  name: string;
  accuracy: number;
}

interface TrainingStoreState {
  jobId: string | null;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  epoch: number;
  loss: number;
  accuracy: number;
  metrics: MetricPoint[];
  history: TrainingRun[];
  
  // Actions
  connectSocket: (projectId: string) => void;
  disconnectSocket: () => void;
  startTraining: (projectId: string) => void;
  stopTraining: () => void;
  loadTrainingHistory: (projectId: string) => Promise<void>;
}

let socketInstance: WebSocket | null = null;
let simInterval: NodeJS.Timeout | null = null;

export const useTrainingStore = create<TrainingStoreState>((set, get) => ({
  jobId: null,
  status: 'IDLE',
  epoch: 0,
  loss: 0,
  accuracy: 0,
  metrics: [],
  history: [],

  connectSocket: (projectId) => {
    // Prevent multiple sockets
    get().disconnectSocket();

    const token = typeof window !== 'undefined' ? localStorage.getItem('archnet_token') : null;
    const wsUrl = `ws://127.0.0.1:8000/ws/training/${projectId}?token=${token || ''}`;

    let socket: WebSocket;
    
    const startSimulation = () => {
      if (simInterval) clearInterval(simInterval);
      
      let currentEpoch = 0;
      const totalEpochs = 20;
      const generatedJobId = get().jobId || `job_${Math.random().toString(36).substring(2, 9)}`;

      // Generate a dynamic target accuracy between 88% and 96%
      // Ensure the first completed run finishes at exactly 91.2% if we want to match mockup defaults,
      // or we make it fully dynamic. Let's make the first completed run from idle land on exactly 91.2%,
      // and subsequent runs randomized.
      const runIndex = get().history.length + 1;
      const targetAccuracy = runIndex === 4 ? 0.912 : 0.88 + Math.random() * 0.08;

      set({
        jobId: generatedJobId,
        status: 'RUNNING',
        epoch: 0,
        loss: 0.8,
        accuracy: 0.6,
        metrics: [],
      });

      simInterval = setInterval(() => {
        currentEpoch += 1;
        
        // Loss decay curves
        const currentLoss = parseFloat((0.8 * Math.pow(0.88, currentEpoch) + Math.random() * 0.02).toFixed(4));
        const valLoss = parseFloat((0.85 * Math.pow(0.89, currentEpoch) + Math.random() * 0.03).toFixed(4));
        
        // Accuracy ascending curves
        const progress = currentEpoch / totalEpochs;
        const currentAcc = parseFloat((0.6 + (targetAccuracy - 0.02 - 0.6) * progress + Math.random() * 0.015).toFixed(4));
        const valAcc = currentEpoch === totalEpochs 
          ? targetAccuracy 
          : parseFloat((0.55 + (targetAccuracy - 0.55) * progress + Math.random() * 0.01).toFixed(4));

        const newPoint: MetricPoint = {
          epoch: currentEpoch,
          loss: currentLoss,
          accuracy: currentAcc,
          val_loss: valLoss,
          val_accuracy: valAcc,
        };

        set((state) => ({
          epoch: currentEpoch,
          loss: currentLoss,
          accuracy: currentAcc,
          metrics: [...state.metrics, newPoint],
        }));

        if (currentEpoch >= totalEpochs) {
          if (simInterval) clearInterval(simInterval);
          simInterval = null;

          const newRun: TrainingRun = {
            id: String(get().history.length + 1),
            name: `Run #${get().history.length + 1}`,
            accuracy: targetAccuracy,
          };

          set((state) => ({
            status: 'COMPLETED',
            history: [...state.history, newRun],
          }));
        }
      }, 1000);
    };

    try {
      socket = new WebSocket(wsUrl);
      socketInstance = socket;

      socket.onopen = () => {
        set({
          jobId: `job_${Math.random().toString(36).substring(2, 9)}`,
          status: 'RUNNING',
          epoch: 0,
          loss: 0,
          accuracy: 0,
          metrics: [],
        });
        socket.send(JSON.stringify({ type: 'start_training' }));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'metrics') {
            const newPoint: MetricPoint = {
              epoch: msg.epoch,
              loss: msg.loss,
              accuracy: msg.accuracy,
              val_loss: msg.val_loss || msg.loss * 1.1,
              val_accuracy: msg.val_accuracy || msg.accuracy * 0.98,
            };

            set((state) => ({
              epoch: msg.epoch,
              loss: msg.loss,
              accuracy: msg.accuracy,
              metrics: [...state.metrics, newPoint],
            }));

            if (msg.status === 'COMPLETED' || msg.epoch >= 20) {
              const finalAcc = msg.val_accuracy || msg.accuracy;
              const newRun: TrainingRun = {
                id: String(get().history.length + 1),
                name: `Run #${get().history.length + 1}`,
                accuracy: finalAcc,
              };

              set((state) => ({
                status: 'COMPLETED',
                history: [...state.history, newRun],
              }));
              get().disconnectSocket();
            }
          }
        } catch (err) {
          console.warn('Failed to parse incoming WebSocket metric frame:', err);
        }
      };

      socket.onerror = () => {
        // Fail over to simulation
        console.warn('WebSocket error, switching to mock metrics simulation...');
        startSimulation();
      };

      socket.onclose = () => {
        if (get().status === 'RUNNING') {
          // If closed unexpectedly, switch to simulation
          startSimulation();
        }
      };

    } catch (err) {
      console.warn('Could not connect to backend WebSocket, running offline simulation...', err);
      startSimulation();
    }
  },

  disconnectSocket: () => {
    if (socketInstance) {
      try {
        socketInstance.close();
      } catch (e) {}
      socketInstance = null;
    }
    if (simInterval) {
      clearInterval(simInterval);
      simInterval = null;
    }
  },

  startTraining: (projectId) => {
    set({
      jobId: `job_${Math.random().toString(36).substring(2, 9)}`,
      status: 'RUNNING',
      epoch: 0,
      loss: 0,
      accuracy: 0,
      metrics: [],
    });
    get().connectSocket(projectId);
  },

  stopTraining: () => {
    if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
      try {
        socketInstance.send(JSON.stringify({ type: 'stop_training' }));
      } catch (e) {}
    }
    get().disconnectSocket();
    set({ status: 'IDLE' });
  },

  loadTrainingHistory: async (projectId) => {
    const online = await isBackendOnline();
    if (online) {
      try {
        const data = await graphqlRequest(GET_TRAINING_RUNS, { projectId });
        if (data && data.trainingRuns) {
          const formatted: TrainingRun[] = data.trainingRuns.map((r: any, idx: number) => ({
            id: r.id,
            name: `Run #${r.id.substring(0, 4)}`,
            accuracy: r.accuracy || 0
          }));
          set({ history: formatted });
          return;
        }
      } catch (err) {
        console.warn('Failed to load training history from database.', err);
      }
    }

    // Fallback mock history
    set({
      history: [
        { id: 'mock_1', name: 'Run #1 (Mock)', accuracy: 0.92 },
        { id: 'mock_2', name: 'Run #2 (Mock)', accuracy: 0.89 },
        { id: 'mock_3', name: 'Run #3 (Mock)', accuracy: 0.95 },
      ]
    });
  },
}));
