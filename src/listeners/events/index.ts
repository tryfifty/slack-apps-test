import { App } from '@slack/bolt';
import appHomeOpenedCallback from './app-home-opened';

const register = (app: App) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  app.event('app_mention', async ({ event, client }) => {
    console.log('app_mention event payload:', event);
    try {
      await client.chat.postMessage({
        channel: event.channel,
        text: `Hello, <@${event.user}>!!!!?!??????!?! asdfasdfadf :wave:`,
      });
      console.log('app_mention message sent');
    } catch (error) {
      console.error(error);
    }
  });
};

export default { register };
