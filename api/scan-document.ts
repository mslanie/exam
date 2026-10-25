import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

async function generateGeminiContent(ai: GoogleGenAI, contents: any) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
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
        err?.message?.includes('404') ||
        err?.message?.includes('no longer available') ||
        err?.message?.includes('NOT_FOUND') ||
        err?.message?.includes('not found');

      if (isNotFound) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  try {
    const { apiKey: clientApiKey, text, image, testOnly } = req.body || {};
    const keyToUse = clientApiKey || process.env.GEMINI_API_KEY;

    if (!keyToUse) {
      return res.status(400).json({
        error: 'Chưa cấu hình Gemini API Key. Vui lòng nhập key trong tab Gemini AI.'
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
      const response = await generateGeminiContent(ai, 'Hello Ms. Lanie, reply with OK.');
      return res.json({ success: true, response: response.text });
    }

    const promptText = `Bạn là trợ lý AI thông minh chuyên hỗ trợ giáo viên tiếng Anh Ms. Lanie.
Nhiệm vụ: Phân tích đề thi hoặc tài liệu bài tập tiếng Anh bên dưới và trích xuất thành danh sách đầy đủ tất cả các câu hỏi điền từ vào chỗ trống (Fill in the blank) dành cho học sinh.

QUY TẮC BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ):
1. PHÂN BIỆT RÕ TỪ GẠCH CHÂN (BLANK) VÀ TỪ CHỈ BÔI ĐẬM (TỪ NHẤN MẠNH):
   - Từ hoặc cụm từ có GẠCH CHÂN (underlined, <u>...</u>, <u>**...**</u>, **<u>...</u>**) LÀ TỪ CẦN ĐIỀN (correctAnswer).
     -> Thay thế CHÍNH XÁC từ gạch chân này bằng đúng 7 dấu gạch dưới: _______
   - Các từ CHỈ BÔI ĐẬM (bold, **...**) mà KHÔNG gạch chân là TỪ NHẤN MẠNH trong câu:
     -> BẮT BUỘC PHẢI GIỮ NGUYÊN các từ bôi đậm này trong câu đề bài, TUYỆT ĐỐI KHÔNG BIẾN THÀNH CHỖ TRỐNG!
     -> VÍ DỤ CỤ THỂ BẮT BUỘC LÀM THEO:
        Gốc: "17. Every day Mr.Vinh goes to Mi’s neighbourhood at 6 **p.m.** with a **<u>garbage</u>** cart"
        Trong câu này: "p.m." chỉ bôi đậm -> GIỮ NGUYÊN "p.m." trong câu. "garbage" có gạch chân -> ĐÂY LÀ ĐÁP ÁN CẦN ĐIỀN (correctAnswer).
        => sentence: "Every day Mr.Vinh goes to Mi’s neighbourhood at 6 p.m. with a _______ cart"
        => correctAnswer: "garbage"
        (TUYỆT ĐỐI KHÔNG ĐƯỢC biến "p.m." thành chỗ trống! Không được trả về "6 _______. with a garbage cart").
   - Nếu trong câu KHÔNG có từ nào gạch chân, mà chỉ có từ bôi đậm: Lúc này mới dùng từ bôi đậm đó làm đáp án cần điền.

2. BỎ QUA HOÀN TOÀN CÁC TIÊU ĐỀ BÀI, PHẦN, HƯỚNG DẪN:
   - Các dòng tiêu đề như "Ex1", "Ex2", "Ex 2:", "Exercise 1", "Part 1", "Unit 1", "Task 1", "Fill in the blank..." TUYỆT ĐỐI KHÔNG ĐƯỢC ĐƯA VÀO DANH SÁCH CÂU HỎI!
   - Chỉ trích xuất các câu bài tập thực sự (ví dụ: các câu đánh số 1, 2, 3... hoặc các câu có chỗ trống/từ cần điền).

3. GIỮ NGUYÊN VẸN CÂU GỐC TỪ ĐẦU ĐẾN CUỐI:
   - Không được cắt bỏ danh xưng, đại từ hay tên người ở đầu câu (Ví dụ: "Mr. Vinh", "Mi's favourite", "Tom's city", "At about 9 p.m.").
   - Không được cắt ngắn đuôi câu (Ví dụ: từ cuối câu "rubbish", "place", "activities" phải được giữ đầy đủ, có dấu chấm câu hoàn chỉnh).
   - Nếu câu bị ngắt dòng do xuống hàng trong tài liệu (ví dụ: dòng 1 là "...sorting", dòng 2 là "rubbish."), hãy ghép lại thành một câu hoàn chỉnh duy nhất.
   - Chỗ trống LUÔN LÀ đúng 7 dấu gạch dưới: _______ (KHÔNG dùng [blank]).

4. ĐẢM BẢO ĐẦY ĐỦ SỐ LƯỢNG CÂU HỎI:
   - Trích xuất ĐỦ tất cả các câu hỏi trong tất cả các phần (ví dụ: nếu đề gồm 4 bài Ex1 (27 câu), Ex2 (24 câu), Ex3 (23 câu), Ex4 (17 câu), tổng cộng phải trả về đủ 91 câu hỏi, không được bỏ sót bất kỳ câu nào).

5. ĐỊNH DẠNG ĐẦU RA:
   - Trả về DUY NHẤT một mảng JSON thuần túy (không bọc trong markdown \`\`\`json):
[
  {
    "sentence": "Every day Mr.Vinh goes to Mi’s neighbourhood at 6 p.m. with a _______ cart",
    "correctAnswer": "garbage",
    "explanation": "Từ cần điền là 'garbage' (rác)."
  }
]

Nội dung tài liệu:
"""
${text || ''}
"""`;

    let contentsPayload: any = promptText;
    if (image && image.data && image.mimeType) {
      contentsPayload = [
        { text: promptText },
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.data
          }
        }
      ];
    }

    const result = await generateGeminiContent(ai, contentsPayload);

    const responseText = result.text || '';
    const cleanJsonStr = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(cleanJsonStr);
    } catch {
      const match = cleanJsonStr.match(/\[[\s\S]*\]/);
      if (match) {
        parsedQuestions = JSON.parse(match[0]);
      }
    }

    const isHeader = (s: string) => {
      const clean = s.replace(/<[^>]+>/g, '').replace(/[*_#~`]/g, '').trim();
      return /^(?:ex(?:ercise)?|part|unit|phần|bài(?:\s+tập)?|task|lesson|test|section)\s*([0-9a-zA-Z\-_]+)?[:\.\-_—–]*$/i.test(clean);
    };

    const sanitized = parsedQuestions
      .filter((q: any) => {
        const s = (q.sentence || '').trim();
        return s.length >= 5 && !isHeader(s);
      })
      .map((q: any) => ({
        ...q,
        sentence: (q.sentence || '').replace(/\[blank\]|_{3,}/g, '_______'),
        correctAnswer: (q.correctAnswer || '').trim()
      }));

    return res.json({ success: true, questions: sanitized });
  } catch (err: any) {
    console.error('Gemini API Vercel scan error:', err);
    return res.status(500).json({
      error: err.message || 'Lỗi khi kết nối với Gemini AI. Vui lòng kiểm tra lại API Key.'
    });
  }
}
