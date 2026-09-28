import { type Context } from '@maxhub/max-bot-api';
import { imagePath } from './assets.js';
import { bot, userIdFromContext } from './bot.js';
import {
  registerUser,
  saveHero,
  type HairColor,
  type Hero,
  type HeroGender,
  type SkinTone,
} from './database.js';
import {
  menDarkColor,
  menHair,
  menLightColor,
  menRedColor,
  pol,
  startKeyboard,
  womenDarkColor,
  womenHair,
  womenLightColor,
  womenRedColor,
} from './keyboards.js';
import { getUploadedImage, replyWithMainKeyboard } from './ui.js';

async function finishHero(
  ctx: Context,
  gender: HeroGender,
  hairColor: HairColor,
  skinTone: SkinTone,
  imageFilename: string
): Promise<void> {
  const hero: Hero = { gender, hairColor, skinTone, imagePath: imagePath(imageFilename) };
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
        
Скоро ты попадёшь в истории, где ты — главный герой. **Каждая история поможет понять, какая профессия тебе подходит.**
        
Но для начала нам нужно создать твоего персонажа!
`,
    { attachments: [startKeyboard], format: 'markdown' }
  );
});

bot.action('newHero', async (ctx) => {
  const imageMen = await getUploadedImage(ctx, imagePath('113.png'));
  const imageWomen = await getUploadedImage(ctx, imagePath('213.png'));
  await ctx.reply('Выбери пол своего персонажа', {
    attachments: [pol, imageMen.toJson(), imageWomen.toJson()],
  });
});

bot.action('menHero', async (ctx) => {
  const imageBlack = await getUploadedImage(ctx, imagePath('113.png'));
  const imageWhite = await getUploadedImage(ctx, imagePath('112.png'));
  const imageRed = await getUploadedImage(ctx, imagePath('111.png'));

  await ctx.reply('Теперь выберем цвет волос', {
    attachments: [menHair, imageWhite.toJson(), imageBlack.toJson(), imageRed.toJson()],
  });
});

bot.action('womenHero', async (ctx) => {
  const imageBlack = await getUploadedImage(ctx, imagePath('213.png'));
  const imageWhite = await getUploadedImage(ctx, imagePath('212.png'));
  const imageRed = await getUploadedImage(ctx, imagePath('211.png'));
  await ctx.reply('Теперь выберем цвет волос', {
    attachments: [womenHair, imageWhite.toJson(), imageBlack.toJson(), imageRed.toJson()],
  });
});

bot.action('menLight', async (ctx) => {
  const imageVeryLight = await getUploadedImage(ctx, imagePath('112.png'));
  const imageLight = await getUploadedImage(ctx, imagePath('122.png'));
  const imageDark = await getUploadedImage(ctx, imagePath('132.png'));
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [menLightColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('menDark', async (ctx) => {
  const imageVeryLight = await getUploadedImage(ctx, imagePath('113.png'));
  const imageLight = await getUploadedImage(ctx, imagePath('123.png'));
  const imageDark = await getUploadedImage(ctx, imagePath('133.png'));
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [menDarkColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('menRed', async (ctx) => {
  const imageVeryLight = await getUploadedImage(ctx, imagePath('111.png'));
  const imageLight = await getUploadedImage(ctx, imagePath('121.png'));
  const imageDark = await getUploadedImage(ctx, imagePath('131.png'));
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [menRedColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('womenLight', async (ctx) => {
  const imageVeryLight = await getUploadedImage(ctx, imagePath('212.png'));
  const imageLight = await getUploadedImage(ctx, imagePath('222.png'));
  const imageDark = await getUploadedImage(ctx, imagePath('232.png'));
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
  const imageVeryLight = await getUploadedImage(ctx, imagePath('213.png'));
  const imageLight = await getUploadedImage(ctx, imagePath('223.png'));
  const imageDark = await getUploadedImage(ctx, imagePath('233.png'));
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [womenDarkColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('womenRed', async (ctx) => {
  const imageVeryLight = await getUploadedImage(ctx, imagePath('211.png'));
  const imageLight = await getUploadedImage(ctx, imagePath('221.png'));
  const imageDark = await getUploadedImage(ctx, imagePath('231.png'));
  await ctx.reply('Осталось выбрать цвет кожи', {
    attachments: [womenRedColor, imageVeryLight.toJson(), imageLight.toJson(), imageDark.toJson()],
  });
});

bot.action('menLightVeryLight', (ctx) => finishHero(ctx, 'male', 'light', 'veryLight', '112.png'));
bot.action('menLightLight', (ctx) => finishHero(ctx, 'male', 'light', 'light', '122.png'));
bot.action('menLightDark', (ctx) => finishHero(ctx, 'male', 'light', 'dark', '132.png'));
bot.action('menDarkVeryLight', (ctx) => finishHero(ctx, 'male', 'dark', 'veryLight', '113.png'));
bot.action('menDarkLight', (ctx) => finishHero(ctx, 'male', 'dark', 'light', '123.png'));
bot.action('menDarkDark', (ctx) => finishHero(ctx, 'male', 'dark', 'dark', '133.png'));
bot.action('menRedVeryLight', (ctx) => finishHero(ctx, 'male', 'red', 'veryLight', '111.png'));
bot.action('menRedLight', (ctx) => finishHero(ctx, 'male', 'red', 'light', '121.png'));
bot.action('menRedDark', (ctx) => finishHero(ctx, 'male', 'red', 'dark', '131.png'));
bot.action('womenLightVeryLight', (ctx) =>
  finishHero(ctx, 'female', 'light', 'veryLight', '212.png')
);
bot.action('womenLightLight', (ctx) => finishHero(ctx, 'female', 'light', 'light', '222.png'));
bot.action('womenLightDark', (ctx) => finishHero(ctx, 'female', 'light', 'dark', '232.png'));
bot.action('womenDarkVeryLight', (ctx) =>
  finishHero(ctx, 'female', 'dark', 'veryLight', '213.png')
);
bot.action('womenDarkLight', (ctx) => finishHero(ctx, 'female', 'dark', 'light', '223.png'));
bot.action('womenDarkDark', (ctx) => finishHero(ctx, 'female', 'dark', 'dark', '233.png'));
bot.action('womenRedVeryLight', (ctx) => finishHero(ctx, 'female', 'red', 'veryLight', '211.png'));
bot.action('womenRedLight', (ctx) => finishHero(ctx, 'female', 'red', 'light', '221.png'));
bot.action('womenRedDark', (ctx) => finishHero(ctx, 'female', 'red', 'dark', '231.png'));
