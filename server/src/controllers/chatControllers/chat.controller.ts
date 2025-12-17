import { Request, Response } from 'express';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ChatRequest, Message } from '../../types/index';
//import { createStreamableValue } from 'ai/rsc'; // Or appropriate import

export async function handleChat(req: Request, res: Response): Promise<void> {
  try {
    const { messages }: ChatRequest = req.body;
    const currentMessageContent = messages[messages.length - 1].content;

    // Vector search
    const vectorSearch = await fetch("http://localhost:3000/api/vector", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Changed to JSON
      },
      body: JSON.stringify({ 
        question: currentMessageContent 
      }),
    }).then((res) => res.json());

    // Create system and user messages
    const systemMessage: Message = {
      role: 'system',
      content: 'You are a AI agent from Global Tech, you should always start your messages with "Welcome to Global Tech Support!: "'
    };
    //'You are a custom AI agent made to especialy handle documents and data. if you dont have information related to the required topic make a sumary of what you have and specify you were made to asist employees'
    
    const userMessage: Message = {
      role: 'user',
      content: `Context sections: ${JSON.stringify(vectorSearch)}\n\nQuestion: ${currentMessageContent}`
    };

    // Stream the response
    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
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
      question: currentMessageContent 
    });

  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: "Failed to process chat request" });
  }
}