import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const extractText = async (buffer, mimetype) => {
  if (mimetype === "text/plain") {
    return buffer.toString("utf-8");
  }

  if (mimetype === "application/pdf") {
    const parser = pdfParse.default ? pdfParse.default : pdfParse;
    const data = await parser(buffer);
    return data.text;
  }

  throw new Error("Unsupported file type");
};