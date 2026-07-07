import OpenAI from "openai";
import { Readable } from "stream";

export default defineLazyEventHandler(async () => {
  const apiKey = useRuntimeConfig().openaiApiKey;
  if (!apiKey) throw new Error("Missing OpenAI API key");

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  return defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { prompt } = body;

    if (!prompt || prompt.trim() === "") {
      return {}; // Return blank response if prompt is empty
    }

    // Create a Readable stream
    const stream = new Readable({
      read() {}  // No-op implementation for the read method
    });

    // OpenAI streaming request
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an AI writing assistant that continues existing text based on context from prior text. " +
            "Give more weight/priority to the later characters than the beginning ones. " +
            "Limit your response to no more than 200 characters, but make sure to construct complete sentences.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,  // Enable streaming
      n: 1,
    });

    // Use yield to send each part of the streamed response
    for await (const chunk of response) {
      const { choices } = chunk;
      if (choices && choices.length > 0) {
        // Push the streamed chunk into the Readable stream
        stream.push(choices[0].delta.content);
      }
    }

    // Push null to indicate end of stream
    stream.push(null);

    return stream;
  });
});