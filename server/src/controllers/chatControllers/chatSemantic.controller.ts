import { Request, Response } from 'express';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ChatRequest, Message } from '../../types/index';
import { systemMessageContent, historicSystemContent } from '@/utils/promp';

// Simple in-memory conversation store keyed by conversationId (or IP fallback)
type QAHistory = { question: string; answer: string };
const conversationStore: Map<string, { history: QAHistory[]; updatedAt: number }> = new Map();
const MAX_HISTORY_MESSAGES = 100;
const HISTORY_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function handleSemanticChat(req: Request, res: Response): Promise<void> {
  try {
    const { messages = [], conversationId }: ChatRequest & { conversationId?: string } = req.body;
    const currentMessageContent = messages[messages.length - 1]?.content || '';

    const convId = conversationId || (req.headers['x-conversation-id'] as string) || req.ip || 'anonymous';

    // Clean expired histories
    const now = Date.now();
    for (const [key, value] of conversationStore.entries()) {
      if (now - value.updatedAt > HISTORY_TTL_MS) {
        conversationStore.delete(key);
      }
    }

    const existingHistory = conversationStore.get(convId)?.history || [];
    const updatedHistory: QAHistory[] = [
      ...existingHistory,
      { question: currentMessageContent, answer: '' } // answer filled after streaming
    ].slice(-MAX_HISTORY_MESSAGES);


    const semanticSeach = await fetch('http://localhost:3000/api/search/semantic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: currentMessageContent,
      }),
    }).then((res) => res.json());

    const { results = [], totalResults = 0, entityTypes = [], question: searchQuestion } = semanticSeach || {};
    const contextPayload = {
      question: searchQuestion || currentMessageContent,
      totalResults,
      entityTypes,
      results,
    };
  
    console.log("--------------------------------");
    console.log("[semanticGlobalSearch] Context Payload:", contextPayload);
    console.log("--------------------------------");


    const systemMessage: Message = { role: 'system', content: systemMessageContent() };
    
    const historyForPrompt = updatedHistory
      .filter((h) => h.answer) // only include answered turns
      .map((h, idx) => `Turno ${idx + 1} - Pregunta: ${h.question} | Respuesta: ${h.answer}`)
      .join('\n');

    const historicMessage: Message = { role: 'system', content: historicSystemContent(historyForPrompt, currentMessageContent) };
    const historyMessage: Message = {
      role: 'assistant',
      content: historyForPrompt ? `Historial de la conversación:\n${historyForPrompt}` : 'Historial de la conversación: (vacío)'
    };
    const userMessage: Message = {
      role: 'user',
      content: `Datos relevantes:\n${JSON.stringify(contextPayload)}\n\nPregunta actual: ${currentMessageContent}`,
    };

    const chatMessages: Message[] = [systemMessage, historyMessage, userMessage];

    let result

    if (semanticSeach.sql == 'HISTORIC') {
      const chatHistoric: Message[] = [historicMessage, historyMessage, userMessage];

      result = await streamText({
        model: openai('gpt-4o'),
        messages: chatHistoric,
      });
    } else {
        result = await streamText({
          model: openai('gpt-4o'),
          messages: chatMessages,
        });
    }

    

    let fullText = '';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    for await (const textPart of result.textStream) {
      fullText += textPart;
      process.stdout.write(textPart);
      res.write(textPart);
    }

    res.end();

    // Save QA pair (replace last question placeholder with the answered one)
    const savedHistory = [...updatedHistory];
    if (savedHistory.length) {
      savedHistory[savedHistory.length - 1] = { question: currentMessageContent, answer: fullText };
    }
    conversationStore.set(convId, {
      history: savedHistory,
      updatedAt: Date.now(),
    });
    console.log("")
    console.log("-------------------------------------------------------------------------------------------------------------------")
  } catch (error) {
    console.error('Error in chat:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process chat request' });
    } else {
      res.end();
    }
  }
}
