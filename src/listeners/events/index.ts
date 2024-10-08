import { App } from '@slack/bolt';

import appHomeOpenedCallback from './app-home-opened';
import appMetionedCallback from './app-mention';

const register = (app: App) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  app.event('app_mention', appMetionedCallback);
};

export default { register };
