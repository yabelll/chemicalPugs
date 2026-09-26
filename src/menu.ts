import { bot } from './bot.js';
import { replyWithMainKeyboard } from './ui.js';

// Меню бота
bot.action('menu', async (ctx) => {
  await replyWithMainKeyboard(
    ctx,
    `Сейчас ты можешь погрузиться в мир историй или найти ответы на свои вопросы у Советчика.
            
Итак, чем ты хочешь заняться?
        `
  );
});
