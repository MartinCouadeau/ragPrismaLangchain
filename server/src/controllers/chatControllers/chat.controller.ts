import { Request, Response } from 'express';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ChatRequest, Message } from '../../types/index';

export async function handleChat(req: Request, res: Response): Promise<void> {
  try {
    const { messages }: ChatRequest = req.body;
    const currentMessageContent = messages[messages.length - 1].content;

    // Vector search
    const vectorSearch = await fetch("http://localhost:3000/api/seach/vector", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        question: currentMessageContent 
      }),
    }).then((res) => res.json());

    // Create system and user messages
    const systemMessage: Message = {
      role: 'system',
      content: 'You are an AI agent from Global Tech. Handle documents and data, and if you lack information about the topic, summarize what you do have and mention you were made to assist employees. Always answer in the same language the user asked the question.'
    };
  
    const userMessage: Message = {
      role: 'user',
      content: `Context sections: ${JSON.stringify(vectorSearch)}\n\nQuestion: ${currentMessageContent}`
    };

    // Stream the response
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: [systemMessage, userMessage],
    });


    console.log("User Question: ", currentMessageContent)
    console.log("-------")
    process.stdout.write("Ai Answer: ")

    let fullText = ''
    for await (const textPart of result.textStream) {
      fullText += textPart;
      process.stdout.write(textPart);
    }


    console.log("-------")
    // Convert to text stream response and pipe to Express response
    //return result.toTextStreamResponse();
  

    res.status(200).json({ 
      response: fullText,
      content: currentMessageContent 
    });

  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: "Failed to process chat request" });
  }
}
