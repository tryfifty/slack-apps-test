import { App } from '@slack/bolt';
import sampleActionCallback from './sample-action';
import overflowActionCallback from './overflow-action';
import talkMoreActionCallback from './talk-more-action';

const register = (app: App) => {
  app.action('sample_action_id', sampleActionCallback);
  app.action('overflow-action', overflowActionCallback);
  app.action('talk-more-button', talkMoreActionCallback);
};

export default { register };
