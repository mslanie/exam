import { Question } from '../types';

export const BLANK_PLACEHOLDER = '_______';
export const BLANK_REGEX = /\[blank\]|_{3,}/g;

export interface ScannedResultItem {
  sentence: string;
  correctAnswer: string;
  explanation?: string;
}

/**
 * Normalizes any blank variation ([blank], ___, .......) into standard _______
 */
export function normalizeBlankSentence(sentence: string): string {
  if (!sentence) return '';
  return sentence.replace(BLANK_REGEX, BLANK_PLACEHOLDER);
}

/**
 * Detects whether a line or sentence is an exercise header (e.g. Ex1, Ex2, Exercise 2, Part 1, Unit 3)
 * or general exam instruction, so it is NEVER added as a quiz question.
 */
export function isExerciseHeaderOrInstruction(rawLine: string): boolean {
  if (!rawLine) return false;
  // Strip HTML tags and markdown formatting characters
  const clean = rawLine
    .replace(/<[^>]+>/g, '')
    .replace(/[*_#~`]/g, '')
    .trim();

  if (!clean) return true;

  // Short header: "Ex1", "Ex 2", "Ex2:", "Exercise 1", "Exercise 2", "Part 1", "Unit 3", "Phần 1", "Bài 2", "Task 1", "Lesson 2", "Section 1"
  if (/^(?:ex(?:ercise)?|part|unit|phần|bài(?:\s+tập)?|task|lesson|test|section)\s*([0-9a-zA-Z\-_]+)?[:\.\-_—–]*$/i.test(clean)) {
    return true;
  }

  // Header with instruction text: "Ex 2: Fill in the blanks...", "Exercise 1. Read the text..."
  if (/^(?:ex(?:ercise)?|part|unit|phần|bài(?:\s+tập)?|task|lesson|test|section)\s*([0-9a-zA-Z\-_]+)?[:\.\-_—–]+\s*(?:fill|complete|choose|read|circle|write|điền|chọn|hoàn thành|hãy).*$/i.test(clean)) {
    return true;
  }

  // Pure instruction lines
  if (/^(?:read\s+(?:the\s+)?(?:text|passage|following)|fill\s+in\s+the\s+blank|complete\s+the\s+sentences|choose\s+the\s+correct|điền\s+vào\s+chỗ\s+trống|hãy\s+điền|khoanh\s+vào)/i.test(clean)) {
    return true;
  }

  // Roman numeral section headers like "I. VOCABULARY", "II. GRAMMAR", "III. READING"
  if (/^[IVXLCDM]+\.\s+[A-Z\s]{3,}$/i.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Converts rich HTML (from Microsoft Word, Google Docs, or Mammoth) into markdown formatted text.
 * Preserves bold (**word**) and underline (<u>word</u>) so they can be identified as blanks.
 */
export function convertHtmlToFormattedMarkdown(html: string): string {
  if (!html || typeof html !== 'string') return '';

  if (typeof DOMParser === 'undefined') {
    // Basic fallback if DOMParser is not available
    return html
      .replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
      .replace(/<[^>]+>/g, ' ')
      .trim();
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    function walkNode(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        let inner = '';
        for (let i = 0; i < el.childNodes.length; i++) {
          inner += walkNode(el.childNodes[i]);
        }

        if (!inner.trim()) {
          if (tagName === 'br' || tagName === 'p' || tagName === 'div' || tagName === 'tr') {
            return '\n';
          }
          return inner;
        }

        const style = el.getAttribute('style') || '';
        const isBold =
          tagName === 'b' ||
          tagName === 'strong' ||
          /font-weight:\s*(?:bold|700|800|900)/i.test(style);
        const isUnderline =
          tagName === 'u' ||
          /text-decoration:\s*(?:[^;]*\b)?underline/i.test(style);

        let formatted = inner;
        if (isBold && isUnderline) {
          formatted = `<u>**${inner.trim()}**</u>`;
        } else if (isUnderline) {
          formatted = `<u>${inner.trim()}</u>`;
        } else if (isBold) {
          formatted = `**${inner.trim()}**`;
        }

        if (['p', 'div', 'tr', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          return '\n' + formatted + '\n';
        }
        if (tagName === 'br') {
          return '\n';
        }

        return formatted;
      }
      return '';
    }

    const result = walkNode(doc.body);
    return result
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (err) {
    console.warn('DOMParser error, fallback to regex:', err);
    return html.replace(/<[^>]+>/g, ' ').trim();
  }
}

/**
 * Direct call to Google Gemini REST API using the user's API Key.
 * Supports gemini-3.8-flash, gemini-flash-latest, and gemini-2.5-flash with image support.
 */
async function callGeminiDirectly(
  apiKey: string,
  prompt: string,
  base64Image?: { mimeType: string; data: string }
): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey.trim()
      )}`;

      const parts: any[] = [{ text: prompt }];
      if (base64Image) {
        parts.push({
          inlineData: {
            mimeType: base64Image.mimeType,
            data: base64Image.data
          }
        });
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(message);
      }

      const data = await res.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (candidateText) {
        return candidateText;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Direct Gemini call failed with model ${model}:`, err.message);
    }
  }

  throw lastError || new Error('Không thể kết nối đến Google Gemini API');
}

/**
 * Tests the Gemini API Key.
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'Vui lòng nhập API Key trước khi kiểm tra!' };
  }

  const cleanKey = apiKey.trim();

  // Try server endpoint first
  try {
    const res = await fetch('/api/scan-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: cleanKey,
        testOnly: true,
        text: 'Hello, reply OK.'
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          message: 'Kết nối thành công qua máy chủ! AI Gemini đã sẵn sàng hoạt động.'
        };
      }
      if (!res.ok && data.error) {
        return { success: false, message: data.error };
      }
    }
  } catch (err) {
    console.warn('Backend /api/scan-document not reachable, trying direct Gemini API...', err);
  }

  // Fallback: Direct test to Google Gemini REST API (Client-side for Vercel static deploys)
  try {
    const testResult = await callGeminiDirectly(cleanKey, 'Hello Ms. Lanie, reply with OK.');
    if (testResult && testResult.length > 0) {
      return {
        success: true,
        message: 'Kết nối thành công trực tiếp với Google Gemini AI! Đã sẵn sàng quét đề trên Vercel.'
      };
    }
    return { success: false, message: 'Google Gemini phản hồi rỗng.' };
  } catch (directErr: any) {
    const errMsg = directErr?.message || 'Lỗi không xác định khi kết nối Gemini API';
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key not valid')) {
      return { success: false, message: 'Gemini API Key không hợp lệ. Vui lòng kiểm tra lại mã key.' };
    }
    if (errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      return { success: false, message: 'API Key đã vượt quá hạn mức miễn phí (Quota exceeded).' };
    }
    return { success: false, message: `Lỗi kết nối Gemini API: ${errMsg}` };
  }
}

/**
 * Extracts questions from text or image using Gemini AI (server or direct client fallback).
 */
export async function scanDocumentWithAI(
  apiKey: string,
  rawText: string,
  base64Image?: { mimeType: string; data: string }
): Promise<{ success: boolean; questions: ScannedResultItem[]; error?: string }> {
  const prompt = `Bạn là trợ lý AI thông minh chuyên hỗ trợ giáo viên tiếng Anh Ms. Lanie.
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
${rawText}
"""`;

  let responseText = '';

  // 1. Try server-side endpoint first
  try {
    const res = await fetch('/api/scan-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey?.trim(),
        text: rawText,
        image: base64Image
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        const normalized = data.questions
          .filter((q: any) => {
            const s = (q.sentence || '').trim();
            if (!s || s.length < 5) return false;
            if (isExerciseHeaderOrInstruction(s)) return false;
            return true;
          })
          .map((q: any) => ({
            sentence: normalizeBlankSentence(q.sentence || ''),
            correctAnswer: (q.correctAnswer || '').trim(),
            explanation: q.explanation || 'Giải thích từ AI Gemini.'
          }));
        if (normalized.length > 0) {
          return { success: true, questions: normalized };
        }
      }
    }
  } catch (err) {
    console.warn('Server endpoint scan failed, falling back to direct Gemini call...', err);
  }

  // 2. Direct Gemini API call (Client-side for Vercel static deploys)
  if (apiKey && apiKey.trim()) {
    try {
      responseText = await callGeminiDirectly(apiKey.trim(), prompt, base64Image);
    } catch (err: any) {
      console.warn('Direct Gemini call failed:', err);
      return {
        success: false,
        questions: [],
        error: err?.message || 'Không thể kết nối đến Gemini AI.'
      };
    }
  }

  if (!responseText) {
    return { success: false, questions: [], error: 'Không nhận được dữ liệu từ Gemini AI.' };
  }

  // Parse JSON response from Gemini
  try {
    const cleanJson = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = cleanJson.match(/\[[\s\S]*\]/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      const normalized: ScannedResultItem[] = parsed
        .filter((q: any) => {
          const s = (q.sentence || '').trim();
          if (!s || s.length < 5) return false;
          if (isExerciseHeaderOrInstruction(s)) return false;
          return true;
        })
        .map((q) => ({
          sentence: normalizeBlankSentence(q.sentence || ''),
          correctAnswer: (q.correctAnswer || '').trim(),
          explanation: q.explanation || 'Giải thích từ AI Gemini.'
        }));
      if (normalized.length > 0) {
        return { success: true, questions: normalized };
      }
    }
  } catch (parseErr) {
    console.error('Lỗi khi phân tích JSON từ Gemini:', parseErr);
  }

  return { success: false, questions: [], error: 'Không thể giải mã dữ liệu trả về từ Gemini.' };
}

/**
 * Smart Local Parser:
 * 1. Accurately extracts questions line by line from exercises (Ex1: 1..27, Ex2: 1..24, etc.).
 * 2. Excludes section/exercise headers (Ex1, Ex2, Exercise 2, etc.) so they NEVER become questions.
 * 3. Priority rule: Words with UNDERLINE (<u>...</u>, **<u>...</u>**) are the target answer/blank (_______).
 *    Words that are BOLD ONLY (**...**) are emphasis words and kept intact in the sentence.
 * 4. Joins multi-line wrapped text (like "sorting\n rubbish.") back into complete sentences.
 * 5. Replaces ONLY the target word with standard _______ (7 underscores).
 * 6. Preserves all titles (Mr. Vinh, Mrs.), quotes, and trailing words without truncation.
 */
export function extractQuestionsLocally(rawText: string): Question[] {
  if (!rawText || !rawText.trim()) return [];

  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim());

  interface QuestionUnit {
    exerciseTitle: string;
    questionNumber: number;
    fullText: string;
  }

  const units: QuestionUnit[] = [];
  let currentExercise = 'Bài tập';
  let currentUnit: QuestionUnit | null = null;
  let runningAutoIndex = 1;

  for (let line of rawLines) {
    if (!line) continue;

    // Check if line starts with an inline header: "Ex2: 1. Tom's city..."
    const inlineHeaderMatch = line.match(
      /^(\*{0,2}|<[^>]+>)?\s*(?:ex(?:ercise)?|part|unit|phần|bài(?:\s+tập)?)\s*([0-9a-zA-Z\-_]+)?[:\.\-_—–]+\s+(\d+[\.\)].*)$/i
    );
    if (inlineHeaderMatch) {
      currentExercise = inlineHeaderMatch[0]
        .replace(inlineHeaderMatch[3], '')
        .replace(/<[^>]+>|[*_#:\.\s]/g, '')
        .trim();
      line = inlineHeaderMatch[3].trim();
    }

    // Check if line itself is an exercise / section header or instruction (e.g. "Ex1:", "Ex2", "Exercise 2", "Phần 1:")
    if (isExerciseHeaderOrInstruction(line)) {
      if (currentUnit) {
        units.push(currentUnit);
        currentUnit = null;
      }
      currentExercise = line
        .replace(/<[^>]+>|[*_#]/g, '')
        .replace(/[:\.\s]+$/, '')
        .trim();
      continue; // NEVER add headers as questions!
    }

    // Detect numbered item: "1. ", "2) ", "24. ", "Câu 1:"
    const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)$/i) || line.match(/^câu\s*(\d+)[:\.]\s+(.*)$/i);

    if (numMatch) {
      if (currentUnit) {
        units.push(currentUnit);
      }
      currentUnit = {
        exerciseTitle: currentExercise,
        questionNumber: parseInt(numMatch[1], 10),
        fullText: numMatch[2].trim()
      };
    } else if (currentUnit) {
      // Continuation line (e.g. wrapped sentence like "rubbish.")
      currentUnit.fullText += ' ' + line.trim();
    } else {
      // Standalone line without number
      const cleanLine = line.replace(/<[^>]+>|[*_#]/g, '').trim();
      if (!isExerciseHeaderOrInstruction(cleanLine) && cleanLine.length > 5) {
        units.push({
          exerciseTitle: currentExercise,
          questionNumber: runningAutoIndex++,
          fullText: line.trim()
        });
      }
    }
  }

  if (currentUnit) {
    units.push(currentUnit);
  }

  // Step 2: Convert each QuestionUnit into a Question object
  const parsedQuestions: Question[] = [];

  // Filter out any unit that is a header or too short
  const validUnits = units.filter((u) => {
    const text = u.fullText.trim();
    return text.length >= 3 && !isExerciseHeaderOrInstruction(text);
  });

  validUnits.forEach((unit, idx) => {
    let raw = unit.fullText;
    let targetAnswer = '';
    let processedSentence = '';

    // RULE 1: Underline has HIGHEST priority!
    // Words with underline (<u>...</u>, <u>**...**</u>, **<u>...</u>**) are the target answer/blank.
    // Words that are BOLD ONLY (**...**) are emphasis words and kept intact in the sentence.
    const underlineRegex = /(?:<u>\*\*|\*\*<u>|<u[^>]*>\*\*|\*\*<u[^>]*>|<u[^>]*>)([\s\S]+?)(?:<\/u>\*\*|\*\*<\/u>|<\/u>)/i;
    const underlineMatch = raw.match(underlineRegex);

    if (underlineMatch) {
      // Extract target answer from underlined group
      targetAnswer = underlineMatch[1].replace(/<[^>]+>|\*|_/g, '').trim();
      // Replace ONLY the underlined token with standard _______
      processedSentence = raw.replace(underlineMatch[0], BLANK_PLACEHOLDER);

      // Clean remaining emphasis tokens from the sentence (e.g., **p.m.** -> p.m., <b>p.m.</b> -> p.m.)
      // so students see clean text without markdown asterisks
      processedSentence = processedSentence
        .replace(/\*\*([^*]+?)\*\*/g, '$1')
        .replace(/<(?:b|strong)[^>]*>(.*?)<\/(?:b|strong)>/gi, '$1')
        .replace(/<\/?u>/gi, '');
    } else {
      // RULE 2: Fallback to Bold if NO underline exists in the sentence
      // E.g., "Mr. Vinh is a **garbage** collector." or "Mr. Vinh is hard-working and **responsible**"
      const boldRegex = /\*\*([^*]+?)\*\*|<(?:b|strong)[^>]*>([\s\S]+?)<\/(?:b|strong)>/i;
      const boldMatch = raw.match(boldRegex);

      if (boldMatch) {
        targetAnswer = (boldMatch[1] || boldMatch[2] || '').replace(/<[^>]+>|\*|_/g, '').trim();
        processedSentence = raw.replace(boldMatch[0], BLANK_PLACEHOLDER);
        processedSentence = processedSentence
          .replace(/\*\*([^*]+?)\*\*/g, '$1')
          .replace(/<(?:b|strong)[^>]*>(.*?)<\/(?:b|strong)>/gi, '$1')
          .replace(/<\/?u>/gi, '');
      } else if (BLANK_REGEX.test(raw) || /_{2,}/.test(raw)) {
        // Sentence already has _______ or [blank] or ___
        processedSentence = normalizeBlankSentence(raw);
        targetAnswer = '';
      } else {
        // Plain sentence without bold or underline or blanks:
        // Pick a key vocabulary word as the blank
        const words = raw.split(/\s+/);
        const stopWords = new Set([
          'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
          'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'as', 'into',
          'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down',
          'and', 'or', 'but', 'if', 'because', 'so', 'than', 'too', 'very', 'can', 'will',
          'mr', 'mrs', 'ms', 'dr', 'it', 'its', 'he', 'his', 'she', 'her', 'they', 'their',
          'we', 'our', 'you', 'your', 'i', 'my'
        ]);

        let targetIndex = -1;
        for (let wIdx = words.length - 1; wIdx >= 0; wIdx--) {
          const clean = words[wIdx].replace(/[^a-zA-Z]/g, '').toLowerCase();
          if (clean.length >= 4 && !stopWords.has(clean)) {
            targetIndex = wIdx;
            break;
          }
        }

        if (targetIndex === -1 && words.length > 2) {
          targetIndex = Math.floor(words.length / 2);
        }

        if (targetIndex >= 0) {
          const wordToken = words[targetIndex];
          const cleanWord = wordToken.replace(/[^a-zA-Z]/g, '');
          targetAnswer = cleanWord;
          const newWords = [...words];
          newWords[targetIndex] = wordToken.replace(cleanWord, BLANK_PLACEHOLDER);
          processedSentence = newWords.join(' ');
        } else {
          processedSentence = raw + ' ' + BLANK_PLACEHOLDER;
        }
      }
    }

    // Normalize any remaining blank tokens in the sentence
    processedSentence = normalizeBlankSentence(processedSentence);

    // Clean up any double spaces
    processedSentence = processedSentence.replace(/\s{2,}/g, ' ').trim();

    parsedQuestions.push({
      id: `q_parsed_${idx + 1}_${Date.now()}`,
      sentence: processedSentence,
      blanks: [
        {
          id: `b_${idx + 1}`,
          correctAnswer: targetAnswer
        }
      ],
      options: [],
      explanation: targetAnswer
        ? `Đáp án đúng là "${targetAnswer}".`
        : 'Điền từ thích hợp vào chỗ trống.',
      timeLimit: 0
    });
  });

  return parsedQuestions;
}
