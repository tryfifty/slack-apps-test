import { pull } from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import slackify from 'slackify-markdown';
import { SlackChatHistoryRetriever } from '../../retrievers/slackChatHistoryRetriever';
import { getSlackConnection } from '../../services/supabase';
import embedding from '../../embedders';
import { searchVectorData } from '../../services/qdrant';
import { chat } from '../../services/openai';
import messageConversation from '../../blocks/messageConversation';

const appMetionedCallback = async ({ event, client }) => {
  console.log('app_mention event payload:', event);
  try {
    const { text } = event;
    // const cleanedText = msgFromEvent.replace(/<@[\w\d]+>\s*/, '');

    // // console.log('msgFromEvent', cleanedText);

    if (text.length !== 0) {
      //   // Initial message indicating bot is typing
      const typingMessage = await client.chat.postMessage({
        channel: event.channel,
        text: 'Bot is typing...',
        thread_ts: event.thread_ts || event.ts,
      });

      const chatHistoryRetriever = new SlackChatHistoryRetriever({
        slackApp: client,
        channel: event.channel,
        ts: event.thread_ts || event.ts,
      });

      const slackConverationHistory = await chatHistoryRetriever.retreiveChatHistory(
        !event.thread_ts,
        event.user,
      );

      console.log('slackConverationHistory', slackConverationHistory);

      const slackConnection = await getSlackConnection(event.team as string);
      // console.log('slackConnection', slackConnection);
      const { team_id } = slackConnection[0];

      const query = await embedding(text);

      console.log('query', query);

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

      // // TODO: 개선이 필요해
      // // 문맥 파악을 바탕으로 데이터를 가져올지, 어떤 데이터를 가져올지 결정해야해. 이거야말로 멀티 에이젼트 스터프네? 리즈닝이 가능할까? 어느정도로 가능할까?
      // // 1. 대화 히스토리
      // // 2. 어떤 데이터베이스에서 가져올지
      // // 3. 어떤 데이터를 가져올지
      // // 4. 어떻게 검색할지

      const slackifiedResult = slackify(answer);

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
};

export default appMetionedCallback;
