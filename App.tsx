
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutType, PromptConfig, AIModelProvider, DatabaseConfig, AISuggestion, CustomEntry } from './types';
import { LAYOUT_TEMPLATES, DEFAULT_MODULES, DB_DEFAULTS } from './constants';
import { aiService } from './services/aiService';
import { dbService } from './services/dbService';
import { marked } from 'marked';

// --- 子组件 ---

const SidebarItem: React.FC<{ label: string; active: boolean; onClick: () => void; icon?: React.ReactNode }> = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
      active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
    }`}
  >
    {icon && <span className="mr-3">{icon}</span>}
    {label}
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'database'>('config');
  const [provider, setProvider] = useState<AIModelProvider>(AIModelProvider.GEMINI);
  
  // 提示词配置状态
  const [config, setConfig] = useState<PromptConfig>(() => {
    const saved = localStorage.getItem('prompt_config');
    return saved ? JSON.parse(saved) : {
      projectDefinition: '',
      iaPrompt: '',
      selectedModules: [],
      customEntries: []
    };
  });

  // 数据库状态
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    url: DB_DEFAULTS.url,
    anonKey: DB_DEFAULTS.anonKey,
    isConnected: false
  });
  const [isTestingDB, setIsTestingDB] = useState(false);
  const [dbPrompts, setDbPrompts] = useState<any[]>([]);

  // 输出状态
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [preOptimizedPrompt, setPreOptimizedPrompt] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewSubTab, setPreviewSubTab] = useState<'preview' | 'ai'>('preview');

  // 手动添加表单状态
  const [newEntry, setNewEntry] = useState<{ type: 'module' | 'step'; title: string; content: string }>({
    type: 'module',
    title: '',
    content: ''
  });

  const isDirtyRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem('prompt_config', JSON.stringify(config));
      localStorage.setItem('generated_prompt_draft', generatedPrompt);
    }, 30000);
    return () => clearInterval(timer);
  }, [config, generatedPrompt]);

  const constructPrompt = useCallback((force = false) => {
    if (isDirtyRef.current && !force) return;

    const selectedModulesText = DEFAULT_MODULES
      .filter(m => config.selectedModules.includes(m.id))
      .map(m => `## ${m.name}\n- 功能说明: ${m.prompt}\n- 渲染优化: [待AI补充]\n- 样式优化: [待AI补充]\n- 性能优化点: [待AI补充]`)
      .join('\n\n');
    
    const customModulesText = (config.customEntries || [])
      .filter(e => e.type === 'module')
      .map(e => `## ${e.title}\n- 功能说明: ${e.content}\n- 渲染优化: [待AI补充]\n- 样式优化: [待AI补充]\n- 性能优化点: [待AI补充]`)
      .join('\n\n');

    const stepsText = (config.customEntries || [])
      .filter(e => e.type === 'step')
      .map((e, i) => `${i + 1}. **${e.title || '步骤'}**: ${e.content}`)
      .join('\n');

    const final = `
# 系统角色：AI 软件架构师

## 项目定义
${config.projectDefinition || '尚未定义项目内容。'}

## 信息架构与布局
${config.iaPrompt || '标准灵活布局。'}

${selectedModulesText}

${customModulesText}

## 执行步骤
${stepsText || '1. 分析需求\n2. 构建核心架构\n3. 实现功能模块\n4. 优化与测试'}

## 通用指令
1. 严格遵守上述定义的架构。
2. 使用高质量代码实现所有功能模块。
3. 确保 UI 响应迅速，并使用 Tailwind CSS 保证美观。
4. 提供清晰且可维护的文件结构。
    `.trim();

    setGeneratedPrompt(final);
    if (!preOptimizedPrompt) setPreOptimizedPrompt(final);
    isDirtyRef.current = false;
  }, [config, preOptimizedPrompt]);

  useEffect(() => {
    constructPrompt();
  }, [constructPrompt]);

  const renderedMarkdown = useMemo(() => {
    try {
      return { __html: marked.parse(generatedPrompt) };
    } catch (e) {
      return { __html: '<p class="text-red-500">Markdown 解析出错</p>' };
    }
  }, [generatedPrompt]);

  const toggleModule = (id: string) => {
    setConfig(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(id)
        ? prev.selectedModules.filter(m => m !== id)
        : [...prev.selectedModules, id]
    }));
  };

  const addCustomEntry = () => {
    if (!newEntry.content.trim()) return;
    const entry: CustomEntry = {
      id: Date.now().toString(),
      type: newEntry.type,
      title: newEntry.title || (newEntry.type === 'module' ? '未命名模块' : '步骤'),
      content: newEntry.content
    };
    setConfig(prev => ({
      ...prev,
      customEntries: [...(prev.customEntries || []), entry]
    }));
    setNewEntry({ type: 'module', title: '', content: '' });
  };

  const removeCustomEntry = (id: string) => {
    setConfig(prev => ({
      ...prev,
      customEntries: prev.customEntries.filter(e => e.id !== id)
    }));
  };

  const handleOptimize = async () => {
    setPreOptimizedPrompt(generatedPrompt);
    setIsGenerating(true);
    setPreviewSubTab('ai');
    try {
      const optimized = await aiService.optimizePrompt(generatedPrompt, provider);
      setGeneratedPrompt(optimized);
      const newSuggestions = await aiService.generateSuggestions(optimized, provider);
      setSuggestions(newSuggestions);
      isDirtyRef.current = true;
    } catch (err) {
      alert("AI 优化失败，请检查 API 密钥或网络连接。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = () => {
    if (preOptimizedPrompt) {
      setGeneratedPrompt(preOptimizedPrompt);
      setSuggestions([]);
      alert("已还原至 AI 优化前的提示词。");
    }
  };

  const handleTestDB = async () => {
    setIsTestingDB(true);
    try {
      const ok = dbService.init(dbConfig.url, dbConfig.anonKey);
      if (ok) {
        const connected = await dbService.testConnection();
        setDbConfig(prev => ({ ...prev, isConnected: connected }));
        if (connected) {
          alert("Supabase 连接成功！");
          fetchSavedPrompts();
        } else {
          alert("无法访问数据库。请检查配置。");
        }
      }
    } catch (err: any) {
      alert("连接过程异常: " + err.message);
    } finally {
      setIsTestingDB(false);
    }
  };

  const fetchSavedPrompts = async () => {
    try {
      const data = await dbService.listPrompts();
      setDbPrompts(data || []);
    } catch (e) {
      console.error("加载列表失败", e);
    }
  };

  const handleLoadFromDB = async (id: number) => {
    try {
      const full = await dbService.getPromptById(id);
      setGeneratedPrompt(full.content);
      isDirtyRef.current = true;
      setActiveTab('preview');
      setPreviewSubTab('preview');
      alert(`已从数据库加载提示词: ${full.name}`);
    } catch (e) {
      alert("加载失败");
    }
  };

  const handleSaveToDB = async () => {
    if (!dbConfig.isConnected) {
      alert("请先连接数据库！");
      setActiveTab('database');
      return;
    }
    try {
      const name = prompt("请输入此提示词的保存名称：") || `新建提示词_${new Date().toLocaleTimeString()}`;
      await dbService.savePrompt(name, generatedPrompt);
      alert("提示词保存成功！");
      fetchSavedPrompts();
    } catch (e: any) {
      alert(`保存出错：${e.message}`);
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0e14]">
      {/* 侧边栏 */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            提示词架构师
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">系统提示词引擎</p>
        </div>
        
        <nav className="flex-1 mt-4">
          <SidebarItem label="提示词配置" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
          <SidebarItem label="预览与 AI 建议" active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} />
          <SidebarItem label="数据库与同步" active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
        </nav>

        <div className="p-4 border-t border-gray-800">
          <label className="text-xs text-gray-500 mb-2 block uppercase">当前 AI 模型</label>
          <div className="flex bg-gray-900 p-1 rounded-lg">
            <button 
              onClick={() => setProvider(AIModelProvider.GEMINI)}
              className={`flex-1 py-1 px-2 text-xs rounded ${provider === AIModelProvider.GEMINI ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Gemini
            </button>
            <button 
              onClick={() => setProvider(AIModelProvider.QWEN)}
              className={`flex-1 py-1 px-2 text-xs rounded ${provider === AIModelProvider.QWEN ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              通义千问
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          
          {activeTab === 'config' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <h2 className="text-lg font-semibold mb-4 text-white flex items-center">
                  <span className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mr-3 text-sm font-bold">1</span>
                  项目定义
                </h2>
                <textarea
                  className="w-full h-32 bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none shadow-inner"
                  placeholder="填写你的工具定义、目标和需要解决的问题..."
                  value={config.projectDefinition}
                  onChange={e => setConfig(prev => ({ ...prev, projectDefinition: e.target.value }))}
                />
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-4 text-white flex items-center">
                  <span className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mr-3 text-sm font-bold">2</span>
                  预设功能模块 (一键添加)
                </h2>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_MODULES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => toggleModule(m.id)}
                      className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all ${
                        config.selectedModules.includes(m.id)
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-4 text-white flex items-center">
                  <span className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mr-3 text-sm font-bold">3</span>
                  手动添加模块或步骤
                </h2>
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
                  <div className="flex gap-4">
                    <select 
                      className="bg-gray-950 border border-gray-800 rounded-lg px-3 text-sm text-gray-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      value={newEntry.type}
                      onChange={e => setNewEntry(prev => ({ ...prev, type: e.target.value as any }))}
                    >
                      <option value="module">## 功能模块</option>
                      <option value="step">有序执行步骤</option>
                    </select>
                    <input 
                      type="text"
                      placeholder={newEntry.type === 'module' ? "模块名称 (如: 实时数据可视化)" : "步骤标题 (可选)"}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      value={newEntry.title}
                      onChange={e => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <textarea 
                    placeholder={newEntry.type === 'module' ? "描述该模块的具体功能需求..." : "详细描述该步骤需要 AI 完成的工作..."}
                    className="w-full h-24 bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                    value={newEntry.content}
                    onChange={e => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                  />
                  <button 
                    onClick={addCustomEntry}
                    className="w-full py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg text-sm font-bold transition-all border border-indigo-500/20"
                  >
                    确认添加
                  </button>
                </div>

                {/* 已添加列表预览 */}
                {config.customEntries.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.customEntries.map(entry => (
                      <div key={entry.id} className="relative group bg-gray-900/30 border border-gray-800 rounded-xl p-4 hover:border-indigo-500/30 transition-all">
                        <button 
                          onClick={() => removeCustomEntry(entry.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${entry.type === 'module' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-green-500/10 text-green-400'}`}>
                          {entry.type === 'module' ? '模块' : '步骤'}
                        </span>
                        <h4 className="text-sm font-bold text-gray-200 mt-2 truncate">{entry.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setActiveTab('preview')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center group"
                >
                  进入预览并执行 AI 补全
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* 左侧：编辑器 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-white">工程化编辑器 (MD)</h3>
                    {isDirtyRef.current && <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded animate-pulse">草稿已更改</span>}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => constructPrompt(true)}
                      title="重置为模板"
                      className="text-[10px] bg-gray-800 text-gray-400 hover:bg-gray-700 px-2 py-1 rounded border border-gray-700"
                    >
                      重置
                    </button>
                    <button 
                      onClick={handleRestore}
                      title="还原原稿"
                      className="text-[10px] bg-gray-800 text-gray-400 hover:bg-gray-700 px-2 py-1 rounded border border-gray-700"
                    >
                      还原
                    </button>
                    <button 
                      onClick={handleOptimize} 
                      disabled={isGenerating}
                      className="text-xs bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-1.5 rounded-lg font-bold shadow-lg shadow-indigo-600/20 disabled:bg-gray-700 transition-all"
                    >
                      {isGenerating ? 'AI 深度优化中...' : 'AI 深度优化(补全模块) ✨'}
                    </button>
                  </div>
                </div>
                <textarea
                  className="w-full h-[70vh] bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-sm font-mono text-gray-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all leading-relaxed"
                  value={generatedPrompt}
                  onChange={e => {
                    setGeneratedPrompt(e.target.value);
                    isDirtyRef.current = true;
                  }}
                />
              </div>

              {/* 右侧：实时预览 */}
              <div className="flex flex-col space-y-4">
                <div className="flex border-b border-gray-800">
                  <button 
                    onClick={() => setPreviewSubTab('preview')}
                    className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${previewSubTab === 'preview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                  >
                    渲染预览
                  </button>
                  <button 
                    onClick={() => setPreviewSubTab('ai')}
                    className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${previewSubTab === 'ai' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                  >
                    架构审查建议 {suggestions.length > 0 && `(${suggestions.length})`}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto h-[65vh]">
                    {previewSubTab === 'preview' ? (
                      <div 
                        className="glass-panel rounded-xl p-8 prose prose-invert max-w-none shadow-2xl"
                        dangerouslySetInnerHTML={renderedMarkdown}
                      />
                    ) : (
                      <div className="space-y-4">
                        {suggestions.length === 0 ? (
                          <div className="bg-gray-900/30 border border-dashed border-gray-800 rounded-xl p-12 text-center text-gray-500">
                            <p className="mb-2">点击“AI 深度优化”触发工程化补全与审查。</p>
                            <p className="text-[10px] text-gray-600 font-mono italic">
                              提示: AI 将自动为每个模块补充[渲染优化]、[样式优化]和[性能优化点]。
                            </p>
                          </div>
                        ) : (
                          suggestions.map((s, idx) => (
                            <div key={idx} className="bg-gray-900 border border-gray-800 p-4 rounded-xl hover:border-indigo-500/30 transition-colors">
                              <div className="flex items-center mb-2">
                                <span className="text-[10px] uppercase tracking-tighter bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold mr-3">
                                  {s.category}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-white mb-1">{s.improvement}</p>
                              <p className="text-xs text-gray-500 italic">{s.reason}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveToDB}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                    <span>保存当前架构到云端</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              {/* ... 数据库部分保持不变但优化视觉体验 ... */}
              <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-3xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-white">架构库</h3>
                    <p className="text-sm text-gray-500 mt-1">管理您所有的工程化提示词资产。</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${dbConfig.isConnected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                    {dbConfig.isConnected ? '● 云同步已就绪' : '○ 离线模式'}
                  </div>
                </div>

                {!dbConfig.isConnected ? (
                  <div className="space-y-6 max-w-2xl">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-widest">Supabase 项目 URL</label>
                        <input 
                          type="text"
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={dbConfig.url}
                          onChange={e => setDbConfig(prev => ({ ...prev, url: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-widest">API Anon Key</label>
                        <input 
                          type="password"
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={dbConfig.anonKey}
                          onChange={e => setDbConfig(prev => ({ ...prev, anonKey: e.target.value }))}
                        />
                      </div>
                    </div>
                    <button 
                        onClick={handleTestDB}
                        disabled={isTestingDB}
                        className={`w-full font-bold py-4 rounded-xl transition-all shadow-xl ${isTestingDB ? 'bg-gray-800 text-gray-500' : 'bg-white text-gray-900 hover:bg-indigo-50'}`}
                      >
                        {isTestingDB ? '连接中...' : '连接并初始化云库'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                        <h4 className="text-sm font-bold text-gray-400 flex items-center">
                          已保存架构 <span className="ml-2 bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full text-[10px]">{dbPrompts.length}</span>
                        </h4>
                        <button onClick={fetchSavedPrompts} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          刷新
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dbPrompts.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-gray-600 border border-dashed border-gray-800 rounded-3xl">
                            架构库为空，开始您的第一个工程吧
                        </div>
                      ) : (
                        dbPrompts.map(p => (
                          <div key={p.id} className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/50 hover:bg-gray-800/50 transition-all flex flex-col group">
                            <h5 className="text-lg font-bold text-gray-100 mb-2 truncate group-hover:text-indigo-400 transition-colors">{p.name}</h5>
                            <p className="text-[10px] text-gray-500 font-mono">{new Date(p.created_at).toLocaleString()}</p>
                            <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                  onClick={() => handleLoadFromDB(p.id)}
                                  className="flex-1 text-xs bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-500 transition-colors"
                              >
                                加载架构
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <button onClick={() => setDbConfig(prev => ({ ...prev, isConnected: false }))} className="text-xs text-gray-600 hover:text-gray-400 underline underline-offset-4">切换数据库配置</button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
