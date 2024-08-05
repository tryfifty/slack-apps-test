import { AllMiddlewareArgs, SlackActionMiddlewareArgs, BlockAction } from '@slack/bolt';

const talkMoreAction = async ({
  ack,
  client,
  body,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction>) => {
  try {
    await ack();
    // @ts-ignore
    console.log(body.actions[0].text);
  } catch (error) {
    console.error(error);
  }
};

export default talkMoreAction;
