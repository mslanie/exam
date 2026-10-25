import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Helper for Gemini AI content generation with valid model fallbacks
async function generateGeminiContent(ai: GoogleGenAI, contents: string) {
  const models = ["gemini-3.6-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const isNotFound =
        err?.status === 404 ||
        err?.message?.includes("404") ||
        err?.message?.includes("no longer available") ||
        err?.message?.includes("NOT_FOUND") ||
        err?.message?.includes("not found");

      if (isNotFound) {
        console.warn(`Model ${model} not available, attempting next fallback model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // API route for scanning document with Gemini
  app.post("/api/scan-document", async (req, res) => {
    try {
      const { apiKey: clientApiKey, text, testOnly } = req.body;
      const keyToUse = clientApiKey || process.env.GEMINI_API_KEY;

      if (!keyToUse) {
        return res.status(400).json({
          error: "Chưa cấu hình Gemini API Key. Vui lòng nhập key trong tab Gemini AI."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      if (testOnly) {
        const response = await generateGeminiContent(ai, "Hello, reply OK.");
        return res.json({ success: true, response: response.text });
      }

      const prompt = `Bạn là trợ lý AI thông minh chuyên hỗ trợ giáo viên Ms. Lanie.
Nhiệm vụ: Phân tích đoạn văn bản hoặc tài liệu bài giảng tiếng Anh bên dưới và trích xuất ra danh sách các câu hỏi điền từ vào chỗ trống (Fill in the blank) dành cho học sinh.

Yêu cầu nghiêm ngặt:
1. Mỗi câu hỏi phải chứa ký tự [blank] đại diện cho vị trí từ vựng cần điền.
2. Trả về đúng 1 JSON Array thuần túy (không bọc trong markdown \`\`\`json) với định dạng mỗi item:
[
  {
    "sentence": "Learning English requires consistent [blank] every day.",
    "correctAnswer": "practice",
    "explanation": "Dùng 'practice' để chỉ sự rèn luyện thường xuyên."
  }
]
3. Tuyệt đối KHÔNG cần gợi ý từ vựng (không cần field hint).

Văn bản đầu vào:
"""
${text}
"""`;

      const result = await generateGeminiContent(ai, prompt);

      const responseText = result.text || "";
      const cleanJsonStr = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      let parsedQuestions = [];
      try {
        parsedQuestions = JSON.parse(cleanJsonStr);
      } catch (parseErr) {
        console.warn("JSON parse warning, fallback raw text clean:", parseErr);
        const match = cleanJsonStr.match(/\[[\s\S]*\]/);
        if (match) {
          parsedQuestions = JSON.parse(match[0]);
        }
      }

      return res.json({ success: true, questions: parsedQuestions });
    } catch (err: any) {
      console.error("Gemini API scan error:", err);
      return res.status(500).json({
        error: err.message || "Lỗi khi kết nối với Gemini AI. Vui lòng kiểm tra lại API Key."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
