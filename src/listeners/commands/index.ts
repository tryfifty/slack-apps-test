import { AllMiddlewareArgs, App, SlackCommandMiddlewareArgs } from '@slack/bolt';
import sampleCommandCallback from './sample-command';

const register = (app: App) => {
  app.command('/sample-command', sampleCommandCallback);
  app.command('/mc-translate', async ({ ack, respond }:
    AllMiddlewareArgs & SlackCommandMiddlewareArgs) => {
    try {
      await ack();

      console.log('OK?asdfasdasdfasdff??');

      await respond('Responding to the sample coasdfasdfmmand! No!! IT"s not working');
    } catch (error) {
      console.error(error);
    }
  });
};

export default { register };
