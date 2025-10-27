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
  revisionSummary?: {
    mustFix: Array<{ id: string; detail: string; category?: string }>;
    warnings: Array<{ id: string; detail: string; category?: string }>;
    suggestions: string[];
  };
  validationReport?: {
    summary?: { pass: number; warn: number; fail: number };
    results: Array<{ ruleId: string; status: string; details?: Array<{ message: string }> }>;
    generatedAt?: string;
  };
  detectiveOutline?: {
    acts?: Array<{ act: number; focus: string; payoff?: string }>;
    clueMatrix?: Array<{ clue: string; realMeaning?: string; isRedHerring?: boolean }>;
    fairnessNotes?: string[];
  };
  draft?: {
    chapters: Array<{ title: string; summary: string; wordCount?: number }>;
    overallWordCount?: number;
  };
  stageStates?: Array<{ stage: string; status: string; startedAt?: string; finishedAt?: string; errorMessage?: string }>;
  telemetry?: {
    stages: Array<{ stage: string; durationMs?: number; notes?: string[]; timestamp?: string }>;
  };
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
      if (Array.isArray(data.meta?.events)) {
        setEvents(data.meta.events as WorkflowEvent[]);
      }
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
            revisionSummary: payload.meta.revisionSummary,
            validationReport: payload.meta.validationReport,
            detectiveOutline: payload.meta.detectiveOutline,
            draft: payload.meta.draft,
            stageStates: payload.meta.stageStates,
            telemetry: payload.meta.telemetry,
            events: payload.meta.events as WorkflowEvent[] | undefined,
          });
          if (Array.isArray(payload.meta.events)) {
            setEvents(payload.meta.events as WorkflowEvent[]);
          }
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
      {meta?.stageStates && meta.stageStates.length > 0 && (
        <div className="result">
          <h3>階段狀態</h3>
          <ul>
            {meta.stageStates.map((state) => (
              <li key={state.stage}>
                <strong>{state.stage}</strong>
                {' - '}
                <span className={`status status-${state.status}`}>
                  {state.status}
                </span>
                {state.startedAt && (
                  <span>{` | 開始：${new Date(state.startedAt).toLocaleTimeString()}`}</span>
                )}
                {state.finishedAt && (
                  <span>{` | 結束：${new Date(state.finishedAt).toLocaleTimeString()}`}</span>
                )}
                {state.errorMessage && (
                  <span className="error"> · {state.errorMessage}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {meta?.telemetry?.stages && meta.telemetry.stages.length > 0 && (
        <div className="result">
          <h3>遙測摘要</h3>
          <ul>
            {meta.telemetry.stages.map((stage, idx) => (
              <li key={`${stage.stage}-${idx}`}>
                <strong>{stage.stage}</strong>
                {stage.durationMs !== undefined && (
                  <span>{` · ${stage.durationMs} ms`}</span>
                )}
                {stage.notes && stage.notes.length > 0 && (
                  <span>{` · ${stage.notes.join('；')}`}</span>
                )}
              </li>
            ))}
          </ul>
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
      {meta?.validationReport && (
        <div className="result">
          <h3>自動校驗</h3>
          {meta.validationReport.summary && (
            <p>
              通過：{meta.validationReport.summary.pass} · 警告：{meta.validationReport.summary.warn} · 失敗：{meta.validationReport.summary.fail}
            </p>
          )}
          <ul>
            {meta.validationReport.results.map((item) => (
              <li key={item.ruleId}>
                <strong>{item.status.toUpperCase()}</strong>
                {' '}
                {item.ruleId}
                {item.details?.length ? `：${item.details[0]?.message ?? ''}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {meta?.revisionSummary && (
        <div className="result">
          <h3>修訂計畫</h3>
          {meta.revisionSummary.mustFix.length > 0 && (
            <div>
              <strong>Must Fix</strong>
              <ul>
                {meta.revisionSummary.mustFix.map((item) => (
                  <li key={item.id}>{item.detail}{item.category ? `（${item.category}）` : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {meta.revisionSummary.warnings.length > 0 && (
            <div>
              <strong>Warnings</strong>
              <ul>
                {meta.revisionSummary.warnings.map((item) => (
                  <li key={item.id}>{item.detail}{item.category ? `（${item.category}）` : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {meta.revisionSummary.suggestions.length > 0 && (
            <div>
              <strong>Suggestions</strong>
              <ul>
                {meta.revisionSummary.suggestions.map((suggestion, idx) => (
                  <li key={`suggest-${idx}`}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {meta?.outline?.acts && meta.outline.acts.length > 0 && (
        <div className="result">
          <h3>大綱節拍</h3>
          <ol>
            {meta.outline.acts.map((act) => (
              <li key={act.title}>
                <strong>{act.title}</strong>
                <p>{act.summary}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {meta?.detectiveOutline?.clueMatrix && meta.detectiveOutline.clueMatrix.length > 0 && (
        <div className="result">
          <h3>線索矩陣</h3>
          <ul>
            {meta.detectiveOutline.clueMatrix.map((clue, idx) => (
              <li key={`${clue.clue}-${idx}`}>
                {clue.clue}
                {clue.realMeaning ? ` → ${clue.realMeaning}` : ''}
                {clue.isRedHerring ? '（誤導）' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {meta?.draft?.chapters && meta.draft.chapters.length > 0 && (
        <div className="result">
          <h3>草稿章節概覽（{meta.draft.overallWordCount ?? 0} 字）</h3>
          <ol>
            {meta.draft.chapters.map((chapter) => (
              <li key={chapter.title}>
                <strong>{chapter.title}</strong>
                <span>{chapter.wordCount ? ` · ${chapter.wordCount} 字` : ''}</span>
                <p>{chapter.summary}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

export default StoryGenerator;
