import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface TtsTask {
  id: string;
  status: 'pending' | 'success' | 'error';
  provider?: string;
  durationMs?: number;
  audioUrl?: string;
  error?: string;
}

const TtsTaskPanel = () => {
  const [text, setText] = useState('請閱讀這段推理故事。');
  const [task, setTask] = useState<TtsTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tts/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`API 錯誤：${res.status}`);
      const data = await res.json();
      setTask(data.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTask = async () => {
    if (!task) return;
    try {
      const res = await fetch(`${API_BASE}/api/tts/tasks/${task.id}`);
      if (!res.ok) throw new Error(`API 錯誤：${res.status}`);
      const data = await res.json();
      setTask(data.data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="card">
      <h2>語音任務</h2>
      <label>
        文字內容
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="actions">
        <button type="button" onClick={createTask} disabled={loading}>建立語音任務</button>
        <button type="button" onClick={fetchTask} disabled={!task}>更新狀態</button>
      </div>
      {error && <p className="error">{error}</p>}
      {task && (
        <div className="result">
          <h3>任務 {task.id}</h3>
          <p>狀態：{task.status}</p>
          {task.provider && <p>Provider：{task.provider}</p>}
          {typeof task.durationMs === 'number' && <p>推算時長：{task.durationMs} ms</p>}
          {task.audioUrl && (
            <audio controls src={task.audioUrl}>
              <track kind="captions" />
            </audio>
          )}
          {task.error && <p className="error">{task.error}</p>}
        </div>
      )}
    </section>
  );
};

export default TtsTaskPanel;
