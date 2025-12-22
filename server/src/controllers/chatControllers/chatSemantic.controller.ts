import { Request, Response } from 'express';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ChatRequest, Message } from '../../types/index';

export async function handleSemanticChat(req: Request, res: Response): Promise<void> {
  try {
    const { messages }: ChatRequest = req.body;
    //console.log("Received question: ", messages)
    const currentMessageContent = messages[messages.length - 1].content;

    const semanticSeach = await fetch("http://localhost:3000/api/search/semantic", {
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
      content: `You are a AI agent from Global Tech, your job its to  handle questions about the data on the company DB, the data will arribe in json format. EJ:
      
      {
        "query": "how many deparments are there? and what are their names",
        "sql": "SELECT COUNT(*) as department_count, STRING_AGG(\"name\", ', ') as department_names FROM \"Department\"",
        "explanation": "Counts the number of departments and lists their names",
        "entityTypes": [
            "department"
        ],
        "results": [
            {
                "department_count": 5,
                "department_names": "IT, Recursos Humanos, Marketing, Diseño, Atencion al Cliente"
            }
        ],
        "totalResults": 1
    }
      
      
      you need to interpret the json that you get and use the question as context to form an answer. Always answer in the same language that the question is made (make sure to maintain names and specific properties in their original languages). If you dont have information related to the question made by the user tell them you didnt find any relevant data.`
    };
  
    const userMessage: Message = {
      role: 'user',
      content: `Context sections: ${JSON.stringify(semanticSeach)}\n\nQuestion: ${currentMessageContent}`
    };

    // Stream the response
    const result = await streamText({
      model: openai('gpt-5.2'),
      messages: [systemMessage, userMessage],
    });

    console.log("-------")
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