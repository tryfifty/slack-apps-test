import { App, LogLevel } from '@slack/bolt';
import * as dotenv from 'dotenv';
import Express from 'express';
import registerListeners from './listeners';
import registControllers from './controllers';

dotenv.config();

/** Initialization */
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.INFO,
});

/** Register Listeners */
registerListeners(slackApp);

const expressApp = Express();

registControllers(expressApp, slackApp);

expressApp.listen(8080, () => {
  console.log('Express server is running on http://localhost:8080');
});

/** Start Bolt App */
(async () => {
  try {
    await slackApp.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running! ⚡️');
  } catch (error) {
    console.error('Unable to start App', error);
  }
})();
