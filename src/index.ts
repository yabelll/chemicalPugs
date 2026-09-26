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

const choiseHistoryKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('1', 'history1'),
    Keyboard.button.callback('2', 'history2'),
  ],
]);

function userIdFromContext(ctx: Context): number {
  const user = ctx.user;
  if (!user) {
    throw new Error('MAX не передал данные пользователя');
  }

  return user.user_id;
}

const uploadedHeroImages = new Map<string, ReturnType<Context['api']['uploadImage']>>();

async function getUploadedHeroImage(ctx: Context, imagePath: string) {
  let upload = uploadedHeroImages.get(imagePath);

  if (!upload) {
    upload = ctx.api.uploadImage({ source: imagePath });
    uploadedHeroImages.set(imagePath, upload);
  }

  try {
    return await upload;
  } catch (error) {
    uploadedHeroImages.delete(imagePath);
    throw error;
  }
}

async function replyWithMainKeyboard(ctx: Context, text: string): Promise<void> {
  const hero = getHero(userIdFromContext(ctx));

  if (!hero?.imagePath) {
    await ctx.reply(text, { attachments: [mainKeyboard] });
    return;
  }

  const image = await getUploadedHeroImage(ctx, hero.imagePath);
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
  await ctx.reply('Теперь выберем цвет волос', {
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

bot.action('menLightVeryLight', (ctx) =>
  finishHero(ctx, 'male', 'light', 'veryLight', './image/112.png')
);
bot.action('menLightLight', (ctx) => finishHero(ctx, 'male', 'light', 'light', './image/122.png'));
bot.action('menLightDark', (ctx) => finishHero(ctx, 'male', 'light', 'dark', './image/132.png'));
bot.action('menDarkVeryLight', (ctx) =>
  finishHero(ctx, 'male', 'dark', 'veryLight', './image/113.png')
);
bot.action('menDarkLight', (ctx) => finishHero(ctx, 'male', 'dark', 'light', './image/123.png'));
bot.action('menDarkDark', (ctx) => finishHero(ctx, 'male', 'dark', 'dark', './image/133.png'));
bot.action('menRedVeryLight', (ctx) =>
  finishHero(ctx, 'male', 'red', 'veryLight', './image/111.png')
);
bot.action('menRedLight', (ctx) => finishHero(ctx, 'male', 'red', 'light', './image/121.png'));
bot.action('menRedDark', (ctx) => finishHero(ctx, 'male', 'red', 'dark', './image/131.png'));
bot.action('womenLightVeryLight', (ctx) =>
  finishHero(ctx, 'female', 'light', 'veryLight', './image/212.png')
);
bot.action('womenLightLight', (ctx) =>
  finishHero(ctx, 'female', 'light', 'light', './image/222.png')
);
bot.action('womenLightDark', (ctx) =>
  finishHero(ctx, 'female', 'light', 'dark', './image/232.png')
);
bot.action('womenDarkVeryLight', (ctx) =>
  finishHero(ctx, 'female', 'dark', 'veryLight', './image/213.png')
);
bot.action('womenDarkLight', (ctx) =>
  finishHero(ctx, 'female', 'dark', 'light', './image/223.png')
);
bot.action('womenDarkDark', (ctx) => finishHero(ctx, 'female', 'dark', 'dark', './image/233.png'));
bot.action('womenRedVeryLight', (ctx) =>
  finishHero(ctx, 'female', 'red', 'veryLight', './image/211.png')
);
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

// Истории
bot.action('choiseHistory', async (ctx) => {
  await ctx.reply(
    `Выбери историю, в которую хочешь погрузиться:

1. Тайна чёрного города - детективная история, в которой тебя ждут расследования, безопасность, права и аналитика
2. Код жизни - история, в которой ты познакомишься с медициной, здоровьем и спасением людей`,
    { attachments: [choiseHistoryKeyboard] }
  );
});

// История 1

const chapter1Answers = new Map<number, string>();

function addChapter1Answer(ctx: Context, answer: 'A' | 'B' | 'C'): string {
  const userId = userIdFromContext(ctx);
  const previousAnswers = chapter1Answers.get(userId) ?? '';
  const result = `${previousAnswers}${answer}`;

  chapter1Answers.set(userId, result);
  return result;
}

const history1Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Узнать, что будет дальше!', 'history1_1')],
]);

bot.action('history1', async (ctx) => {
  chapter1Answers.delete(userIdFromContext(ctx));
  await ctx.reply(
    `Поезд замедляет ход. За окном — мрачный город, окутанный туманом. Фонари едва пробивают сырую мглу. Ты смотришь на конверт в своей руке: «Черный Город. Пропало семеро. Полиция бессильна. Помоги». Подпись — твой старый наставник, который исчез три недели назад.

Ты выходишь на перрон. Ни души. Только старик-носильщик смотрит на тебя с тревогой.

Носильщик: «Вы бы уехали отсюда, пока целы. Здесь люди исчезают по ночам. А те, кто ищет правду... исчезают навсегда».

Ты показываешь ему фотографию наставника.

Носильщик (шепотом): «Он был в отеле "Гарпия". Но не советую туда соваться. Хозяин — странный тип. И да... не пейте там кофе».
`,
    { attachments: [history1Keyboard] }
  );
});

const history1_1Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Взять ключ', 'hisrory1_2')],
]);

bot.action('history1_1', async (ctx) => {
  await ctx.reply(
    `Глава 1: Отель «Гарпия»

Ты входишь в отель. В воздухе висит запах дешевого табака и сырости. За стойкой — худой мужчина с бегающими глазами. Это хозяин, мистер Грей. На стене — портрет женщины с холодным и надменным взглядом. Странно, но ее глаза будто следят за тобой.

Ты представляешься детективом. Грей нервно сглатывает.

Грей: «Комната вашего наставника? Она... опечатана. Полиция не нашла ничего. Но я... я не уверен, что они искали».

Он протягивает тебе ключ. Номер 13.

`,
    { attachments: [history1_1Keyboard] }
  );
});

const history1_2Keyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('А', 'history1_3A'),
    Keyboard.button.callback('Б', 'history1_3B'),
    Keyboard.button.callback('В', 'history1_3C'),
  ],
]);

bot.action('hisrory1_2', async (ctx) => {
  await ctx.reply(
    `Комната 13. Пыль, перевернутый стул, разбитая лампа, разбросанные бумаги на полу. Ты включаешь фонарик и начинаешь осмотр.

Система: На что ты обратишь внимание в первую очередь?

Выбор:
А) Следы взлома на окне. Замок поцарапан изнутри, а не снаружи. Кто-то вылезал, а не влезал.
Б) Поведение свидетеля. Ты замечаешь, что Грей стоит в дверях и нервно теребит край пиджака. Он явно что-то скрывает.
В) Финансовые документы на столе. Среди бумаг — счета за аренду складов в порту. Суммы огромные, но склады пустуют.

`,
    { attachments: [history1_2Keyboard] }
  );
});

const history1_3AKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_3A_1')],
]);
const history1_3BKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_3B_1')],
]);
const history1_3CKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_3C_1')],
]);

bot.action('history1_3A', async (ctx) => {
  addChapter1Answer(ctx, 'A');
  await ctx.reply(
    `Ты подходишь к окну. Замок поцарапан изнутри, а не снаружи, значит кто-то пытался вылезти, а не влезть. На подоконнике едва заметные следы обуви большого размера — скорее всего мужские. 
    
Ты достаешь лупу и замечаешь частицы красной глины. Такой глины в городе нет — только в порту, где разгружают корабли.
`,
    { attachments: [history1_3AKeyboard] }
  );
});

bot.action('history1_3B', async (ctx) => {
  addChapter1Answer(ctx, 'B');
  await ctx.reply(
    `Ты оборачиваешься к Грею. Он всё ещё стоит в дверях — худой силуэт в проёме, пальцы нервно теребят край пиджака. Его взгляд бегает по комнате, но упорно избегает твоего.

Игрок: «Мистер Грей. Вы знали моего наставника. Он жил здесь три недели. Вы видели, как он уходил?»

Грей: «Я ничего не видел. Я просто... я просто хозяин отеля. Люди приезжают, уезжают. Я не слежу за ними».

Игрок: «Вы нервничаете, мистер Грей. Но боитесь вы не меня. Вы боитесь того, что я могу найти».

Грей: «Вы не понимаете. Здесь... здесь нельзя задавать вопросы. Нельзя искать. Те, кто ищет — исчезают. Как он. Как все они».

Игрок: «Кто заставляет людей исчезать?»

Грей бледнеет. Его руки дрожат.

Грей: «Я... я не могу. Он убьет меня!».

`,
    { attachments: [history1_3BKeyboard] }
  );
});

bot.action('history1_3C', async (ctx) => {
  addChapter1Answer(ctx, 'C');
  await ctx.reply(
    `Среди бумаг — счета за аренду складов в порту. Суммы огромные, но склады пустуют. Ты находишь договор аренды склада №5. Арендатор — компания «Гарпия Логистик». Подпись — мистер Грей. И еще одна подпись — твоего наставника.`,
    { attachments: [history1_3CKeyboard] }
  );
});

const history1_4Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_4')],
]);

bot.action('history1_3A_1', async (ctx) => {
  await ctx.reply(
    `Ты понимаешь, что наставник не был похищен. Он сбежал через окно. И направился в порт. Ты находишь на полу под кроватью старый билет на грузовой корабль «Медуза». 
    
Рейс отменен три недели назад — в день исчезновения наставника.`,
    { attachments: [history1_4Keyboard] }
  );
});

bot.action('history1_3B_1', async (ctx) => {
  await ctx.reply(
    `Ты делаешь шаг к нему. Он отшатывается и выбегает из комнаты. Ты бросаешься за ним, но в коридоре его уже нет, слышно только эхо шагов внизу. Ты возвращаешься в комнату и замечаешь на столе телефон. На автоответчике — одно сообщение. Голос наставника: «Грей, если ты это слышишь — я нашел их. В порту. Склады 5 и 6. Не ходи за мной. Это ловушка».

Ты получаешь ключевую информацию о месте, но Грей исчез. Теперь ты знаешь, что он не просто свидетель — он соучастник, который боится. Возможно, он еще вернется.
`,
    { attachments: [history1_4Keyboard] }
  );
});

bot.action('history1_3C_1', async (ctx) => {
  await ctx.reply(
    `Ты понимаешь, что наставник скорее всего жив и все еще находится в городе. Более того, он продолжает работать под прикрытием. 
    
Ты находишь на столе записку: «Порт, склад 5. Спросить Мигеля».
`,
    { attachments: [history1_4Keyboard] }
  );
});

const history1_5Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_5')],
]);

bot.action('history1_4', async (ctx) => {
  await ctx.reply(
    `Глава 2: Допрос подозреваемого

Ты приезжаешь в порт. Там, у одного из складов, ты замечаешь человека. Это местный пьяница по кличке Крот, который расхаживает из стороны в сторону и что-то бормочет. 

Ты замечаешь его неопрятный вид: грязную рубашку, подвернутые кое-как штаны, мозолистые руки и грязные ботинки.
`,
    { attachments: [history1_5Keyboard] }
  );
});

const history1_6Keyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('А', 'history1_6A'),
    Keyboard.button.callback('Б', 'history1_6B'),
    Keyboard.button.callback('В', 'history1_6C'),
  ],
]);

bot.action('history1_5', async (ctx) => {
  await ctx.reply(
    `Крот смотрит на тебя мутными глазами и продолжает бормотать.

Крот: «Я ничего не знаю, ничего. Я просто... просто видел свет. Ночью. В порту. Они что-то грузят. Ящики. Просто ящики».

Он замолкает и съеживается.

Система: Как ты будешь его допрашивать?

Выбор:
А) Надавить. Схватить его за грудки и пригрозить тюрьмой. Запугать, чтобы он заговорил.
Б) Предложить сделку. Пообещать, что если он расскажет все, ты вытащишь его из этого города и дашь денег на новую жизнь.
В) Следить тайно. Сделать вид, что уходишь, но оставить диктофон и проследить, с кем он встретится после.
`,
    { attachments: [history1_6Keyboard] }
  );
});

const history1_6AKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_6A_1')],
]);
const history1_6BKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Пообещать', 'history1_6B_1')],
]);
const history1_6CKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_6C_1')],
]);

bot.action('history1_6A', async (ctx) => {
  addChapter1Answer(ctx, 'A');

  await ctx.reply(
    `Ты хватаешь Крота за грудки и прижимаешь к стене.

Игрок: «Слушай сюда. Ты либо говоришь мне все сейчас, либо я звоню в участок и говорю, что ты — главный подозреваемый. Ты сядешь за похищение людей. Пожизненно. А в тюрьме таких, как ты, не любят».

Крот, и так нервничающий, побелел как снег и начал тараторить.

Крот: «Это Грей! Он забирает людей для Дома Гарпии! Ему платят. Я только... я только смотрел. Я не хотел. Они держат их на складе №6. Там холодно и страшно. Я туда не хожу, я ничего не сделал, пожалуйста, поверьте мне!».

`,
    { attachments: [history1_6AKeyboard] }
  );
});

bot.action('history1_6B', async (ctx) => {
  addChapter1Answer(ctx, 'B');
  await ctx.reply(
    `Ты садишься на корточки рядом с Кротом.

Игрок: «Послушай. Я знаю, что ты не злодей. Я знаю, что ты боишься. Но если ты поможешь мне, я помогу тебе. У меня есть связи. Я вытащу тебя из этого города. Дам денег. Ты начнешь новую жизнь. Никто не узнает, что ты был здесь. Обещаю».

Крот смотрит на тебя с недоверием. Потом кивает.

Крот: «Х-хорошо. Я расскажу. Но пообещайте, что со мной ничего не случится». 
`,
    { attachments: [history1_6BKeyboard] }
  );
});

bot.action('history1_6C', async (ctx) => {
  addChapter1Answer(ctx, 'C');
  await ctx.reply(
    `Ты громко демонстративно топаешь, уходя, но не отходишь далеко, а прячешься за углом складского здания. Через десять минут Крот направляется к телефонной будке. Ты слышишь обрывок разговора: «Он здесь. Детектив. Да, тот самый. Что делать?»

Ты понимаешь: Крот — не похититель, а информатор. И он работает на того, кто похищает людей.
`,
    { attachments: [history1_6CKeyboard] }
  );
});

const history1_7Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_7')],
]);

bot.action('history1_6A_1', async (ctx) => {
  await ctx.reply(
    `Ты получаешь точное место — склад №6. Крот напуган и больше не будет с тобой сотрудничать. Ты узнаешь, что Грей — не просто соучастник, а поставщик живого товара. Теперь у тебя есть имя и адрес. Ты знаешь, что делать.
`,
    { attachments: [history1_7Keyboard] }
  );
});

bot.action('history1_6B_1', async (ctx) => {
  await ctx.reply(
    `Ты обещаешь, и Крот продолжает подрагивающим голосом: «Склады 5 и 6. Грей работает там. Но он не главный. Главарь у них женщина, жуткая она. Ее зовут Мадам Гарпия. Она живет в отеле на последнем этаже. Комната 21. Она... она не человек. Она монстр».

Ты получаешь не только место, но и имя главного злодея — Мадам Гарпия. Крот становится твоим информатором. Он соглашается помочь тебе проникнуть в отель. Ты получаешь союзника, но теперь ты в долгу перед ним.
`,
    { attachments: [history1_7Keyboard] }
  );
});

bot.action('history1_6C_1', async (ctx) => {
  await ctx.reply(
    `Ты следуешь за ним. Он идет в порт к складу №5. Там его встречает человек в плаще. Они о чем-то говорят. Ты не слышишь слов, но видишь, как человек в плаще передает Кроту конверт. Крот кивает и уходит. Ты остаешься у склада, надеясь выяснить что-то еще, но человек в плаще тоже уходит да так быстро, что проследить за ним незаметно не получится.

Ты не раскрываешь себя, но получаешь точное место — склад №5. Ты знаешь, что Крот двойной агент. Ты можешь использовать его в будущем. Ты не знаешь, кто человек в плаще, но сохраняешь собственное инкогнито.
`,
    { attachments: [history1_7Keyboard] }
  );
});

const history1_8Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_8')],
]);

bot.action('history1_7', async (ctx) => {
  await ctx.reply(
    `Глава 3: Погоня

Час спустя. Ночь. Порт. Ты видишь, как из склада выходят двое в темных плащах. Они несут большой ящик. Из ящика доносится глухой стук  — ритмичный, отчаянный. Кто-то стучит изнутри! 
    
Ты достаешь пистолет и кричишь: «Стоять! Полиция!»
`,
    { attachments: [history1_8Keyboard] }
  );
});

const history1_9Keyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('А', 'history1_9A'),
    Keyboard.button.callback('Б', 'history1_9B'),
    Keyboard.button.callback('В', 'history1_9C'),
  ],
]);

bot.action('history1_8', async (ctx) => {
  await ctx.reply(
    `Они бросают ящик и бегут в разные стороны. Один бежит к лодкам — туда, где у причала покачивается моторный катер. Второй — в лабиринт контейнеров, надеясь раствориться в темноте. У тебя есть секунда на решение.
Система: Твои действия?

Выбор:
А) Бежать за преступником. Ты бросаешься в погоню за тем, кто побежал к контейнерам. Ты быстрее, ты сможешь его догнать. 
Б) Вызвать подкрепление. Ты хватаешь рацию и вызываешь полицию, чтобы они перекрыли порт. Но пока они едут, преступники могут скрыться.
В) Ты не бежишь ни за кем. Ты быстро оцениваешь обстановку и понимаешь, что самое важное — ящик с живым человеком.

`,
    { attachments: [history1_9Keyboard] }
  );
});

const history1_9AKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_9A_1')],
]);
const history1_9BKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Пообещать', 'history1_9B_1')],
]);
const history1_9CKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_9C_1')],
]);

bot.action('history1_9A', async (ctx) => {
  addChapter1Answer(ctx, 'A');

  await ctx.reply(
    `Ты бросаешься в погоню за тем, кто побежал к контейнерам. Ты быстрее, ты сможешь его догнать. Ты перепрыгиваешь через ящики, успеваешь вписываться в повороты. Преступник спотыкается. Ты настигаешь его и сбиваешь с ног. Это молодой парень. Он смотрит на тебя с ужасом.

Парень: «Пожалуйста, не убивайте! Я просто выполнял приказ! Мадам Гарпия сказала, если я не буду помогать, она убьет мою сестру!»
`,
    { attachments: [history1_9AKeyboard] }
  );
});

bot.action('history1_9B', async (ctx) => {
  addChapter1Answer(ctx, 'B');

  await ctx.reply(
    `Ты хватаешь рацию и вызываешь полицию. «Всем постам! Порт! Склад №5! Задержать подозреваемых!» Но пока они едут, преступники могут скрыться. 

Ты слышишь сирены. Они приближаются. Но в это время второй преступник успевает добежать до лодки и завести мотор. Он уплывает в туман. Первый преступник задержан полицией, но второй свидетель уплыл.
`,
    { attachments: [history1_9BKeyboard] }
  );
});

bot.action('history1_9C', async (ctx) => {
  addChapter1Answer(ctx, 'C');

  await ctx.reply(
    `Ты не бежишь ни за кем, вместо этого подбегаешь к ящику и открываешь его. Внутри оказалась девушка, напуганная, но живая. Ее руки связаны, на правом запястье — браслет с каким-то номером.
`,
    { attachments: [history1_9CKeyboard] }
  );
});

const history1_10Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history1_10')],
]);

bot.action('history1_9A_1', async (ctx) => {
  await ctx.reply(
    `Ты получаешь живого свидетеля, который готов сотрудничать. Он рассказывает, что Мадам Гарпия держит людей в подвале отеля. Он соглашается свидетельствовать в суде. Ты знаешь, что делать дальше и звонишь в полицию.
`,
    { attachments: [history1_10Keyboard] }
  );
});

bot.action('history1_9B_1', async (ctx) => {
  await ctx.reply(
    `Полиция благодарит тебя, но ты понимаешь, что упустил важную нить. Второй преступник, скорее всего, вернется к Мадам Гарпии и предупредит ее. Теперь она узнает, что ее схема с портом раскрыта. Ты теряешь преимущество неожиданности, но полиция знает о происходящем в отеле и уже готовит рейд.
`,
    { attachments: [history1_10Keyboard] }
  );
});

bot.action('history1_9C_1', async (ctx) => {
  await ctx.reply(
    `Ты спасаешь живую жертву — девушку по имени Лили. Она рассказывает, что Мадам Гарпия похищает людей для продажи в другие страны. Лили — не первая. Она знает имена других жертв и соглашается помочь тебе. Теперь у тебя есть не только свидетель, но и пострадавшая, которая может опознать Мадам Гарпию. 
`,
    { attachments: [history1_10Keyboard] }
  );
});

const history1_11Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Завершить историю', 'finishHistory1')],
]);

bot.action('history1_10', async (ctx) => {
  await ctx.reply(
    `Эпилог

Утро. Туман над Черным Городом медленно поднимается, обнажая серые крыши и мокрые улицы. Ты стоишь на пирсе. Вода отражает небо — тяжёлое, свинцовое, но где-то на горизонте уже пробивается тонкая полоса света.

Полиция арестовала преступников. Отель «Гарпия» оцеплен. Подвал вскрыт — там нашли ещё шестерых. Всех живыми. Мадам Гарпия исчезла — но её портрет в отеле всё ещё смотрит со стены, и глаза на нём, кажется, следят за каждым, кто входит. Мистер Грей пропал. Его ищут. Но ты знаешь: он не мог уйти далеко. Такие, как он, всегда возвращаются — за деньгами или замести следы.

Где-то вдалеке, в тумане, слышен гудок поезда. Но ты не уезжаешь. Пока — не уезжаешь. Дело еще не закрыто.

`,
    { attachments: [history1_11Keyboard] }
  );
});

const finishHistory1Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'finishHistory')],
]);

bot.action('finishHistory1', async (ctx) => {
  const userId = userIdFromContext(ctx);
  const result = chapter1Answers.get(userId);
  chapter1Answers.delete(userIdFromContext(ctx));

  if (!result || result.length !== 3) {
    await ctx.reply('Не удалось определить ответы главы. Начни историю заново.');
    return;
  }

  if (result === 'AAA') {
    await ctx.reply(`Твой тип личности - Операвник.

Тебе подходят эти профессии: Полицейский, Следователь, Спасатель, Военный.

Ты — человек действия. Пока другие размышляют, ты уже там, где нужно. Ты не боишься грязи, риска и правды, какой бы она ни была. Твой ум работает быстро, а руки — ещё быстрее. Ты не просто ищешь справедливость — ты её добываешь. В мире, где все предпочитают отводить взгляд, ты смотришь прямо. И это делает тебя опасным для тех, кто прячется в тени.
`, { attachments: [finishHistory1Keyboard] });
   } else if (result === 'ABC') {
    await ctx.reply(`Твой тип личности - Криминалист-аналатик.

Тебе подходят эти профессии: Криминалист, Эксперт-баллистик, Аналитик службы безопасности.

Ты — тот, кто видит то, что другие пропускают. Пыль на подоконнике, дрожь в голосе, несоответствие в документе — для тебя это не мелочи, а ключи. Ты умеешь соединять разрозненные фрагменты в единую картину. Твой ум — это лаборатория, где хаос превращается в систему. Там, где другие видят случайность, ты видишь закономерность. И это твоё главное оружие.
`, { attachments: [finishHistory1Keyboard] });
   } else if (result === 'AAC') {
    await ctx.reply(`Твой тип личности - Операвник.

Тебе подходят эти профессии: Полицейский, Следователь, Спасатель, Военный
`, { attachments: [finishHistory1Keyboard] });
   } else if (result === 'BCC') {
    await ctx.reply(`Твой тип личности - Психолог-стратег.

Тебе подходят эти профессии: Криминальный психолог, HR-директор, Медиатор.

Ты — тот, кто понимает людей. Не то, что они говорят, а то, что они скрывают. Ты умеешь слушать тишину между словами и видеть страх за маской уверенности. Ты не давишь — ты ведёшь. Не ломаешь — ты раскрываешь. Твоя сила не в кулаках, а в умении задать правильный вопрос в правильный момент. Там, где другие видят врага, ты видишь человека. И это делает тебя сильнее, чем кажется.
`, { attachments: [finishHistory1Keyboard] });
   } else if (result === 'CAB') {
    await ctx.reply(`Твой тип личности - Финансовый детектив.

Тебе подходят эти профессии: Аудитор, Финансовый аналитик, Следователь по экономическим преступлениям.

Ты — тот, кто читает между строк в цифрах. Там, где другие видят скучные отчёты, ты видишь историю: кто, кому, сколько и зачем. Ты умеешь находить ложь в бухгалтерских книгах и правду в подписях. Твой ум холоден, но это не бесчувственность — это точность. Ты не гонишься за эффектными погонями. Ты идёшь по следу, который оставляют деньги. И этот след почти всегда ведёт к разгадке.
`, { attachments: [finishHistory1Keyboard] });
   } else if (result === 'BBA') {
    await ctx.reply(`Твой тип личности - Переговорщик.

Тебе подходят эти профессии: Юрист, Адвокат, Дипломат, HR-специалист.

Ты — тот, кто умеет говорить с людьми. Не приказывать, не угрожать — а слышать и договариваться. Ты знаешь: самый сильный аргумент — не тот, что громче, а тот, что точнее. Ты умеешь найти выход там, где другие видят тупик. Ты не ломаешь — ты строишь мосты. И даже когда ты молчишь, твоё молчание весит больше, чем чужие слова.`, { attachments: [finishHistory1Keyboard] });
   } else if (result === 'BBB') {
    await ctx.reply(`Твой тип личности - Логист-стратег.

Логист, Специалист по цепочкам поставок, Управляющий рисками.

Ты — тот, кто видит картину целиком. Пока другие смотрят на отдельные детали, ты уже выстроил систему. Ты умеешь планировать на несколько шагов вперёд и находить выход там, где другие видят стену. Твоя сила — в спокойствии. Ты не паникуешь, не суетишься, не действуешь наугад. Ты просчитываешь. И когда всё идёт не по плану, ты просто строишь новый план. Ты — тот, на кого можно положиться, когда рушится всё.
`, { attachments: [finishHistory1Keyboard] });
  } else {
    await ctx.reply(`Профессии полицейского, следователя и детектива тебе не очень подходят.
      
Пройди тест повторно, отвечая честно, или попробуй себя в других историях.`, { attachments: [finishHistory1Keyboard] });
  }

  chapter1Answers.delete(userId);
});

bot.action('finishHistory', async (ctx) => {
  await replyWithMainKeyboard(
    ctx,
    `История завершена! Хочешь узнать больше о конкретной профессии? Переключись в режим «Советчик», и я расскажу тебе о путях обучения и карьерных перспективах в выбранной сфере. 
    
Или можешь дальше погрузиться в мир историй и найти ответы на свои вопросы у Советчика.
            
Итак, чем ты хочешь заняться?`
  );
});

// Старт бота
bot.start();
