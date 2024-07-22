import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

const sampleMessageCallback = async ({
  context,
  message,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'message'>) => {
  try {
    const greeting = context.matches[0];

    console.log(`The message is a greeting: ${greeting}`);
    await say(`${greeting}, how are you?`);
  } catch (error) {
    console.error(error);
  }
};

export default sampleMessageCallback;
