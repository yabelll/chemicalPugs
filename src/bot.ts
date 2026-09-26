import { Bot, type Context } from '@maxhub/max-bot-api';

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('Token not provided');
}

export const bot = new Bot(token);

export function userIdFromContext(ctx: Context): number {
  const user = ctx.user;
  if (!user) {
    throw new Error('MAX не передал данные пользователя');
  }

  return user.user_id;
}
