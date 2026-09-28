import { Keyboard, type Context } from '@maxhub/max-bot-api';
import { bot, userIdFromContext } from '../bot.js';
import { imagePath } from '../assets.js';
import {
  addChapter2ChoiceForUser,
  clearChapter2ForUser,
  getChapter2AnswersForUser,
  getHero,
  startChapter2ForUser,
} from '../database.js';
import { getUploadedImage } from '../ui.js';
// История 2

function addChapter2Answer(
  ctx: Context,
  expectedStage: string,
  nextStage: string,
  answer: 'A' | 'B' | 'C'
): boolean {
  return addChapter2ChoiceForUser(userIdFromContext(ctx), expectedStage, nextStage, answer);
}

function getHistory2PrologueFilename(hero: ReturnType<typeof getHero>): string | undefined {
  if (!hero?.gender || !hero.hairColor || !hero.skinTone) {
    return undefined;
  }

  const gender = hero.gender === 'female' ? '3' : '4';
  const skinTone = { veryLight: '1', light: '2', dark: '3' }[hero.skinTone];
  const hairColor = { red: '1', light: '2', dark: '3' }[hero.hairColor];

  return `prolog${gender}${skinTone}${hairColor}.png`;
}

const history2Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Узнать, что будет дальше!', 'history2_1')],
]);

bot.action('history2', async (ctx) => {
  const userId = userIdFromContext(ctx);
  startChapter2ForUser(userId);
  const hero = getHero(userId);
  const prologueFilename = getHistory2PrologueFilename(hero);
  const prologueImage = prologueFilename
    ? await getUploadedImage(ctx, imagePath(prologueFilename))
    : undefined;
  await ctx.reply(
    `**Вечер.** Ты стоишь в приёмном отделении городской больницы. За окном дождь, мрачно и тоскливо, а ты сидишь на своей первой смене. И это первая ночь, когда ты — единственный врач на этаже.

Двери распахиваются. Бригада скорой вкатывает две каталки одновременно. На первой — девушка лет двадцати, спортивная форма, ушиб головы. На второй — пожилой мужчина в деловом костюме, держится за грудь.

Фельдшер скорой смотрит на тебя с тревогой.

**Фельдшер:** Доктор, у нас два тяжёлых больных. У девушки — подозрение на перелом позвоночника, сильное кровотечение. У мужчины — острый инфаркт миокарда, нужна операция. Но у нас свободна только одна реанимационная палата и одна бригада. Кого берёте первым?

Ты смотришь на обоих. **У тебя есть одна минута на решение.** Второй может не дождаться.

    `,
    {
      attachments: prologueImage ? [history2Keyboard, prologueImage.toJson()] : [history2Keyboard],
      format: 'markdown',
    }
  );
});

const history2_1Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Взять историю', 'history2_2')],
]);

bot.action('history2_1', async (ctx) => {
  const image = await getUploadedImage(ctx, imagePath('2.2.png'));
  await ctx.reply(
    `**Глава 1: Выбор**

Ты подходишь к обоим. Девушка в сознании, но бледная. Пульс слабый, но стабильный. Мужчина без сознания, дыхание прерывистое. У него меньше времени.

Медсестра протягивает тебе **историю болезни**. 
`,
    { attachments: [history2_1Keyboard, image.toJson()], format: 'markdown' }
  );
});

const history2_2Keyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('А', 'history2_3A'),
    Keyboard.button.callback('Б', 'history2_3B'),
    Keyboard.button.callback('В', 'history2_3C'),
  ],
]);

bot.action('history2_2', async (ctx) => {
  await ctx.reply(
    ` У девушки — аллергия на анестезию. У мужчины — кардиостимулятор. Оба случая сложные.

Тебе придется выбрать, кого спасать первым.

**Выбор:**
**А)** Спасать девушку. У неё больше шансов выжить, если действовать быстро. Кровотечение можно остановить.
**Б)** Спасать мужчину. У него меньше времени. Если не начать сейчас — он может не дождаться.
**В)** Попросить помощи у коллег. Ты зовёшь второго врача, чтобы разделить бригаду. Но это риск для обоих.


`,
    { attachments: [history2_2Keyboard], format: 'markdown' }
  );
});

const history2_3AKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_3A_1')],
]);
const history2_3BKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_3B_1')],
]);
const history2_3CKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_3C_1')],
]);

bot.action('history2_3A', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice1', 'choice2', 'A')) return;
  await ctx.reply(
    `Ты бросаешься к девушке. Её зовут Лена. Она спортсменка, у неё перелом позвоночника и внутреннее кровотечение. Ты начинаешь операцию. Твои руки работают быстро и точно.

Через час кровотечение остановлено. Состояние Лены стабилизировано. Но ты слышишь, как за стеной монитор мужчины начинает пищать. Ты оборачиваешься. Медсестра смотрит на тебя с тревогой.
`,
    { attachments: [history2_3AKeyboard] }
  );
});

bot.action('history2_3B', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice1', 'choice2', 'B')) return;
  await ctx.reply(
    `Ты бросаешься к мужчине. Его зовут Виктор, у него острый инфаркт миокарда. Ты начинаешь операцию, твои руки работают быстро и четко. Ты вводишь стент, восстанавливаешь кровоток.

Через час Виктор стабилизирован. Но ты слышишь, как за стеной монитор другой пациентки начинает пищать. Ты оборачиваешься. Медсестра смотрит на тебя с тревогой.

`,
    { attachments: [history2_3BKeyboard] }
  );
});

bot.action('history2_3C', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice1', 'choice2', 'C')) return;
  await ctx.reply(
    `Ты зовёшь второго врача — **старого хирурга Петрова.** Он ворчит, но приходит. Вы делитесь на две бригады. Ты берёшь девушку, он — мужчину. Ты работаешь быстро, Петров — ещё быстрее. Через час оба пациента стабилизированы. Ты выходишь в коридор, утирая пот со лба и пытаясь унять легкую дрожь.`,
    { attachments: [history2_3CKeyboard], format: 'markdown' }
  );
});

const history2_4Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_4')],
]);

bot.action('history2_3A_1', async (ctx) => {
  await ctx.reply(
    `**Медсестра:** Доктор, у второго пациента осложнение!

Как раз в этот момент в коридоре слышатся шаги. Это **дежурный врач Петров** — он освободился. Он подходит к мужчине и начинает работать с ним. Ты выдыхаешь с облегчением.

Ты спасаешь Лену, а дежурный врач берёт на себя Виктора. Оба живы. Но ты понимаешь: если бы дежурный врач не пришёл, Виктор мог не дождаться. 
`,
    { attachments: [history2_4Keyboard], format: 'markdown' }
  );
});

bot.action('history2_3B_1', async (ctx) => {
  await ctx.reply(
    `**Медсестра:** Доктор, у неё давление падает! Кровотечение не остановлено!

Ты понимаешь: пока спасали Виктора, Лена потеряла слишком много крови. Но в этот момент в коридоре слышатся шаги. Это **дежурный врач Петров** — он освободился. Он подходит к Лене и начинает работать с ней. Ты выдыхаешь с облегчением.

Ты спасаешь Виктора, а дежурный врач берёт на себя Лену. Оба живы. Но ты понимаешь: если бы дежурный врач не пришёл, Лена могла не дождаться.
`,
    { attachments: [history2_4Keyboard], format: 'markdown' }
  );
});

bot.action('history2_3C_1', async (ctx) => {
  await ctx.reply(
    `**Петров:** Вы рискнули. Могли потерять обоих. Но вы справились. В следующий раз думайте быстрее.

Ты понимаешь: **оба пациента спасены**, но это было на грани.

Ты спасаешь обоих пациентов, но понимаешь, что это было чистое везение. Ты получаешь уважение Петрова, но также понимаешь, что в следующий раз может не повезти.

`,
    { attachments: [history2_4Keyboard], format: 'markdown' }
  );
});

const history2_5Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_5')],
]);

bot.action('history2_4', async (ctx) => {
  const image = await getUploadedImage(ctx, imagePath('2.3.png'));
  await ctx.reply(
    `**Глава 2: Длинная ночь**

Проходит два часа. Дождь по-прежнему стучит по стеклу. Ты допиваешь остывший кофе в ординаторской, когда в дверь стучит медсестра.

**Медсестра:** Доктор, к нам поступила женщина. Сорок два года. Боль в животе, тошнота, слабость. Говорит, что «просто отравилась». Но что-то мне не нравится. И ещё... у неё на руках синяки. Старые. И свежие.
`,
    { attachments: [history2_5Keyboard, image.toJson()], format: 'markdown' }
  );
});

const history2_6Keyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('А', 'history2_6A'),
    Keyboard.button.callback('Б', 'history2_6B'),
    Keyboard.button.callback('В', 'history2_6C'),
  ],
]);

bot.action('history2_5', async (ctx) => {
  await ctx.reply(
    `Ты идёшь в смотровую. Женщина сидит на кушетке, сжимая сумочку. Она избегает твоего взгляда. На вопрос, что случилось, отвечает уклончиво: «Съела что-то не то». Но когда ты просишь её показать живот, она вздрагивает. Ты видишь гематому на животе. Форма — характерная. След от удара.

**Выбор:**
**А)** Настоять на полном обследовании и вызвать полицию. Ты подозреваешь насильственный характер травмы и не можешь просто отпустить её.
**Б)** Сначала — медицинская помощь, потом — разговор. Ты не давишь. Ты обрабатываешь ушибы, делаешь УЗИ, а потом, когда она немного успокоится, пытаешься поговорить.
**В)** Подключить социального работника и психолога. Ты понимаешь, что здесь нужен не только врач, но и специалист по кризисным ситуациям. Ты вызываешь дежурного психолога.

`,
    { attachments: [history2_6Keyboard], format: 'markdown' }
  );
});

const history2_6AKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_6A_1')],
]);
const history2_6BKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_6B_1')],
]);
const history2_6CKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Согласиться', 'history2_6C_1')],
]);

bot.action('history2_6A', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice2', 'choice3', 'A')) return;

  await ctx.reply(
    `Ты понимаешь, что это не отравление, а травма, и спрашиваешь пациентку, кто её ударил. Женщина замирает. Потом начинает плакать. Она всё рассказывает. 
    
Ты вызываешь полицию и социального работника. Пока они едут, ты остаёшься с ней. Она держит тебя за руку.`,
    { attachments: [history2_6AKeyboard] }
  );
});

bot.action('history2_6B', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice2', 'choice3', 'B')) return;
  await ctx.reply(
    `Женщину зовут Ольга. Ты осматриваешь ее, делаешь УЗИ — внутренних повреждений нет. Ты садишься рядом, ничего не спрашивая, но давая понять, что ты рядом и не осудишь. Она молчит, нервно сжимая сумочку. 

Потом, через минуту, тихо говорит: Он не всегда такой. Иногда он хороший.

Она замолкает. Ты не торопишь её. Она рассказывает сама.
`,
    { attachments: [history2_6BKeyboard] }
  );
});

bot.action('history2_6C', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice2', 'choice3', 'C')) return;
  await ctx.reply(
    `Ты вызываешь **дежурного психолога — Марину**. Она приходит через пятнадцать минут. Марина садится рядом с женщиной, выясняет, что ее зовут Ольга, и начинает разговор. Ты выходишь, но остаёшься за дверью. Через полчаса Марина выходит.

**Марина:** Она готова говорить. Но не с полицией. Пока — только со мной. Ей нужно время и безопасное место. У нас есть кризисная палата на третьем этаже. Я оформлю её туда.
`,
    { attachments: [history2_6CKeyboard], format: 'markdown' }
  );
});

const history2_7Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_7')],
]);

bot.action('history2_6A_1', async (ctx) => {
  await ctx.reply(
    `Полиция приезжает через двадцать минут. Женщину зовут Ольга. Она даёт показания. Ольга остаётся в больнице под наблюдением — у неё сотрясение и трещина ребра.

Ты спасаешь Ольгу не только как врач, но и как человек. Она остаётся в больнице. Утром она говорит тебе: «Спасибо. Я думала, что никто не заметит». Ты понимаешь: **иногда врач — это единственный человек**, который видит то, что другие предпочитают не замечать.
`,
    { attachments: [history2_7Keyboard], format: 'markdown' }
  );
});

bot.action('history2_6B_1', async (ctx) => {
  await ctx.reply(
    `Ты не вызываешь полицию — она не готова. Но ты даёшь ей телефон кризисного центра. И говоришь, что она может вернуться в любое время. Ольга кивает и уходит, но через час возвращается, потому что одной звонить страшно.

Ты не форсируешь события. Ольга сама принимает решение. Она остаётся в больнице на несколько дней — под предлогом обследования. Социальный работник помогает ей с жильём. Ты понимаешь: иногда лучшая помощь — просто быть рядом.
`,
    { attachments: [history2_7Keyboard] }
  );
});

bot.action('history2_6C_1', async (ctx) => {
  await ctx.reply(
    `Ты соглашаешься. Ольга остаётся в больнице. Медсестры предупреждены. Утром приезжает социальный работник. Ольга начинает оформлять документы.

Ты не берёшь всё на себя, а подключаешь специалиста. Ольга получает помощь — медицинскую, психологическую, социальную. Ты понимаешь: здоровье пациента важнее, чем профессиональная гордость.
`,
    { attachments: [history2_7Keyboard] }
  );
});

const history2_8Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_8')],
]);

bot.action('history2_7', async (ctx) => {
  const image = await getUploadedImage(ctx, imagePath('2.4.png'));
  await ctx.reply(
    `**Глава 3: Врачебная ошибка**

Шесть утра. Дождь закончился. Ты стоишь в ординаторской, дописываешь карту. В дверь стучит Петров.

**Петров:** Послушайте, я должен кое-что сказать. Когда я недавно принимал пациента, я ввёл ему препарат, не проверив совместимость с кардиостимулятором. Я знал, что у него кардиостимулятор, но не проверил модель. Если бы вы не вмешались, ему могло стать хуже.

**Петров:** Я понимаю, что это моя вина, но я не хочу, чтобы это разрушило мою карьеру. Я прошу вас... не сообщать об этом.
`,
    { attachments: [history2_8Keyboard, image.toJson()], format: 'markdown' }
  );
});

const history2_9Keyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('А', 'history2_9A'),
    Keyboard.button.callback('Б', 'history2_9B'),
    Keyboard.button.callback('В', 'history2_9C'),
  ],
]);

bot.action('history2_8', async (ctx) => {
  await ctx.reply(
    `Ты смотришь на него. Ты знаешь, что он хороший врач, но он допустил ошибку, которая могла стоить жизни пациенту.

**Выбор:**
**А)** Сообщить об ошибке. Ты ставишь правду выше отношений и пишешь докладную. Петрова отстраняют, но ты знаешь, что твой поступок верный. 
**Б)** Скрыть ошибку. Ты понимаешь, что раскрытие правды может разрушить карьеру коллеги. Ты молчишь. Но ты знаешь, что это может повториться.
**В)** Поговорить с Петровым лично. Ты даёшь ему шанс исправиться. Ты предлагаешь ему пройти курсы повышения квалификации. Ты не сообщаешь, но и не молчишь.
`,
    { attachments: [history2_9Keyboard], format: 'markdown' }
  );
});

const history2_9AKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_9A_1')],
]);
const history2_9BKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_9B_1')],
]);
const history2_9CKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_9C_1')],
]);

bot.action('history2_9A', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice3', 'completed', 'A')) return;

  await ctx.reply(
    `Ты пишешь докладную. Петрова отстраняют от операций. Он все понимает, но все равно смотрит на тебя с обидой. `,
    { attachments: [history2_9AKeyboard] }
  );
});

bot.action('history2_9B', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice3', 'completed', 'B')) return;

  await ctx.reply(`Ты никому не говоришь. Петров остаётся и благодарен тебе.`, {
    attachments: [history2_9BKeyboard],
  });
});

bot.action('history2_9C', async (ctx) => {
  if (!addChapter2Answer(ctx, 'choice3', 'completed', 'C')) return;

  await ctx.reply(
    `Ты садишься с Петровым. Ты говоришь ему, что не сообщишь об ошибке, но он должен сделать все, чтобы ее не повторить. Петров смотрит на тебя. В его глазах — благодарность.
`,
    { attachments: [history2_9CKeyboard] }
  );
});

const history2_10Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'history2_10')],
]);

bot.action('history2_9A_1', async (ctx) => {
  await ctx.reply(
    `Ты понимаешь: с точки зрения профессионализма все верно, но карьера твоего друга и наставника под угрозой.

Ты получаешь уважение руководства, но теряешь наставника.
`,
    { attachments: [history2_10Keyboard] }
  );
});

bot.action('history2_9B_1', async (ctx) => {
  await ctx.reply(
    `Ты знаешь, что вы скрыли от начальства и что это может повториться. Но выбор уже сделан.

Ты скрываешь ошибку. Петров остаётся. Ты получаешь его благодарность и осадок на совести.
`,
    { attachments: [history2_10Keyboard] }
  );
});

bot.action('history2_9C_1', async (ctx) => {
  await ctx.reply(
    `**Петров:** Вы правы. Я устал и допустил ошибку. Я исправлюсь.

Ты даёшь Петрову шанс исправиться. Он становится лучше. Ты получаешь его уважение.
`,
    { attachments: [history2_10Keyboard], format: 'markdown' }
  );
});

const history2_11Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Завершить историю', 'finishHistory2')],
]);

bot.action('history2_10', async (ctx) => {
  const image = await getUploadedImage(ctx, imagePath('2.5.png'));
  await ctx.reply(
    `**Семь утра.** Небо над городом — серое, но на горизонте уже брезжит розоватый рассвет.

Ты стоишь у окна в ординаторской. За стеклом — мокрый асфальт, редкие машины, дворник, который медленно убирает опавшие листья. **Город просыпается**, а ты ещё там, в этой ужасно длинной ночи.

Ты смотришь на свои руки. Руки, которые не дрожали. Почти.

Ты думаешь о том, что **медицина — это не только про правильные решения.** Это про решения вообще. Про то, что иногда ты не можешь спасти всех сразу. Про то, что иногда лучший выбор — не выбирать за другого. Про то, что иногда правда важнее отношений, а иногда — отношения важнее правды. И про то, что никто не даст тебе правильного ответа. Его просто нет. Есть только ты. И твой выбор.

За окном светлеет. Дворник заканчивает работу и уходит. Ты дописываешь карту. Ставишь подпись. Смотришь на часы — смена почти закончилась, **ты наконец можешь пойти вздремнуть.**
`,
    { attachments: [history2_11Keyboard, image.toJson()], format: 'markdown' }
  );
});

const finishHistory2Keyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Продолжить', 'finishHistory')],
]);

bot.action('finishHistory2', async (ctx) => {
  const userId = userIdFromContext(ctx);
  const result = getChapter2AnswersForUser(userId);

  if (!result || result.length !== 3) {
    await ctx.reply('Не удалось определить ответы главы. Начни историю заново.');
    return;
  }

  if (result === 'AAA') {
    await ctx.reply(
      `**Твой тип личности - Хирург.**

*Тебе возможно подходят эти профессии: Хирург, Травматолог, Военный врач, Судебно-медицинский эксперт.*

Ты — человек действия. Пока другие взвешивают, ты уже режешь. Ты не боишься крови, боли и правды, какой бы она ни была. Твой ум холоден, а руки — точны. Ты не просто спасаешь — ты решаешь. В мире, где все колеблются, ты берёшь ответственность на себя. И это делает тебя опасным для тех, кто привык прятаться за словами.
`,
      { attachments: [finishHistory2Keyboard], format: 'markdown' }
    );
  } else if (result === 'ABC') {
    await ctx.reply(
      `**Твой тип личности - Реаниматолог.**

*Тебе возможно подходят эти профессии: Реаниматолог, Анестезиолог, Преподаватель медицины, Наставник.*

Ты — тот, кто возвращает с того света. Ты умеешь действовать быстро и учить других не терять голову. Ты не просто спасаешь жизни — ты передаёшь это умение дальше. Твой опыт — не багаж, а инструмент. Ты знаешь: иногда лучший способ помочь — научить кого-то другого. 
`,
      { attachments: [finishHistory2Keyboard], format: 'markdown' }
    );
  } else if (result === 'BCA') {
    await ctx.reply(
      `**Твой тип личности - Диагност-Правовед.**

*Тебе возможно подходят эти профессии: Врач-диагност, Медицинский юрист, Эксперт, Страховой врач.*

Ты — тот, кто видит насквозь. Там, где другие видят симптомы, ты видишь причину. Там, где другие видят ошибку, ты видишь систему. Ты умеешь читать людей и документы с одинаковой точностью. Твой ум — это скальпель, только без крови. Ты не гонишься за эффектом. Ты идёшь по следу, который оставляют факты. И почти всегда находишь то, что искал.
`,
      { attachments: [finishHistory2Keyboard], format: 'markdown' }
    );
  } else if (result === 'CAB') {
    await ctx.reply(
      `**Твой тип личности - Координатор.**

*Тебе возможно подходят эти профессии: Заведующий отделением, Главный врач, Психотерапевт, Медиатор.*

Ты — тот, кто держит всё в руках. Ты не спасаешь в одиночку — ты организуешь спасение. Ты умеешь говорить с людьми, слышать их и направлять туда, где они нужны. Ты не паникуешь, когда рушится план. Ты просто строишь новый. Твоя сила — в спокойствии и умении соединять людей. Ты — тот, на кого можно положиться, когда всё идёт не так. 
`,
      { attachments: [finishHistory2Keyboard], format: 'markdown' }
    );
  } else if (result === 'BBA') {
    await ctx.reply(
      `**Твой тип личности - Терапевт.**

*Тебе возможно подходят эти профессии: Терапевт, Кардиолог, Врач-эксперт, Медицинский юрист.*

Ты — тот, кто не спешит. Ты умеешь ждать, наблюдать и делать выводы. Ты не бросаешься в бой — ты сначала понимаешь, с чем имеешь дело. Твоя сила — в терпении и точности. Ты не ищешь лёгких путей, а ищешь правильные. И когда находишь — не отступаешь.`,
      { attachments: [finishHistory2Keyboard], format: 'markdown' }
    );
  } else if (result === 'CCC') {
    await ctx.reply(
      `**Твой тип личности - Управленец.**

*Тебе подходят эти профессии: Главный врач, Медицинский менеджер, Преподаватель, Методист.*

Ты — тот, кто видит картину целиком. Пока другие смотрят на отдельные детали, ты уже выстроил систему. Ты умеешь планировать на несколько шагов вперёд и находить выход там, где другие видят стену. Твоя сила — в стратегии. Ты не суетишься, не паникуешь, не действуешь наугад. Ты просчитываешь. И когда всё идёт не по плану, ты просто меняешь план.
`,
      { attachments: [finishHistory2Keyboard], format: 'markdown' }
    );
  } else {
    await ctx.reply(
      `Возможно профессии в сфере медицины тебе не очень подходят.
      
Пройди тест повторно, отвечая честно, или попробуй себя в других историях.`,
      { attachments: [finishHistory2Keyboard] }
    );
  }

  clearChapter2ForUser(userId);
});
