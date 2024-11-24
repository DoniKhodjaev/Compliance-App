export type Language = 'en' | 'ru';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'ru'];

export const DEFAULT_LANGUAGE: Language = 'en';

export type TranslationKey = 
  | 'dashboard'
  | 'entitySearch'
  | 'commonEntities'
  | 'blacklist'
  | 'sdnList'
  | 'reports'
  | 'language'
  | 'language_en'
  | 'language_ru'
  | 'blacklistManagement'
  | 'downloadTemplate'
  | 'importCsv'
  | 'addEntry'
  | 'confirmRemoval'
  | 'removeConfirmation'
  | 'englishNames'
  | 'russianNames'
  | 'cancel'
  | 'removeEntry'
  | 'basicInformation'
  | 'status'
  | 'clean'
  | 'needsReview'
  | 'flagged'
  | 'name'
  | 'lastChecked'
  | 'save'
  | 'editBlacklistEntry'
  | 'addToBlacklist'
  | 'inn'
  | 'optional'
  | 'enterInn'
  | 'fullName'
  | 'shortName'
  | 'abbreviation'
  | 'notes'
  | 'addNotes'
  | 'swiftMessages'
  | 'entityScreening'
  | 'sanctionLists'
  | 'analyticsReports'
  | 'appTitle'
  | 'checkSelected'
  | 'addToCommonEntities';

type TranslationsType = {
  [key in Language]: {
    [key in TranslationKey]: string;
  };
};

export const translations: TranslationsType = {
  en: {
    dashboard: 'Dashboard',
    entitySearch: 'Entity Search',
    commonEntities: 'Common Entities',
    blacklist: 'Internal Blacklist',
    sdnList: 'OFAC SDN List',
    reports: 'Reports',
    language: 'Language',
    language_en: 'English',
    language_ru: 'Russian',
    blacklistManagement: 'Blacklist Management',
    downloadTemplate: 'Download Template',
    importCsv: 'Import CSV',
    addEntry: 'Add Entry',
    confirmRemoval: 'Confirm Removal',
    removeConfirmation: 'Are you sure you want to remove this entry?',
    englishNames: 'English Names',
    russianNames: 'Russian Names',
    cancel: 'Cancel',
    removeEntry: 'Remove Entry',
    basicInformation: 'Basic Information',
    status: 'Status',
    clean: 'Clean',
    needsReview: 'Needs Review',
    flagged: 'Flagged',
    name: 'Name',
    lastChecked: 'Last Checked',
    save: 'Save',
    editBlacklistEntry: 'Edit Blacklist Entry',
    addToBlacklist: 'Add to Blacklist',
    inn: 'INN',
    optional: 'Optional',
    enterInn: 'Enter INN',
    fullName: 'Full Name',
    shortName: 'Short Name',
    abbreviation: 'Abbreviation',
    notes: 'Notes',
    addNotes: 'Add notes...',
    swiftMessages: 'SWIFT Messages',
    entityScreening: 'Entity Verification',
    sanctionLists: 'Sanction Lists',
    analyticsReports: 'Analytics & Reports',
    appTitle: 'SWIFT Message Checker',
    checkSelected: 'Check Selected',
    addToCommonEntities: 'Add to Common Entities',
  },
  ru: {
    dashboard: 'Панель управления',
    entitySearch: 'Поиск организаций',
    commonEntities: 'Общие Организации',
    blacklist: 'Внутренний Черный Список',
    sdnList: 'Список OFAC SDN',
    reports: 'Отчеты',
    language: 'Язык',
    language_en: 'Английский',
    language_ru: 'Русский',
    blacklistManagement: 'Управление черным списком',
    downloadTemplate: 'Скачать шаблон',
    importCsv: 'Импорт CSV',
    addEntry: 'Добавить запись',
    confirmRemoval: 'Подтвердите удаление',
    removeConfirmation: 'Вы уверены, что хотите удалить эту запись?',
    englishNames: 'Английские имена',
    russianNames: 'Русские имена',
    cancel: 'Отмена',
    removeEntry: 'Удалить запись',
    basicInformation: 'Основная информация',
    status: 'Статус',
    clean: 'Чисто',
    needsReview: 'Требует проверки',
    flagged: 'Помечено',
    name: 'Имя',
    lastChecked: 'Последняя проверка',
    save: 'Сохранить',
    editBlacklistEntry: 'Редактировать запись',
    addToBlacklist: 'Добавить в черный список',
    inn: 'ИНН',
    optional: 'Необязательно',
    enterInn: 'Введите ИНН',
    fullName: 'Полное название',
    shortName: 'Краткое название',
    abbreviation: 'Аббревиатура',
    notes: 'Примечания',
    addNotes: 'Добавить примечания...',
    swiftMessages: 'SWIFT Сообщения',
    entityScreening: 'Проверка Организаций',
    sanctionLists: 'Санкционные списки',
    analyticsReports: 'Аналитика и Отчеты',
    appTitle: 'SWIFT Проверка Сообщений',
    checkSelected: 'Проверить выбранные',
    addToCommonEntities: 'Добавить в общие организации',
  }
}; 