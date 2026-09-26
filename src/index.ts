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

// Подготовка бота
import { Bot, Keyboard, Context } from '@maxhub/max-bot-api';
import {
  getHero,
  registerUser,
  saveHero,
  type HairColor,
  type Hero,
  type HeroGender,
  type SkinTone,
} from './database.js';

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('Token not provided');
}
const bot = new Bot(token);

// Клавиатуры
const startKeyboard = Keyboard.inlineKeyboard([[Keyboard.button.callback('Поехали!', 'newHero')]]);

const mainKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Истории', 'choiseHistory'),
    Keyboard.button.callback('Советчик', 'helpAI'),
  ],
]);

const pol = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Мужчина', 'menHero'),
    Keyboard.button.callback('Женщина', 'womenHero'),
  ],
]);

const menHair = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлые', 'menLight'),
    Keyboard.button.callback('Темные', 'menDark'),
    Keyboard.button.callback('Рыжие', 'menRed'),
  ],
]);

const womenHair = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлые', 'womenLight'),
    Keyboard.button.callback('Темные', 'womenDark'),
    Keyboard.button.callback('Рыжие', 'womenRed'),
  ],
]);

const menLightColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'menLightVeryLight'),
    Keyboard.button.callback('Смуглая', 'menLightLight'),
    Keyboard.button.callback('Темная', 'menLightDark'),
  ],
]);

const menDarkColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'menDarkVeryLight'),
    Keyboard.button.callback('Смуглая', 'menDarkLight'),
    Keyboard.button.callback('Темная', 'menDarkDark'),
  ],
]);

const menRedColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'menRedVeryLight'),
    Keyboard.button.callback('Смуглая', 'menRedLight'),
    Keyboard.button.callback('Темная', 'menRedDark'),
  ],
]);

const womenLightColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'womenLightVeryLight'),
    Keyboard.button.callback('Смуглая', 'womenLightLight'),
    Keyboard.button.callback('Темная', 'womenLightDark'),
  ],
]);

const womenDarkColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'womenDarkVeryLight'),
    Keyboard.button.callback('Смуглая', 'womenDarkLight'),
    Keyboard.button.callback('Темная', 'womenDarkDark'),
  ],
]);

const womenRedColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'womenRedVeryLight'),
    Keyboard.button.callback('Смуглая', 'womenRedLight'),
    Keyboard.button.callback('Темная', 'womenRedDark'),
  ],
]);

function userIdFromContext(ctx: Context): number {
  const user = ctx.user;
  if (!user) {
    throw new Error('MAX не передал данные пользователя');
  }

  return user.user_id;
}

async function replyWithMainKeyboard(ctx: Context, text: string): Promise<void> {
  const hero = getHero(userIdFromContext(ctx));

  if (!hero?.imagePath) {
    await ctx.reply(text, { attachments: [mainKeyboard] });
    return;
  }

  const image = await ctx.api.uploadImage({ source: hero.imagePath });
  await ctx.reply(text, { attachments: [mainKeyboard, image.toJson()] });
}

async function finishHero(
  ctx: Context,
  gender: HeroGender,
  hairColor: HairColor,
  skinTone: SkinTone,
  imagePath: string
): Promise<void> {
  const hero: Hero = { gender, hairColor, skinTone, imagePath };
  saveHero(userIdFromContext(ctx), hero);

  await replyWithMainKeyboard(
    ctx,
    `Вау, получился отличный герой!

Теперь ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.

Итак, чем ты хочешь заняться?`
  );
}

// Старт бота + создание персонажа
bot.on('bot_started', async (ctx) => {
  registerUser(userIdFromContext(ctx));
  await ctx.reply(
    `Привет!
        
Скоро ты попадёшь в истории, где ты — главный герой. Каждая история поможет понять, какая профессия тебе подходит.
        
Но для начала нам нужно создать твоего персонажа!
`,
    { attachments: [startKeyboard] }
  );
});

bot.action('newHero', async (ctx) => {
  const imageMen = await ctx.api.uploadImage({ source: './image/113.png' });
  const imageWomen = await ctx.api.uploadImage({ source: './image/213.png' });
  await ctx.reply('Выбери пол своего персонажа', {
    attachments: [pol, imageMen.toJson(), imageWomen.toJson()],
  });
});

bot.action('menHero', async (ctx) => {
  const imageBlack = await ctx.api.uploadImage({ source: './image/113.png' });
  const imageWhite = await ctx.api.uploadImage({ source: './image/112.png' });
  const imageRed = await ctx.api.uploadImage({ source: './image/111.png' });

  await ctx.reply('Теперь выберем цвет волос', {
    attachments: [menHair, imageWhite.toJson(), imageBlack.toJson(), imageRed.toJson()],
  });
});

bot.action('womenHero', async (ctx) => {
  const imageBlack = await ctx.api.uploadImage({ source: './image/213.png' });
  const imageWhite = await ctx.api.uploadImage({ source: './image/212.png' });
  const imageRed = await ctx.api.uploadImage({ source: './image/211.png' });
  ctx.reply('Теперь выберем цвет волос', {
    attachments: [womenHair, imageWhite.toJson(), imageBlack.toJson(), imageRed.toJson()],
  });
});

bot.action('menLight', async (ctx) => {
  const imageVeryLight = await ctx.api.uploadImage({ source: './image/112.png' });
  const imageLight = await ctx.api.uploadImage({ source: './image/122.png' });
  const imageDark = await ctx.api.uploadImage({ source: './image/132.png' });
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [menLightColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('menDark', async (ctx) => {
  const imageVeryLight = await ctx.api.uploadImage({ source: './image/113.png' });
  const imageLight = await ctx.api.uploadImage({ source: './image/123.png' });
  const imageDark = await ctx.api.uploadImage({ source: './image/133.png' });
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [menDarkColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('menRed', async (ctx) => {
  const imageVeryLight = await ctx.api.uploadImage({ source: './image/111.png' });
  const imageLight = await ctx.api.uploadImage({ source: './image/121.png' });
  const imageDark = await ctx.api.uploadImage({ source: './image/131.png' });
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [menRedColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('womenLight', async (ctx) => {
  const imageVeryLight = await ctx.api.uploadImage({ source: './image/212.png' });
  const imageLight = await ctx.api.uploadImage({ source: './image/222.png' });
  const imageDark = await ctx.api.uploadImage({ source: './image/232.png' });
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [
      womenLightColor,
      imageVeryLight.toJson(),
      imageLight.toJson(),
      imageDark.toJson(),
    ],
  });
});

bot.action('womenDark', async (ctx) => {
  const imageVeryLight = await ctx.api.uploadImage({ source: './image/213.png' });
  const imageLight = await ctx.api.uploadImage({ source: './image/223.png' });
  const imageDark = await ctx.api.uploadImage({ source: './image/233.png' });
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [womenDarkColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('womenRed', async (ctx) => {
  const imageVeryLight = await ctx.api.uploadImage({ source: './image/211.png' });
  const imageLight = await ctx.api.uploadImage({ source: './image/221.png' });
  const imageDark = await ctx.api.uploadImage({ source: './image/231.png' });
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [womenRedColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('menLightVeryLight', (ctx) => finishHero(ctx, 'male', 'light', 'veryLight', './image/112.png'));
bot.action('menLightLight', (ctx) => finishHero(ctx, 'male', 'light', 'light', './image/122.png'));
bot.action('menLightDark', (ctx) => finishHero(ctx, 'male', 'light', 'dark', './image/132.png'));
bot.action('menDarkVeryLight', (ctx) => finishHero(ctx, 'male', 'dark', 'veryLight', './image/113.png'));
bot.action('menDarkLight', (ctx) => finishHero(ctx, 'male', 'dark', 'light', './image/123.png'));
bot.action('menDarkDark', (ctx) => finishHero(ctx, 'male', 'dark', 'dark', './image/133.png'));
bot.action('menRedVeryLight', (ctx) => finishHero(ctx, 'male', 'red', 'veryLight', './image/111.png'));
bot.action('menRedLight', (ctx) => finishHero(ctx, 'male', 'red', 'light', './image/121.png'));
bot.action('menRedDark', (ctx) => finishHero(ctx, 'male', 'red', 'dark', './image/131.png'));
bot.action('womenLightVeryLight', (ctx) => finishHero(ctx, 'female', 'light', 'veryLight', './image/212.png'));
bot.action('womenLightLight', (ctx) => finishHero(ctx, 'female', 'light', 'light', './image/222.png'));
bot.action('womenLightDark', (ctx) => finishHero(ctx, 'female', 'light', 'dark', './image/232.png'));
bot.action('womenDarkVeryLight', (ctx) => finishHero(ctx, 'female', 'dark', 'veryLight', './image/213.png'));
bot.action('womenDarkLight', (ctx) => finishHero(ctx, 'female', 'dark', 'light', './image/223.png'));
bot.action('womenDarkDark', (ctx) => finishHero(ctx, 'female', 'dark', 'dark', './image/233.png'));
bot.action('womenRedVeryLight', (ctx) => finishHero(ctx, 'female', 'red', 'veryLight', './image/211.png'));
bot.action('womenRedLight', (ctx) => finishHero(ctx, 'female', 'red', 'light', './image/221.png'));
bot.action('womenRedDark', (ctx) => finishHero(ctx, 'female', 'red', 'dark', './image/231.png'));

// Меню бота
bot.action('menu', async (ctx) => {
  await replyWithMainKeyboard(
    ctx,
    `Сейчас ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
Итак, чем ты хочешь заняться?
        `
  );
});

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
  usersInQuestionScene.add(ctx.chatId!);
  await ctx.reply('Здесь ты можешь задать свой вопрос, и мы тебе на него ответим!');
});

bot.on('message_created', async (ctx: Context) => {
  if (!usersInQuestionScene.has(ctx.chatId!)) {
    return;
  }

  const question = ctx.message?.body?.text;

  if (!question) {
    await ctx.reply('Пришли свой вопрос текстом.');
    return;
  }

  let waitMessage: any = null;

  try {
    waitMessage = await ctx.reply('Нужно немного подождать...');
    const answer = await askAi(question, questionRequirements);

    if (waitMessage?.body?.mid) {
      await ctx.deleteMessage(String(waitMessage.body.mid));
    }

    await ctx.reply(answer);
    usersInQuestionScene.delete(ctx.chatId!);

    await replyWithMainKeyboard(ctx, 'Продолжим? Выбирай раздел и действуй!');
  } catch (error) {
    console.error(error);
    if (waitMessage?.body?.mid) {
      await ctx.deleteMessage(String(waitMessage.body.mid)).catch(() => {});
    }

    usersInQuestionScene.delete(ctx.chatId!);

    await replyWithMainKeyboard(ctx, 'Мы задумались и допустили ошибку. Нажми "Советчик" ещё раз!');
  }
});

// Старт бота
bot.start();
