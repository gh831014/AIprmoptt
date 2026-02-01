
import { GoogleGenAI, Type } from "@google/genai";
import { AIModelProvider, AISuggestion } from "../types";
import { QWEN_CONFIG } from "../constants";

export class AIService {
  private geminiClient: any;

  constructor() {
    this.geminiClient = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  }

  private async callGemini(prompt: string, systemInstruction?: string) {
    const response = await this.geminiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "你是一位资深的提示词工程师。",
        temperature: 0.7,
      }
    });
    return response.text;
  }

  private async callQwen(prompt: string, systemInstruction?: string) {
    const response = await fetch(`${QWEN_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: QWEN_CONFIG.model,
        messages: [
          { role: 'system', content: systemInstruction || "你是一位资深的提示词工程师。" },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`千问 API 错误: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateSuggestions(promptContent: string, provider: AIModelProvider): Promise<AISuggestion[]> {
    const instruction = `你是一位顶尖的提示词架构师。分析提供的 AI 系统提示词并建议改进方案。
要求：
1. 检查各功能模块是否包含：功能说明、渲染优化、样式优化、性能优化点。
2. 建议如何进一步增强结构，确保逻辑严密。
3. 提出可以增加的专家级工程化细节。
4. 以 JSON 格式返回结果（数组对象，含 category, improvement, reason 键）。
5. 必须使用中文回答。`;
    const userPrompt = `待分析的系统提示词：\n${promptContent}`;

    try {
      let result: string;
      if (provider === AIModelProvider.GEMINI) {
        const response = await this.geminiClient.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: {
                systemInstruction: instruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING },
                            improvement: { type: Type.STRING },
                            reason: { type: Type.STRING }
                        },
                        required: ['category', 'improvement', 'reason']
                    }
                }
            }
        });
        result = response.text;
      } else {
        result = await this.callQwen(userPrompt, instruction);
        const match = result.match(/\[.*\]/s);
        result = match ? match[0] : result;
      }
      return JSON.parse(result);
    } catch (error) {
      console.error("生成建议失败", error);
      return [];
    }
  }

  async optimizePrompt(promptContent: string, provider: AIModelProvider): Promise<string> {
    const instruction = `你是一位顶尖的提示词架构师。你的任务是优化用户提供的系统提示词，使其达到工程化级别。
核心原则：
1. **绝对保留信息**：严禁删除用户输入的任何功能描述、业务逻辑或关键指令。
2. **模块规范化**：对于提示词中出现的每个功能模块（Module），必须确保包含以下四个子项（如果用户没写，请根据上下文AI补全）：
   - **功能说明**：该模块的具体业务逻辑和目标。
   - **渲染优化**：如何提高UI组件的挂载速度、减少重绘、使用懒加载等。
   - **样式优化**：使用 Tailwind CSS 或现代 CSS 方案的视觉规范、响应式处理、暗色模式适配。
   - **性能优化点**：代码层面的优化，如 memoization、Web Workers、请求防抖/节流等。
3. **结构化排版**：使用 Markdown ## 标题区分模块，### 区分模块子项，使用清晰的列表描述步骤。
4. **术语专家化**：将口语转化为精确的软件架构和提示词工程术语。
5. **严禁破坏**：只能做“加法”补全细节和“结构重组”，不允许合并掉用户的小众需求。
请使用中文输出优化后的、极具工程美感的完整提示词。`;
    return provider === AIModelProvider.GEMINI 
      ? await this.callGemini(promptContent, instruction)
      : await this.callQwen(promptContent, instruction);
  }
}

export const aiService = new AIService();
