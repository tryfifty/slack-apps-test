import { App } from '@slack/bolt';
import sampleMessageCallback from './sample-message';
import messageHandler from './message-handler';

const register = (app: App) => {
  app.message(/^(hi|hello|hey).*/, sampleMessageCallback);
  app.message(messageHandler);
};

export default { register };
