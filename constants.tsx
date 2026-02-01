
import React from 'react';
import { LayoutType, FunctionalModule } from './types';

export const LAYOUT_TEMPLATES: Record<LayoutType, string> = {
  [LayoutType.LEFT_MID_RIGHT]: "实现三栏布局。左侧栏用于导航，中间栏为主要内容区，右侧栏用于辅助组件和详情。使用响应式宽度（如：20%/60%/20%）。",
  [LayoutType.TOP_BOTTOM]: "实现垂直堆叠布局。顶部设为固定或粘性页眉/导航，中间为可滚动的正文内容，底部为功能齐全的页脚。",
  [LayoutType.LEFT_RIGHT]: "实现现代双栏界面。左侧窗格包含控件和输入，右侧窗格提供实时预览或输出显示。标准比例为 40/60。",
  [LayoutType.SIDEBAR_CONTENT]: "实现经典的后台管理风格布局，左侧为可折叠侧边栏，右侧为开阔的仪表板内容区域。确保侧边栏切换时过渡顺滑。"
};

export const DEFAULT_MODULES: FunctionalModule[] = [
  { id: 'md_io', name: 'MD 文件导入/导出', prompt: '包含对 Markdown 文件的导入和导出功能，并支持语法高亮。' },
  { id: 'multi_model', name: '多模型配置', prompt: '实现配置提供程序，允许在不同 AI 模型（如 Gemini, 千问）之间切换。' },
  { id: 'preview', name: '支持预览', prompt: '在侧边预览窗格中启用生成内容的实时渲染。' },
  { id: 'pdf_import', name: '导入 PDF', prompt: '集成 PDF 解析能力，提取文本内容进行处理。' },
  { id: 'pdf_export', name: '导出 PDF', prompt: '为分析报告和摘要提供高质量的 PDF 生成功能。' },
  { id: 'analysis', name: '生成分析报告', prompt: '增加一个模块，利用 AI 推理根据输入数据生成结构化分析报告。' },
  { id: 'crawler', name: '网页爬虫', prompt: '支持输入网站 URL 进行爬虫抓取，获取实时信息进行分析。' },
  { id: 'cors_fix', name: '跨域问题解决', prompt: '实现服务端代理方案，解决前端调用的跨域 (CORS) 请求问题。' },
  { id: 'loading_win', name: '显示加载过程窗口', prompt: '包含详细的进度条和加载状态弹窗，用于耗时较长的 AI 操作。' }
];

export const DB_DEFAULTS = {
  url: 'https://lnwiqirwjeeeahsjgzwg.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxud2lxaXJ3amVlZWFoc2pnendnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTM0NTIsImV4cCI6MjA4NTQyOTQ1Mn0.t0Bv0CBl5CSrFe3VVaUNJXsnvtIN1sJ5y6J7tRTgWE0'
};

export const QWEN_CONFIG = {
  apiKey: 'sk-04b4d0e1038c4fe2abb8dcbaefe2ac56',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-plus'
};
