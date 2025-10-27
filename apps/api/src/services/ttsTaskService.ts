import { v4 as uuid } from 'uuid';

export interface TtsTask {
  id: string;
  status: 'pending' | 'completed' | 'error';
  createdAt: string;
  completedAt?: string;
  audioUrl?: string;
  message?: string;
}

const tasks = new Map<string, TtsTask>();

const synthesizeMockAudio = (text: string) => {
  const base = Buffer.from(`SYNTH-${text}`).toString('base64');
  return `data:audio/mpeg;base64,${base}`;
};

export const createTtsTask = (text: string): TtsTask => {
  const id = uuid();
  const task: TtsTask = {
    id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  tasks.set(id, task);

  setTimeout(() => {
    try {
      const audioUrl = synthesizeMockAudio(text);
      tasks.set(id, {
        ...task,
        status: 'completed',
        completedAt: new Date().toISOString(),
        audioUrl,
      });
    } catch (error) {
      tasks.set(id, {
        ...task,
        status: 'error',
        message: (error as Error)?.message ?? 'synthesis_failed',
      });
    }
  }, Math.min(5000, Math.max(1000, text.length * 30)));

  return task;
};

export const getTtsTask = (id: string): TtsTask | undefined => tasks.get(id);
