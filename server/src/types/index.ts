export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
}

export interface DocumentResult {
  pageContent: string;
  metadata: Record<string, any>;
}

export interface VectorSearchResponse {
  results: DocumentResult[];
}

export interface ChatResponse {
  id?: string;
  content: string;
  role: 'assistant';
}