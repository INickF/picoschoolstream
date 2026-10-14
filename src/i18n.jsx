import { createContext, useContext } from 'react';

const en = {
  'app.live': '{n} live',
  'app.of': 'of {n}',
  'app.enableAll': 'Enable all',
  'app.disableAll': 'Disable all',
  'app.add': 'Add headset',
  'app.size.sm': 'Small tiles',
  'app.size.md': 'Medium tiles',
  'app.size.lg': 'Large tiles',
  'app.language': 'Language',
  'empty.title': 'No headsets yet',
  'empty.text': 'Add a headset by its IP address to start watching its stream.',

  'status.idle': 'Off',
  'status.connecting': 'Connecting',
  'status.waiting': 'Waiting',
  'status.playing': 'Live',
  'status.busy': 'Busy',
  'status.offline': 'Offline',
  'status.ended': 'Not casting',
  'status.error': 'Error',

  'msg.unreachable': 'Headset not reachable',
  'msg.otherViewer': 'Another viewer is casting',
  'msg.accept': 'Accept the cast on the headset',
  'msg.busy': 'Headset is busy',
  'msg.notStarted': 'Cast was not started',
  'msg.statusError': 'Headset returned an error',
  'msg.lost': 'Connection lost',
  'msg.ended': 'Cast ended on headset',

  'tile.start': 'Start stream',
  'tile.stop': 'Stop stream',
  'tile.retry': 'Retry now',
  'tile.mute': 'Mute',
  'tile.unmute': 'Unmute',
  'tile.options': 'Options',
  'tile.inFocus': 'Open in full view',

  'menu.rename': 'Rename',
  'menu.changeIp': 'Change IP',
  'menu.restart': 'Force restart',
  'menu.delete': 'Delete',
  'menu.confirmDelete': 'Click again to delete',

  'focus.back': 'Back to all headsets (Esc)',
  'focus.quality': 'Quality',
  'focus.standard': 'Standard',
  'focus.smooth': 'Smooth',
  'focus.ratio': 'Ratio',
  'focus.fullscreen': 'Fullscreen (F11)',

  'dialog.add': 'Add headset',
  'dialog.rename': 'Rename headset',
  'dialog.ip': 'Change IP address',
  'dialog.name': 'Name',
  'dialog.ipLabel': 'IP address',
  'dialog.cancel': 'Cancel',
  'dialog.submitAdd': 'Add',
  'dialog.save': 'Save',
  'dialog.defaultName': 'Headset {n}',
  'dialog.errName': 'Enter a name',
  'dialog.errIp': 'Enter a valid IPv4 address, e.g. 192.168.0.111',
  'dialog.errDup': 'A headset with this IP already exists',
};

const ru = {
  'app.live': '{n} в эфире',
  'app.of': 'из {n}',
  'app.enableAll': 'Включить все',
  'app.disableAll': 'Выключить все',
  'app.add': 'Добавить шлем',
  'app.size.sm': 'Маленькие плитки',
  'app.size.md': 'Средние плитки',
  'app.size.lg': 'Большие плитки',
  'app.language': 'Язык',
  'empty.title': 'Шлемов пока нет',
  'empty.text': 'Добавьте шлем по IP-адресу, чтобы смотреть его трансляцию.',

  'status.idle': 'Выключен',
  'status.connecting': 'Подключение',
  'status.waiting': 'Ожидание',
  'status.playing': 'В эфире',
  'status.busy': 'Занят',
  'status.offline': 'Нет связи',
  'status.ended': 'Не транслирует',
  'status.error': 'Ошибка',

  'msg.unreachable': 'Шлем недоступен',
  'msg.otherViewer': 'Трансляцию уже смотрит другое устройство',
  'msg.accept': 'Подтвердите трансляцию в шлеме',
  'msg.busy': 'Шлем занят',
  'msg.notStarted': 'Трансляция не запустилась',
  'msg.statusError': 'Шлем вернул ошибку',
  'msg.lost': 'Связь потеряна',
  'msg.ended': 'Трансляция в шлеме остановлена',

  'tile.start': 'Включить трансляцию',
  'tile.stop': 'Остановить трансляцию',
  'tile.retry': 'Повторить',
  'tile.mute': 'Выключить звук',
  'tile.unmute': 'Включить звук',
  'tile.options': 'Действия',
  'tile.inFocus': 'Открыто на весь экран',

  'menu.rename': 'Переименовать',
  'menu.changeIp': 'Изменить IP',
  'menu.restart': 'Перезапустить',
  'menu.delete': 'Удалить',
  'menu.confirmDelete': 'Нажмите ещё раз',

  'focus.back': 'Ко всем шлемам (Esc)',
  'focus.quality': 'Качество',
  'focus.standard': 'Стандарт',
  'focus.smooth': 'Плавно',
  'focus.ratio': 'Формат',
  'focus.fullscreen': 'Полный экран (F11)',

  'dialog.add': 'Новый шлем',
  'dialog.rename': 'Переименовать шлем',
  'dialog.ip': 'Изменить IP-адрес',
  'dialog.name': 'Название',
  'dialog.ipLabel': 'IP-адрес',
  'dialog.cancel': 'Отмена',
  'dialog.submitAdd': 'Добавить',
  'dialog.save': 'Сохранить',
  'dialog.defaultName': 'Шлем {n}',
  'dialog.errName': 'Введите название',
  'dialog.errIp': 'Введите корректный IPv4-адрес, например 192.168.0.111',
  'dialog.errDup': 'Шлем с таким IP уже есть',
};

export const LANGUAGES = [
  ['en', 'EN'],
  ['ru', 'RU'],
];

const dictionaries = { en, ru };

export function detectLanguage() {
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

// Unknown keys are returned as-is, so raw messages from the headset still display.
export function translate(lang, key, vars) {
  let s = dictionaries[lang]?.[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

const I18nContext = createContext('en');
export const I18nProvider = I18nContext.Provider;

export function useT() {
  const lang = useContext(I18nContext);
  return (key, vars) => translate(lang, key, vars);
}
