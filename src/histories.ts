import { bot } from './bot.js';
import { choiseHistoryKeyboard } from './keyboards.js';
import { replyWithMainKeyboard } from './ui.js';

import './histories/history1.js';
import './histories/history2.js';

bot.action('choiseHistory', async (ctx) => {
  await ctx.reply(
    `
    Выбери историю, в которую хочешь погрузиться:

1. **Тайна чёрного города** – детективная история, в которой тебя ждут расследования, безопасность, права и аналитика.
2. **Код жизни** – история, в которой ты познакомишься с медициной, здоровьем и спасением людей.`,
    { attachments: [choiseHistoryKeyboard], format: 'markdown' }
  );
});

bot.action('finishHistory', async (ctx) => {
  await replyWithMainKeyboard(
    ctx,
    `История завершена! Хочешь узнать больше о конкретной профессии? Переключись в режим «Советчик», и я расскажу тебе о путях обучения и карьерных перспективах в выбранной сфере. 
    
Или можешь дальше погрузиться в мир историй и найти ответы на свои вопросы у Советчика.
            
Итак, чем ты хочешь заняться?`
  );
});
