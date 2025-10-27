import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface StoryTreeNode {
  id: string;
  title: string;
  content: string;
  choices: Array<{ label: string; nextId: string }>;
  ending?: boolean;
  children?: StoryTreeNode[];
}

interface StoryTreeResponse {
  traceId: string;
  tree: {
    topic: string;
    root: StoryTreeNode;
  };
}

const StoryTreeViewer = () => {
  const [topic, setTopic] = useState('森林寶藏');
  const [tree, setTree] = useState<StoryTreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/generate-full-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) {
        throw new Error(`API 錯誤：${res.status}`);
      }
      const data = await res.json();
      setTree(data.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderNode = (node: StoryTreeNode) => (
    <li key={node.id}>
      <div className="tree-node">
        <h4>
          {node.title}
          {node.ending ? ' 🌟' : ''}
        </h4>
        <p>{node.content}</p>
        {node.choices.length > 0 && (
          <ol>
            {node.choices.map((choice) => (
              <li key={choice.nextId}>{choice.label}</li>
            ))}
          </ol>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <ul>{node.children.map((child) => renderNode(child))}</ul>
      )}
    </li>
  );

  return (
    <section className="card">
      <h2>故事樹生成</h2>
      <label>
        主題
        <input value={topic} onChange={(e) => setTopic(e.target.value)} />
      </label>
      <div className="actions">
        <button type="button" onClick={handleGenerate} disabled={loading}>生成故事樹</button>
      </div>
      {loading && <p className="info">生成中……</p>}
      {error && <p className="error">{error}</p>}
      {tree && (
        <div className="result">
          <h3>
            {tree.tree.topic}
            {' '}
            <small>Trace ID: {tree.traceId}</small>
          </h3>
          <ul className="tree-view">
            {renderNode(tree.tree.root)}
          </ul>
        </div>
      )}
    </section>
  );
};

export default StoryTreeViewer;
