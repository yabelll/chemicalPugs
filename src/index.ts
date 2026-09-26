process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config'

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Подготовка AI
const apiKey: string | undefined = process.env.AI_API_KEY;
const baseURL: string | undefined = process.env.AI_BASE_URL;
const model: string = process.env.AI_MODEL || '';
const AI_RETRIES: number = 2;

const client = new OpenAI({apiKey: apiKey, baseURL, timeout: 60000});

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
      console.warn(
        `Ошибка запроса AI: ${err.name || err.code || err.message}`
      );
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

// Подготовка бота
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('Token not provided');
}
const bot = new Bot(token);

// Клавиатуры
const startKeyboard = Keyboard.inlineKeyboard([[Keyboard.button.callback('Поехали!', 'newHero')]])

const pol = Keyboard.inlineKeyboard([[
        Keyboard.button.callback('Мужчина', 'menHero'),
        Keyboard.button.callback('Женщина', 'womenHero'),
    ]
])

const menHair = Keyboard.inlineKeyboard([[
        Keyboard.button.callback('Светлые', 'menLight'),
        Keyboard.button.callback('Темные', 'menDark'),
    ]
])

const womenHair = Keyboard.inlineKeyboard([[
        Keyboard.button.callback('Светлые', 'womenLight'),
        Keyboard.button.callback('Темные', 'womenDark'),
    ]
])

const menLightColor = Keyboard.inlineKeyboard([[
        Keyboard.button.callback('Светлая', 'menLightLight'),
        Keyboard.button.callback('Темная', 'menLightDark'),
    ]
])

const menDarkColor = Keyboard.inlineKeyboard([[
        Keyboard.button.callback('Светлая', 'menDarkLight'),
        Keyboard.button.callback('Темная', 'menDarkDark'),
    ]
])

const womenLightColor = Keyboard.inlineKeyboard([[
        Keyboard.button.callback('Светлая', 'womenLightLight'),
        Keyboard.button.callback('Темная', 'womenLightDark'),
    ]
])

const womenDarkColor = Keyboard.inlineKeyboard([[
        Keyboard.button.callback('Светлая', 'womenDarkLight'),
        Keyboard.button.callback('Темная', 'womenDarkDark'),
    ]
])

const mainKeyboard = Keyboard.inlineKeyboard([[
        Keyboard.button.callback('Истории', 'choiseHistory'),
        Keyboard.button.callback('Советчик', 'helpAI'),
    ]
])

// Старт бота + создание персонажа
bot.on('bot_started', (ctx) => 
    ctx.reply(`Привет!
        
Скоро ты попадёшь в истории, где ты — главный герой. Каждая история поможет понять, какая профессия тебе подходит.
        
Но для начала нам нужно создать твоего персонажа!
`, { attachments: [startKeyboard] })
);

bot.action('newHero', ctx => {
    ctx.reply('Выбери пол своего персонажа', { attachments: [pol] })
})

bot.action('menHero', ctx => {
    ctx.reply('Теперь выберем цвет волос', { attachments: [menHair]})
})

bot.action('womenHero', ctx => {
    ctx.reply('Теперь выберем цвет волос', { attachments: [womenHair]})
})

bot.action('menLight', ctx => {
    ctx.reply('Осталось выбрать цвет кожи', { attachments: [menLightColor]})
})

bot.action('menDark', ctx => {
    ctx.reply('Осталось выбрать цвет кожи', { attachments: [menDarkColor]})
})

bot.action('womenLight', ctx => {
    ctx.reply('Осталось выбрать цвет кожи', { attachments: [womenLightColor]})
})

bot.action('womenDark', ctx => {
    ctx.reply('Осталось выбрать цвет кожи', { attachments: [womenDarkColor]})
})

bot.action('menLightLight', ctx => {
    ctx.reply(`Вау, получился отличный герой! 
        
Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
Итак, чем ты хочешь заняться?`, { attachments: [mainKeyboard]})
})

bot.action('menLightDark', ctx => {
    ctx.reply(`Вау, получился отличный герой! 
        
        Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
        Итак, чем ты хочешь заняться?`, { attachments: [mainKeyboard]})
})

bot.action('menDarkLight', ctx => {
    ctx.reply(`Вау, получился отличный герой! 
        
        Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
        Итак, чем ты хочешь заняться?`, { attachments: [mainKeyboard]})
})

bot.action('menDarkLight', ctx => {
    ctx.reply(`Вау, получился отличный герой! 
        
        Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
        Итак, чем ты хочешь заняться?`, { attachments: [mainKeyboard]})
})

bot.action('womenLightLight', ctx => {
    ctx.reply(`Вау, получился отличный герой! 
        
        Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
        Итак, чем ты хочешь заняться?`, { attachments: [mainKeyboard]})
})

bot.action('womenLightDark', ctx => {
    ctx.reply(`Вау, получился отличный герой! 
        
        Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
        Итак, чем ты хочешь заняться?`, { attachments: [mainKeyboard]})
})

bot.action('womenDarkLight', ctx => {
    ctx.reply(`Вау, получился отличный герой! 
        
        Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
        Итак, чем ты хочешь заняться?`, { attachments: [mainKeyboard]})
})

bot.action('womenDarkLight', ctx => {
    ctx.reply(`Вау, получился отличный герой! 
        
        Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
        Итак, чем ты хочешь заняться?`, { attachments: [mainKeyboard]})
})

// Меню бота
bot.action('menu', ctx => {
    ctx.reply(`Сейчас ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
        Итак, чем ты хочешь заняться?
        `, { attachments: [mainKeyboard] })
})

// Советчик
const questionRequirements = `
Ты — специалист по профориентации школьников и навигатор карьерных траекторий. Твоя задача — вести подростка по пути «от интереса до первой работы»: помогать выявлять интересы и сильные стороны через живой диалог, подбирать релевантные профессии, стажировки и вакансии, переводить сложные требования и документы на понятный язык, а также сопровождать каждый шаг к цели как квест с понятными этапами.

ЖЁСТКИЕ ОГРАНИЧЕНИЯ (нарушать нельзя):
1. НЕ затрагивай экстремистские, опасные и противоправные темы: категорически запрещены любые материалы, связанные с экстремизмом, терроризмом, разжиганием ненависти по национальному, религиозному, половому или иному признаку, а также инструкции по изготовлению оружия, взрывчатых веществ, наркотиков, советы по взлому систем, мошенничеству, обходу закона. При попытке подобного вопроса — мягко откажи и верни разговор к теме профориентации.
2. НЕ допускай оскорблений, унижений, буллинга, дискриминации. Не поддерживай негативные высказывания о людях, профессиях, национальностях, религиях, внешности, способностях. Если пользователь провоцирует — не отвечай в том же тоне, спокойно переведи тему на конструктив.
3. НЕ давай медицинских, психологических и юридических заключений. Не ставь диагнозы, не оценивай психическое состояние, не давай советов по лечению, не интерпретируй юридические документы как официальный юрист. Максимум — общая рекомендация обратиться к школьному психологу, врачу или профильному специалисту.
4. НЕ гарантируй трудоустройство, поступление, стипендию или конкретный результат. Ты помогаешь и направляешь, но финальное решение всегда за человеком и организацией.
5. Если вопрос или ситуация спорные (неоднозначные, зависят от возраста, региона, конкретной компании, юридических условий, личных обстоятельств) — ты НЕ даёшь окончательного ответа. Вместо этого направляешь к реальному взрослому: родителю, школьному психологу, профориентатору, специалисту центра занятости. Фраза-шаблон: «Это спорная ситуация, я не могу дать однозначный ответ. Обязательно обсуди это со взрослым / школьным психологом / профориентатором. Моя рекомендация — не действовать наугад.»
6. Если пользователь спрашивает о чём-то из запрещённого (пункты 1–5) — мягко откажи и при необходимости перенаправь к специалисту. Не продолжай диалог на запрещённую тему.
7. НЕ навязывай конкретную профессию как «единственно верную». Ты показываешь варианты и помогаешь выбрать, но не решаешь за человека.
8. НЕ ставь звёздочки в сообщении. НЕ задавай ответных вопросов.

Формат ответа:
- Ответ должен быть чётким, понятным, без воды.
- Для действий — по шагам (1. 2. 3.).
- Если вопрос сложный — сначала краткое правило, затем пример.
- Тон — спокойный, дружелюбный, поддерживающий, как у наставника, но без сюсюканья.
- Ответ должен быть кратким — 3–4 предложения.
- ОБЯЗАТЕЛЬНО дели ответы на абзацы, можешь добавлять 1-2 смайлика.
- НЕ ставь звёздочки в сообщении. НЕ задавай ответных вопросов.

Пример ответа на допустимый вопрос:
Вопрос: «Я не знаю, кем хочу быть, мне ничего не интересно.»
Ответ: «Это нормально — многие начинают с этого. Давай попробуем не выбирать профессию сразу, а найти то, что тебя цепляет: что ты делаешь с удовольствием, когда никто не заставляет? Например, собираешь что-то, рисуешь, помогаешь другим, разбираешься в технике, играешь в игры? Расскажи хотя бы об одном таком занятии — и я подскажу, какие профессии могут за этим стоять.»

Пример реакции на спорную ситуацию:
Вопрос: «Мне 14, могу ли я официально устроиться на работу без согласия родителей?»
Ответ: «Это спорная ситуация, потому что правила зависят от возраста, региона и типа работы. Я не могу дать однозначный ответ. Обязательно обсуди это с родителями или школьным психологом. Моя рекомендация — не действовать наугад и сначала уточнить условия у взрослого.»

Пример реакции на запрещённую тему:
Вопрос: «Как взломать сайт, чтобы получить доступ к вакансиям?»
Ответ: «Я не помогаю с такими темами — это противоправно. Давай вернёмся к твоему пути: расскажи, какие профессии тебе интересны, и я помогу найти легальные способы получить опыт и стажировку.»

Теперь жди вопроса от пользователя и отвечай строго по этим правилам.`;

const usersInQuestionScene = new Set<number>();

bot.action('helpAI', async (ctx: Context) => {
  usersInQuestionScene.add(ctx.chatId);
  await ctx.reply('Здесь ты можешь задать свой вопрос, и мы тебе на него ответим!');
});

bot.on('message_created', async (ctx: Context) => {
  if (!usersInQuestionScene.has(ctx.chatId)) {
    return;
  }

  const question = ctx.message?.body?.text;

  if (!question) {
    await ctx.reply('Пришли свой вопрос текстом.');
    return;
  }

  try {
    await ctx.reply('Нужно немного подождать...');
    const answer = await askAi(question, questionRequirements);

    await ctx.reply(answer);
    usersInQuestionScene.delete(ctx.chatId);

    await ctx.reply(
      'Продолжим? Выбирай раздел и действуй!',
      { attachments: [mainKeyboard] }
    );
  } catch (error) {
    console.error(error);

    usersInQuestionScene.delete(ctx.chatId);

    await ctx.reply(
      'Мы задумались и допустили ошибку. Нажми "Советчик" ещё раз!',
      { attachments: [mainKeyboard] }
    );
  }
});


// Старт бота
bot.start();
