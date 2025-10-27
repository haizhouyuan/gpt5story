import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface StoryResponse {
  traceId: string;
  story: string;
  outline: {
    acts: Array<{ title: string; summary: string }>;
  };
  reviewNotes: Array<{ id: string; severity: string; message: string }>;
  revisionPlan: { summary: string; actions: string[] };
  validationReport: {
    summary?: { pass: number; warn: number; fail: number };
    results: Array<{ ruleId: string; status: string; details?: Array<{ message: string }> }>;
  };
}

const StoryGenerator = () => {
  const [topic, setTopic] = useState('霧夜古堡的謎案');
  const [history, setHistory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoryResponse | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, historyContent: history, turnIndex: 0 }),
      });
      if (!res.ok) {
        throw new Error(`API 錯誤：${res.status}`);
      }
      const data = await res.json();
      setResult(data.data as StoryResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <h1>短篇推理小說生成</h1>
      <p className="lead">輸入一個主題，系統會產出完整的高品質侦探短篇故事。</p>
      <label>
        主題設定
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例：霧夜古堡的第八聲" />
      </label>
      <label>
        既有線索（選填）
        <textarea
          rows={3}
          value={history}
          onChange={(e) => setHistory(e.target.value)}
          placeholder="可輸入人物、場景、前情提要等建議要素"
        />
      </label>
      <button type="button" onClick={handleGenerate} disabled={loading || !topic.trim()}>
        {loading ? '生成中…' : '生成故事'}
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="result">
          <h2>故事內容</h2>
          <pre>{result.story}</pre>
          <p className="meta">Trace ID：{result.traceId}</p>

          <section>
            <h3>故事大綱</h3>
            <ul>
              {result.outline.acts.map((act) => (
                <li key={act.title}>
                  <strong>{act.title}</strong> — {act.summary}
                </li>
              ))}
            </ul>
          </section>

          {result.reviewNotes.length > 0 && (
            <section>
              <h3>質檢備註</h3>
              <ul>
                {result.reviewNotes.map((note) => (
                  <li key={note.id}>
                    <strong>{note.severity.toUpperCase()}</strong> {note.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3>修訂建議</h3>
            <p>{result.revisionPlan.summary}</p>
            <ul>
              {result.revisionPlan.actions.map((action, idx) => (
                <li key={`${action}-${idx}`}>{action}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>驗證報告</h3>
            {result.validationReport.summary && (
              <p>
                通過：{result.validationReport.summary.pass} · 警告：{result.validationReport.summary.warn} · 失敗：{result.validationReport.summary.fail}
              </p>
            )}
            <ul>
              {result.validationReport.results.map((item) => (
                <li key={item.ruleId}>
                  <strong>{item.status.toUpperCase()}</strong> {item.ruleId}
                  {item.details?.length ? `：${item.details[0]?.message ?? ''}` : ''}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </section>
  );
};

export default StoryGenerator;
