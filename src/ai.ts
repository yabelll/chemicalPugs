process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Подготовка AI
const apiKey: string | undefined = process.env.AI_API_KEY;
const baseURL: string | undefined = process.env.AI_BASE_URL;
const model: string = process.env.AI_MODEL || '';
const AI_RETRIES: number = 2;

const client = new OpenAI({ apiKey: apiKey, baseURL, timeout: 60000 });

const defaultRequirements: string =
  'Ты специалист по профориентации. Отвечай кратко, понятно и по делу на русском языке. Тебе категорически запрещено использовать звёздочки (*)';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface RetryableError {
  name?: string;
  code?: string;
  status?: number;
  message?: string;
}

function isRetryableAiError(error: unknown): boolean {
  const err = error as RetryableError;
  return (
    err?.name === 'APIConnectionTimeoutError' ||
    err?.name === 'APIConnectionError' ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'EAI_AGAIN' ||
    err?.status === 408 ||
    err?.status === 409 ||
    err?.status === 429 ||
    (typeof err?.status === 'number' && err.status >= 500)
  );
}

interface CompletionPayload {
  model: string;
  messages: ChatCompletionMessageParam[];
}

async function createCompletionWithRetry(payload: CompletionPayload) {
  for (let attempt = 0; attempt <= AI_RETRIES; attempt += 1) {
    try {
      return await client.chat.completions.create(payload);
    } catch (error) {
      if (!isRetryableAiError(error) || attempt === AI_RETRIES) {
        throw error;
      }

      const err = error as RetryableError;
      console.warn(`Ошибка запроса AI: ${err.name || err.code || err.message}`);
      await delay(1000 * (attempt + 1));
    }
  }

  throw new Error('AI_RETRY_EXHAUSTED');
}

export async function askAi(
  question: string,
  requirements: string = defaultRequirements
): Promise<string> {
  const completion = await createCompletionWithRetry({
    model,
    messages: [
      {
        role: 'system',
        content: requirements,
      },
      {
        role: 'user',
        content: question,
      },
    ],
  });

  const reply = completion?.choices[0]?.message?.content;
  if (!reply) throw new Error('Пустой ответ от модели');

  return reply.trim();
}

export function askAiByRequirements(requirements: string): Promise<string> {
  return askAi('Сгенерируй ответ строго по требованиям.', requirements);
}
