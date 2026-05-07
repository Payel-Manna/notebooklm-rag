import Groq from "groq-sdk";

let client;

export const getGroqClient = () => {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not found in env");
    }

    client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  return client;
};