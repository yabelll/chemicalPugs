import { type Context } from '@maxhub/max-bot-api';
import { resolveStoredImagePath } from './assets.js';
import { userIdFromContext } from './bot.js';
import { getHero } from './database.js';
import { mainKeyboard } from './keyboards.js';

const uploadedHeroImages = new Map<string, ReturnType<Context['api']['uploadImage']>>();

export async function getUploadedImage(ctx: Context, imagePath: string) {
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

export async function replyWithMainKeyboard(ctx: Context, text: string): Promise<void> {
  const hero = getHero(userIdFromContext(ctx));

  if (!hero?.imagePath) {
    await ctx.reply(text, { attachments: [mainKeyboard] });
    return;
  }

  const image = await getUploadedImage(ctx, resolveStoredImagePath(hero.imagePath));
  await ctx.reply(text, { attachments: [mainKeyboard, image.toJson()] });
}
