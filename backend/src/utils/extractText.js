// src/utils/extractText.js

import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// 👇 IMPORTANT: access default correctly
const pdfParse = require("pdf-parse");

export const extractText = async (file) => {
  if (file.mimetype === "text/plain") {
    return fs.readFileSync(file.path, "utf-8");
  }

  if (file.mimetype === "application/pdf") {
    const buffer = fs.readFileSync(file.path);

    // 👇 FIX: handle both export formats safely
    const parser = pdfParse.default ? pdfParse.default : pdfParse;

    const data = await parser(buffer);

    return data.text;
  }

  throw new Error("Unsupported file type");
};