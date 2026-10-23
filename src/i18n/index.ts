import type { Issue } from '../domain/wizardSchema';
export type Language = 'en' | 'ru';
export const translator = (language: Language) => (english: string, russian: string) => language === 'ru' ? russian : english;
export function localizeIssues(issues: Issue[], language: Language): Issue[] {
  if (language === 'en') return issues;
  const messages: Record<string, string> = {
    'laravel-version': 'Укажите версию X.Y не ниже 12.0. Наличие релиза и совместимость проверьте отдельно.',
    'secret-option': 'Выберите поддерживаемые серверные шаблоны паролей.',
    'insecure-consent': 'Подтвердите, что HTTP разрешён для обеих функций endpoint и может передавать пароли без шифрования.',
    presets: 'Выберите только доступные пресеты.',
    'preset-conflict': 'admin-panel и api несовместимы: Queue worker конфликтует с Horizon.',
    'preset-source': 'admin-panel и api требуют новое приложение. Для готового репозитория оставьте staging или отключите пресеты.',
    'single-line': 'Введите одну строку без управляющих символов.',
    'reserved-action': 'Это значение зарезервировано CLI для служебной команды. Выберите другое.',
    repo: 'Укажите HTTPS- или SSH-репозиторий без пароля, токена, query и fragment.',
    branch: 'Начните с буквы или цифры; допустимы буквы, цифры, точки, _, / и дефисы.',
    'deploy-key': 'Нужен абсолютный путь к файлу на сервере и SSH URL репозитория.',
    slug: 'Начните с буквы или цифры; допустимы буквы, цифры, _ и дефисы. Имя nginxproxy зарезервировано.',
    domain: 'Введите DNS-имя, например app.example.com, без протокола, пути и порта.',
    email: 'Введите корректный email.',
    'db-identifier': 'Допустимы буквы, цифры, _ и дефисы. Нельзя начинать с дефиса. Лимиты: PostgreSQL — 63; MySQL — имя 64, пользователь 32 символа.',
    'mysql-root': 'Контейнер MySQL требует отдельного пользователя приложения, не root.',
    'existing-modules': 'Существующее приложение само управляет Filament и Horizon. Уберите несовместимые модули или пресет.',
    'queue-horizon': 'Выберите Horizon или обычный queue worker. Сначала уберите другой модуль или пресет.',
    retention: 'Выберите срок хранения от 1 до 3650 дней.',
    upload: 'Укажите размер PHP, например 64M, 512M или 1G.',
    'auth-user': 'Допустимы буквы, цифры, _, точки, @ и дефисы; начните с буквы или цифры.',
    port: 'Введите целый номер порта от 1 до 65535.',
    'duplicate-port': 'Заданные явно порты должны различаться.',
    'reserved-port': 'Порты 80 и 443 зарезервированы для общего proxy.',
    endpoint: 'Укажите абсолютный HTTPS URL без учётных данных и пробелов.',
    'endpoint-consent': 'Подтвердите, что deployer отправит созданные пароли проекта на этот endpoint.',
    'code-consent': 'Подтвердите выполнение произвольного кода внутри PHP-контейнера.',
    'completion-target': 'Укажите скрипт завершения или HTTPS endpoint либо отключите уведомления завершения.',
    'completion-path': 'Укажите абсолютный путь к файлу на сервере без компонентов . и ..; права и владельца проверит сервер.',
    'completion-script-consent': 'Подтвердите доверие скрипту с правами пользователя deploy, обычно root.',
    'completion-endpoint-consent': 'Подтвердите отправку итогового отчёта развёртывания в этот API.',
    'completion-token': 'Для файла токена нужен endpoint завершения. Укажите путь на сервере, а не сам токен.',
    'completion-timeout': 'Укажите целый тайм-аут от 1 до 300 секунд.',
    'python-mount': 'Python Docker не поддерживает запятые, двойные кавычки или .. в путях mounts. Измените путь или выберите Docker-образ.',
  };
  return issues.map(issue => ({ ...issue, message: messages[issue.code] || issue.message }));
}
export const warningText: Record<string, [string, string]> = {
  'insecure-endpoint': ['HTTP is explicitly allowed for both endpoint features. Project details and any included passwords can travel without encryption.', 'HTTP явно разрешён для обеих функций endpoint. Данные проекта и включённые пароли могут передаваться без шифрования.'],
  http: ['HTTPS is off. Application data will travel over unencrypted HTTP.', 'HTTPS выключен. Данные приложения будут передаваться по незашифрованному HTTP.'],
  'native-postgres': ['PostgreSQL must already run on this server. Configure listen_addresses, pg_hba.conf and firewall access for Docker networks. A custom port changes Laravel DB_PORT; provisioning uses the default local PostgreSQL connection.', 'PostgreSQL должен работать на этом сервере. Настройте listen_addresses, pg_hba.conf и доступ Docker через firewall. Выбранный порт задаёт DB_PORT; создание БД использует стандартное локальное подключение.'],
  'native-mysql': ['MySQL must already run on this server. Configure bind-address, user grants and access from Docker. This is not a remote cloud database. A custom port changes Laravel DB_PORT; provisioning uses the normal local MySQL connection.', 'MySQL должен работать на этом сервере. Настройте bind-address, права и доступ из Docker. Это не внешняя облачная БД. Выбранный порт задаёт DB_PORT; создание БД использует стандартное локальное подключение.'],
  'mysql-secret': ['MANUAL STEP REQUIRED: native MySQL needs its existing root password. Never enter it here. The template contains <MYSQL_ROOT_PASSWORD>. Replace it only on the server. CLI arguments can expose it in shell history and ps, even with hidden interactive input.', 'ТРЕБУЕТСЯ РУЧНОЙ ШАГ: native MySQL требует существующий root-пароль. Не вводите его здесь. Шаблон содержит <MYSQL_ROOT_PASSWORD>. Замените его на сервере. Пароль в аргументах CLI виден в ps и может попасть в историю shell даже при скрытом интерактивном вводе.'],
  existing: ['The repository must contain artisan and composer.json at its root. Frontend assets are not built automatically. Use a read-only deploy key; the server checks its file and trusts the SSH host on first use.', 'В корне репозитория нужны artisan и composer.json. Frontend assets автоматически не собираются. Используйте read-only deploy key; сервер проверяет файл и доверяет SSH-хосту при первом подключении.'],
  queue: ['Check QUEUE_CONNECTION: with sync or no asynchronous connection the worker stays idle. Add Redis integration or configure your application queue.', 'Проверьте QUEUE_CONNECTION: с sync или без асинхронного подключения worker останется без работы. Подключите Redis или настройте очередь приложения.'],
  horizon: ['Horizon automatically includes Redis. Configure the authorization gate for /horizon before using its dashboard in production.', 'Horizon автоматически подключает Redis. Настройте authorization gate для /horizon перед использованием в production.'],
  zip: ['The one-time ZIP excludes database volume contents and certificates. It is saved in /tmp and can disappear on reboot. Use database backups for DB dumps.', 'Разовый ZIP не содержит данные тома БД и сертификаты. Архив хранится в /tmp и может исчезнуть после перезагрузки. Для дампов нужен модуль backup.'],
  dhparam: ['DH parameters take several minutes and affect project nginx only. They do not configure TLS in the shared proxy.', 'Генерация DH-параметров занимает несколько минут и влияет только на nginx проекта, а не на TLS общего proxy.'],
  endpoint: ['The deployer sends project data, including generated database, Redis and Basic Auth credentials, to this configured endpoint. Trust its operator. The browser does not contact it.', 'Deployer отправит на указанный endpoint данные проекта, включая созданные пароли БД, Redis и Basic Auth. Доверяйте его владельцу. Браузер к нему не обращается.'],
  'post-deploy': ['This hook executes arbitrary shell code inside the PHP container and runs again on repository updates. Do not include secrets; the hook is recorded in deployment metadata.', 'Hook выполняет произвольный shell-код в PHP-контейнере и повторяется при обновлении репозитория. Не включайте секреты: команда сохраняется в метаданных.'],
};
