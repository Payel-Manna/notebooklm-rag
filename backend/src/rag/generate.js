import { getGroqClient } from "../services/groq.js";

export const generateAnswer = async (context, question) => {
  const client = getGroqClient();

  const res = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `
You are a strict document QA assistant.

RULES:
- Answer ONLY using the provided context
- Do NOT ask for more context
- Do NOT behave like a chatbot
- If answer not found, say: "I don't know"
- Be concise and factual
        `,
      },
      {
        role: "user",
        content: `
Context:
${context}

Question:
${question}

Answer:
        `,
      },
    ],
  });

  return res.choices[0].message.content;
};