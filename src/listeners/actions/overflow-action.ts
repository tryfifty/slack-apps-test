import { AllMiddlewareArgs, BlockAction, SlackActionMiddlewareArgs } from '@slack/bolt';

const overflowActionCallback = async ({
  ack,
  client,
  body,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction>) => {
  try {
    await ack();
    console.log(body);
    console.log((body.actions[0] as any).selected_option.value);
  } catch (error) {
    console.error(error);
  }
};

export default overflowActionCallback;
