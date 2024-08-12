import { AllMiddlewareArgs, App, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import * as dotenv from 'dotenv';
import sampleCommandCallback from './sample-command';
import messageHelp from '../../blocks/messageHelp';
import messageConversation from '../../blocks/messageConversation';
import whipser from './whisper';
import updateCallback from './update';
import msgConnection from '../../blocks/messageConnect';

dotenv.config();

const model = new ChatOpenAI({
  model: 'gpt-3.5-turbo',
  apiKey: process.env.OPENAI_API_KEY,
});

const register = (app: App) => {
  app.command('/sample-command', sampleCommandCallback);
  // app.command('/mc-translate', async ({ ack, respond, payload }:
  //   AllMiddlewareArgs & SlackCommandMiddlewareArgs) => {
  //   try {
  //     await ack();

  //     console.log(payload.text);

  //     // 시스템 메세지와 사용자 메세지 생성
  //     const systemMessage = new SystemMessage('Answering below
  // conversation like you are thugs.');
  //     const userMessage = new HumanMessage(payload.text);

  //     // 대화 생성
  //     const messages = [systemMessage, userMessage];
  //     const response: AIMessage = await model.invoke(messages);

  //     // FIXME:: response.content might not be string
  //     await respond(response.content.toString());
  //   } catch (error) {
  //     console.error(error);
  //   }
  // });

  app.command(
    '/mc-translate',
    async ({ ack, respond, payload, client }: AllMiddlewareArgs & SlackCommandMiddlewareArgs) => {
      try {
        await ack();

        console.log(payload);
        console.log(client);

        await respond({
          blocks: msgConnection(),
        });
      } catch (error) {
        console.error(error);
      }
    },
  );

  app.command('/macdal-help', async ({ ack, respond, command }) => {
    await ack();
    await respond({
      blocks: messageHelp(command.user_id),
    });
  });

  app.command('/macdal-whisper', whipser);

  app.command('/update-notion', updateCallback);
};

export default { register };
