
export enum LayoutType {
  LEFT_MID_RIGHT = '左中右布局',
  TOP_BOTTOM = '上下布局',
  LEFT_RIGHT = '左右布局',
  SIDEBAR_CONTENT = '左侧导航右侧内容布局'
}

export interface FunctionalModule {
  id: string;
  name: string;
  prompt: string;
}

export interface CustomEntry {
  id: string;
  type: 'module' | 'step';
  title: string;
  content: string;
}

export interface PromptConfig {
  projectDefinition: string;
  iaPrompt: string;
  selectedModules: string[];
  customEntries: CustomEntry[];
}

export enum AIModelProvider {
  GEMINI = 'GEMINI',
  QWEN = 'QWEN'
}

export interface DatabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export interface AISuggestion {
  category: string;
  improvement: string;
  reason: string;
}
