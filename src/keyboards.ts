import { Keyboard } from '@maxhub/max-bot-api';

// Клавиатуры
export const startKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Поехали!', 'newHero')],
]);

export const mainKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Истории', 'choiseHistory'),
    Keyboard.button.callback('Советчик', 'helpAI'),
  ],
]);

export const pol = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Мужчина', 'menHero'),
    Keyboard.button.callback('Женщина', 'womenHero'),
  ],
]);

export const menHair = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлые', 'menLight'),
    Keyboard.button.callback('Темные', 'menDark'),
    Keyboard.button.callback('Рыжие', 'menRed'),
  ],
]);

export const womenHair = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлые', 'womenLight'),
    Keyboard.button.callback('Темные', 'womenDark'),
    Keyboard.button.callback('Рыжие', 'womenRed'),
  ],
]);

export const menLightColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'menLightVeryLight'),
    Keyboard.button.callback('Смуглая', 'menLightLight'),
    Keyboard.button.callback('Темная', 'menLightDark'),
  ],
]);

export const menDarkColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'menDarkVeryLight'),
    Keyboard.button.callback('Смуглая', 'menDarkLight'),
    Keyboard.button.callback('Темная', 'menDarkDark'),
  ],
]);

export const menRedColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'menRedVeryLight'),
    Keyboard.button.callback('Смуглая', 'menRedLight'),
    Keyboard.button.callback('Темная', 'menRedDark'),
  ],
]);

export const womenLightColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'womenLightVeryLight'),
    Keyboard.button.callback('Смуглая', 'womenLightLight'),
    Keyboard.button.callback('Темная', 'womenLightDark'),
  ],
]);

export const womenDarkColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'womenDarkVeryLight'),
    Keyboard.button.callback('Смуглая', 'womenDarkLight'),
    Keyboard.button.callback('Темная', 'womenDarkDark'),
  ],
]);

export const womenRedColor = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Светлая', 'womenRedVeryLight'),
    Keyboard.button.callback('Смуглая', 'womenRedLight'),
    Keyboard.button.callback('Темная', 'womenRedDark'),
  ],
]);

export const choiseHistoryKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('1', 'history1'), Keyboard.button.callback('2', 'history2')],
]);
