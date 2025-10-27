import { useState } from 'react';
import StoryGenerator from './components/StoryGenerator';
import StoryTreeViewer from './components/StoryTreeViewer';
import TtsTaskPanel from './components/TtsTaskPanel';

const App = () => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'tree' | 'tts'>('interactive');

  return (
    <div className="app">
      <header className="app__header">
        <h1>GPT-5 Story Studio</h1>
        <p>串接 LangChain 工作流，生成推理故事與故事樹。</p>
        <nav className="app__nav">
          <button
            type="button"
            className={activeTab === 'interactive' ? 'active' : ''}
            onClick={() => setActiveTab('interactive')}
          >
            互動故事
          </button>
          <button
            type="button"
            className={activeTab === 'tree' ? 'active' : ''}
            onClick={() => setActiveTab('tree')}
          >
            故事樹
          </button>
          <button
            type="button"
            className={activeTab === 'tts' ? 'active' : ''}
            onClick={() => setActiveTab('tts')}
          >
            語音任務
          </button>
        </nav>
      </header>

      <main className="app__main">
        {activeTab === 'interactive' && <StoryGenerator />}
        {activeTab === 'tree' && <StoryTreeViewer />}
        {activeTab === 'tts' && <TtsTaskPanel />}
      </main>

      <footer className="app__footer">
        <small>API 基礎 URL：{import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}</small>
      </footer>
    </div>
  );
};

export default App;
