import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface WorkflowRecord {
  traceId: string;
  topic: string;
  createdAt: string;
  outline?: { topic?: string };
  detectiveOutline?: {
    acts?: Array<{ act: number; focus: string; payoff?: string }>;
    fairnessNotes?: string[];
  };
  draft?: {
    chapters: Array<{ title: string; summary: string; wordCount?: number }>;
    overallWordCount?: number;
  };
  reviewNotes?: Array<{ id: string; severity: string; message: string }>;
  validationReport?: {
    summary?: { pass: number; warn: number; fail: number };
    results: Array<{ ruleId: string; status: string; details?: Array<{ message: string }> }>;
  };
  revisionPlan?: { summary: string; actions: string[] };
  revisionSummary?: {
    mustFix: Array<{ id: string; detail: string; category?: string }>;
    warnings: Array<{ id: string; detail: string; category?: string }>;
    suggestions: string[];
  };
  stageStates?: StageState[];
  events?: Array<{ stage: string; status: string; timestamp: string; message?: string }>;
  telemetry?: {
    stages: Array<{ stage: string; durationMs?: number; notes?: string[]; timestamp?: string }>;
  };
}

interface StageState {
  stage: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
}

interface StageActivityResponse {
  stageStates: StageState[];
  telemetry?: WorkflowRecord['telemetry'];
}

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

const WorkflowMonitor = () => {
  const [topic, setTopic] = useState('工作流測試');
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRecord | null>(null);
  const [activity, setActivity] = useState<StageActivityResponse | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = async (traceToSelect?: string) => {
    setLoadingList(true);
    setError(null);
    try {
      const data = await fetchJson<{ success: boolean; data: WorkflowRecord[] }>(`${API_BASE}/api/workflows`);
      const items = Array.isArray(data.data) ? data.data : [];
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWorkflows(items);
      const nextSelection = traceToSelect
        ?? selectedTraceId
        ?? (items.length > 0 ? items[0].traceId : null);
      setSelectedTraceId(nextSelection ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingList(false);
    }
  };

  const loadDetail = async (traceId: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const detail = await fetchJson<{ success: boolean; data: WorkflowRecord }>(`${API_BASE}/api/workflows/${traceId}`);
      setSelectedWorkflow(detail.data);
      const activityRes = await fetchJson<{ success: boolean; data: StageActivityResponse }>(`${API_BASE}/api/workflows/${traceId}/stage-activity`);
      setActivity(activityRes.data);
    } catch (err) {
      setError((err as Error).message);
      setSelectedWorkflow(null);
      setActivity(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTraceId) {
      loadDetail(selectedTraceId).catch(() => {});
    } else {
      setSelectedWorkflow(null);
      setActivity(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTraceId]);

  const handleCreate = async () => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const result = await fetchJson<{ success: boolean; data: WorkflowRecord; meta: WorkflowRecord }>(
        `${API_BASE}/api/workflows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: trimmed, turnIndex: 0, historyContent: '' }),
        },
      );
      const newTrace = result.data.traceId;
      await loadList(newTrace);
      setTopic('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleRetry = async (traceId: string) => {
    setError(null);
    try {
      const result = await fetchJson<{ success: boolean; data: WorkflowRecord; meta: { retriedFrom?: string } }>(
        `${API_BASE}/api/workflows/${traceId}/retry`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ historyContent: '', turnIndex: 0 }),
        },
      );
      await loadList(result.data.traceId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const stageStates = useMemo(() => activity?.stageStates ?? selectedWorkflow?.stageStates ?? [], [activity, selectedWorkflow]);
  const telemetry = activity?.telemetry ?? selectedWorkflow?.telemetry;

  return (
    <section className="card">
      <h2>工作流監控</h2>
      <div className="workflow-actions">
        <label>
          新主題
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="輸入主題後建立工作流"
          />
        </label>
        <button type="button" onClick={handleCreate} disabled={creating || !topic.trim()}>
          {creating ? '建立中…' : '建立工作流'}
        </button>
        <button type="button" onClick={() => loadList()} disabled={loadingList}>
          重新整理
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="workflow-grid">
        <div className="workflow-list">
          <h3>執行紀錄</h3>
          {loadingList && <p className="info">載入列表中…</p>}
          {workflows.length === 0 && !loadingList && <p className="info">目前沒有工作流紀錄</p>}
          <ul>
            {workflows.map((wf) => (
              <li key={wf.traceId}>
                <button
                  type="button"
                  onClick={() => setSelectedTraceId(wf.traceId)}
                  className={wf.traceId === selectedTraceId ? 'active' : ''}
                >
                  <span className="workflow-topic">{wf.topic}</span>
                  <small>{new Date(wf.createdAt).toLocaleString()}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="workflow-detail">
          {loadingDetail && <p className="info">載入詳情中…</p>}
          {!loadingDetail && !selectedWorkflow && (
            <p className="info">請從左側選擇工作流</p>
          )}
          {selectedWorkflow && (
            <div>
              <header className="workflow-detail__header">
                <div>
                  <h3>{selectedWorkflow.topic}</h3>
                  <p>Trace ID：{selectedWorkflow.traceId}</p>
                  <p>建立時間：{new Date(selectedWorkflow.createdAt).toLocaleString()}</p>
                </div>
                <button type="button" onClick={() => handleRetry(selectedWorkflow.traceId)}>
                  重新執行
                </button>
              </header>
              {stageStates.length > 0 && (
                <section>
                  <h4>階段狀態</h4>
                  <ul className="stage-list">
                    {stageStates.map((state) => (
                      <li key={state.stage}>
                        <strong>{state.stage}</strong>
                        <span className={`status status-${state.status}`}>{state.status}</span>
                        {state.startedAt && <span> · {new Date(state.startedAt).toLocaleTimeString()}</span>}
                        {state.finishedAt && <span> → {new Date(state.finishedAt).toLocaleTimeString()}</span>}
                        {state.errorMessage && <span className="error"> · {state.errorMessage}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {telemetry?.stages && telemetry.stages.length > 0 && (
                <section>
                  <h4>遙測</h4>
                  <ul className="stage-list">
                    {telemetry.stages.map((stage, idx) => (
                      <li key={`${stage.stage}-${idx}`}>
                        <strong>{stage.stage}</strong>
                        {stage.durationMs !== undefined && <span> · {stage.durationMs} ms</span>}
                        {stage.notes && stage.notes.length > 0 && <span> · {stage.notes.join('；')}</span>}
                        {stage.timestamp && <span> · {new Date(stage.timestamp).toLocaleTimeString()}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {selectedWorkflow.reviewNotes && selectedWorkflow.reviewNotes.length > 0 && (
                <section>
                  <h4>審校備註</h4>
                  <ul>
                    {selectedWorkflow.reviewNotes.map((note) => (
                      <li key={note.id}>
                        <strong>{note.severity.toUpperCase()}</strong>
                        {' '}
                        {note.message}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {selectedWorkflow.validationReport && (
                <section>
                  <h4>自動校驗</h4>
                  {selectedWorkflow.validationReport.summary && (
                    <p>
                      通過：{selectedWorkflow.validationReport.summary.pass} · 警告：{selectedWorkflow.validationReport.summary.warn} · 失敗：{selectedWorkflow.validationReport.summary.fail}
                    </p>
                  )}
                  <ul>
                    {selectedWorkflow.validationReport.results.map((result) => (
                      <li key={result.ruleId}>
                        <strong>{result.status.toUpperCase()}</strong>
                        {' '}
                        {result.ruleId}
                        {result.details?.length ? `：${result.details[0]?.message ?? ''}` : ''}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {selectedWorkflow.revisionSummary && (
                <section>
                  <h4>修訂計畫</h4>
                  {selectedWorkflow.revisionSummary.mustFix.length > 0 && (
                    <div>
                      <strong>Must Fix</strong>
                      <ul>
                        {selectedWorkflow.revisionSummary.mustFix.map((item) => (
                          <li key={item.id}>{item.detail}{item.category ? `（${item.category}）` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedWorkflow.revisionSummary.warnings.length > 0 && (
                    <div>
                      <strong>Warnings</strong>
                      <ul>
                        {selectedWorkflow.revisionSummary.warnings.map((item) => (
                          <li key={item.id}>{item.detail}{item.category ? `（${item.category}）` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedWorkflow.revisionSummary.suggestions.length > 0 && (
                    <div>
                      <strong>Suggestions</strong>
                      <ul>
                        {selectedWorkflow.revisionSummary.suggestions.map((item, idx) => (
                          <li key={`${item}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}
              {selectedWorkflow.draft?.chapters && (
                <section>
                  <h4>草稿章節</h4>
                  <ul>
                    {selectedWorkflow.draft.chapters.map((chapter) => (
                      <li key={chapter.title}>
                        <strong>{chapter.title}</strong>
                        {chapter.wordCount !== undefined ? ` · ${chapter.wordCount} 字` : ''}
                        <p>{chapter.summary}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WorkflowMonitor;
