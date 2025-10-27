import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface StoryResponse {
  segment: {
    content: string;
    isEnding: boolean;
    choices: Array<{ text: string; intent?: string }>;
  };
  traceId?: string;
}

interface WorkflowEvent {
  stage: string;
  status: string;
  timestamp: string;
  message?: string;
  meta?: Record<string, unknown>;
}

interface WorkflowMeta {
  outline?: {
    acts: Array<{ title: string; summary: string }>;
  };
  reviewNotes?: Array<{ id: string; severity: string; message: string }>;
  revisionPlan?: { summary: string; actions: string[] };
  events?: WorkflowEvent[];
}

const StoryGenerator = () => {
  const [topic, setTopic] = useState('森林寶藏');
  const [historyContent, setHistoryContent] = useState('');
  const [selectedChoice, setSelectedChoice] = useState('');
  const [turnIndex, setTurnIndex] = useState(0);
  const [response, setResponse] = useState<StoryResponse | null>(null);
  const [meta, setMeta] = useState<WorkflowMeta | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => () => {
    eventSourceRef.current?.close();
  }, []);

  const resetState = () => {
    setError(null);
    setLoading(true);
    setMeta(null);
    setResponse(null);
    setEvents([]);
  };

  const handleGenerate = async () => {
    resetState();
    try {
      const res = await fetch(`${API_BASE}/api/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, historyContent, selectedChoice, turnIndex }),
      });
      if (!res.ok) {
        throw new Error(`API 錯誤：${res.status}`);
      }
      const data = await res.json();
      setResponse(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStream = () => {
    resetState();
    eventSourceRef.current?.close();
    const params = new URLSearchParams({
      topic,
      historyContent,
      turnIndex: String(turnIndex),
    });
    if (selectedChoice) params.set('selectedChoice', selectedChoice);
    const source = new EventSource(`${API_BASE}/api/generate-story/stream?${params.toString()}`);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'event') {
          setEvents((prev) => [...prev, payload.event as WorkflowEvent]);
        }
        if (payload.type === 'result') {
          setResponse(payload.data);
          setMeta({
            outline: payload.meta.outline,
            reviewNotes: payload.meta.reviewNotes,
            revisionPlan: payload.meta.revisionPlan,
            events: payload.meta.events as WorkflowEvent[] | undefined,
          });
        }
        if (payload.type === 'error') {
          setError(payload.message);
        }
      } catch (err) {
        console.warn('stream parse error', err);
      }
    };

    source.addEventListener('end', () => {
      setLoading(false);
      source.close();
    });

    source.onerror = (event) => {
      setError('SSE 連線失敗');
      setLoading(false);
      source.close();
    };
  };

  return (
    <section className="card">
      <h2>互動故事生成</h2>
      <div className="form-grid">
        <label>
          主題
          <input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label>
          Turn
          <input
            type="number"
            min={0}
            value={turnIndex}
            onChange={(e) => setTurnIndex(Number.parseInt(e.target.value, 10) || 0)}
          />
        </label>
        <label>
          選擇（可留白）
          <input value={selectedChoice} onChange={(e) => setSelectedChoice(e.target.value)} />
        </label>
      </div>
      <label>
        歷史內容
        <textarea
          rows={4}
          value={historyContent}
          onChange={(e) => setHistoryContent(e.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" onClick={handleGenerate} disabled={loading}>同步生成</button>
        <button type="button" onClick={handleStream} disabled={loading}>啟動流式生成</button>
      </div>
      {loading && <p className="info">生成中……</p>}
      {error && <p className="error">{error}</p>}
      {events && events.length > 0 && (
        <div className="events">
          <h3>階段事件</h3>
          <ul>
            {events.map((event, idx) => (
              <li key={`${event.timestamp}-${idx}`}>
                <strong>{event.stage}</strong> - {event.status} - {new Date(event.timestamp).toLocaleTimeString()}
                {event.message ? `：${event.message}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {response && (
        <div className="result">
          <h3>最新段落</h3>
          <pre>{response.segment.content}</pre>
          <p>是否結局：{response.segment.isEnding ? '是' : '否'}</p>
          <ol>
            {response.segment.choices.map((choice, idx) => (
              <li key={idx}>{choice.text}{choice.intent ? `（${choice.intent}）` : ''}</li>
            ))}
          </ol>
          <p>Trace ID: {response.traceId}</p>
        </div>
      )}
      {meta?.reviewNotes && meta.reviewNotes.length > 0 && (
        <div className="result">
          <h3>審校備註</h3>
          <ul>
            {meta.reviewNotes.map((note) => (
              <li key={note.id}>
                <strong>{note.severity.toUpperCase()}</strong>
                {' '}
                {note.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default StoryGenerator;
