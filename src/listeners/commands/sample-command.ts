import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import msgConnection from '../../blocks/messageConnect';
import msgUpdateStart from '../../blocks/messageUpdateStart';
import msgUpdateComplete from '../../blocks/messageUpdateComplete';
import msgWelcome from '../../blocks/messageWelcome';

const sampleCommandCallback = async ({
  ack,
  respond,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs) => {
  try {
    await ack();

    // const msg = msgUpdateStart();
    const msg = msgWelcome();

    await respond({
      blocks: msg,
    });
  } catch (error) {
    console.error(error);
  }
};

export default sampleCommandCallback;
