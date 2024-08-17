import { pull } from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import slackify from 'slackify-markdown';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { SlackChatHistoryRetriever } from '../../retrievers/slackChatHistoryRetriever';
import messageConversation from '../../blocks/messageConversation';
import { getSlackConnection } from '../../services/supabase';
import { searchVectorData } from '../../services/qdrant';
import embedding from '../../embedders';
import { chat } from '../../services/openai';

const messageHandler = async ({ context, message, event, say, client }) => {
  // console.log('Message received', event);
  /**
   * TODO:: Bug Fix
   * Currently, the bot's second message type is message_changed so there's error commig out.
   */
  if (
    message.channel_type === 'im' &&
    event.subtype !== 'bot_message' &&
    !message.message?.bot_id
  ) {
    // console.log('Message is from App Home', event);
    console.log('Message is from App Home', message);

    try {
      const { text } = event;

      if (text.length !== 0) {
        // Initial message indicating bot is typing
        const typingMessage = await say({
          text: 'Bot is typing...',
          thread_ts: message.ts,
        });

        const chatHistoryRetriever = new SlackChatHistoryRetriever({
          slackApp: client,
          channel: message.channel,
          ts: message.thread_ts || message.ts,
        });

        const slackConverationHistory = await chatHistoryRetriever.retreiveChatHistory(
          !message.thread_ts,
          message.user,
        );

        console.log('slackConverationHistory', slackConverationHistory);

        const slackConnection = await getSlackConnection(message.team as string);
        // console.log('slackConnection', slackConnection);
        const { team_id } = slackConnection[0];

        const query = await embedding(text);

        // console.log('query', query);

        const searchReuslt = await searchVectorData(team_id, query[0]);

        console.log(searchReuslt);

        // await client.chat.update({
        //   channel: event.channel,
        //   ts: typingMessage.ts,
        //   text: searchReuslt
        //     .map((r, i) => `#${i} result: \n ${r.payload.content}`)
        //     .join('\n-----------------\n'),
        //   // blocks: messageConversation(answer.choices[0].message.content),
        // });

        const promptTemplate = await pull<ChatPromptTemplate>('macdal-rag');

        const generateContext = {
          previousMessages: slackConverationHistory,
          searchResult: searchReuslt.map((r, i) => `#${i} result: \n ${r.payload.content}`),
        };

        const prompt = await promptTemplate.invoke({
          context: JSON.stringify(generateContext),
          question: text,
        });

        console.log('prompt', prompt);

        const messages: any = prompt.messages.map((m) => {
          let role: string;
          let name: string;

          if (m instanceof SystemMessage) {
            role = 'system';
            name = 'macdal';
          } else if (m instanceof HumanMessage) {
            role = 'user';
            name = 'user';
          } else if (m instanceof AIMessage) {
            role = 'assistant';
            name = 'assistant';
          } else {
            throw new Error('Unknown message type');
          }

          return {
            role,
            content: m.content as string,
            name,
          };
        });

        const llmResponse = await chat.completions.create({
          model: 'gpt-4o',
          messages,
        });

        const answer = llmResponse.choices[0].message.content;

        // TODO: 개선이 필요해
        // 문맥 파악을 바탕으로 데이터를 가져올지, 어떤 데이터를 가져올지 결정해야해. 이거야말로 멀티 에이젼트 스터프네? 리즈닝이 가능할까? 어느정도로 가능할까?
        // 1. 대화 히스토리
        // 2. 어떤 데이터베이스에서 가져올지
        // 3. 어떤 데이터를 가져올지
        // 4. 어떻게 검색할지

        const slackifiedResult = slackify(answer);

        // Update the initial message with the result

        await client.chat.update({
          channel: event.channel,
          ts: typingMessage.ts,
          text: slackifiedResult,
          blocks: messageConversation(slackifiedResult),
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
};

export default messageHandler;
