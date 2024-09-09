import { pull } from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import slackify from 'slackify-markdown';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { SlackChatHistoryRetriever } from '../../retrievers/slackChatHistoryRetriever';
import messageConversation from '../../blocks/messageConversation';
import { getSlackConnection } from '../../services/supabase';
import { searchVectorData } from '../../services/qdrant';
import embedding from '../../embedders';
import { beta, chat } from '../../services/openai';
import { queryAnalysisPrompt, questionBuckenizePrompt } from '../../constanats/prompts';
import { queryDeterminePrompt } from '../../constanats/prompts/system';

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
          text: 'Macdal is typing...',
          thread_ts: message.ts,
        });

        console.log(text);

        const outputStructure = z.object({
          noNeedToSearch: z.boolean(),
          reasoning: z.string(),
          answer: z.string(),
        });

        // Message Context
        // const responseStructure = z.object({
        //   query: z.array(z.string()),
        //   noNeedToSearch: z.boolean(),
        //   needMoreInfo: z.boolean(),
        //   decomposition: z.boolean(),
        //   expension: z.boolean(),
        //   routing: z.array(z.string()),
        //   generalization: z.boolean(),
        // });

        const completion = await beta.chat.completions.parse({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: queryDeterminePrompt,
              name: 'system',
            },
            {
              role: 'user',
              content: text,
              name: 'user',
            },
          ],
          response_format: zodResponseFormat(outputStructure, 'outputStructure'),
        });

        console.log(completion.choices[0].message);

        const { parsed } = completion.choices[0].message;

        if (parsed.noNeedToSearch) {
          await client.chat.update({
            channel: event.channel,
            ts: typingMessage.ts,
            text: parsed.answer,
          });
          return;
        }

        const chatHistoryRetriever = new SlackChatHistoryRetriever({
          slackApp: client,
          channel: message.channel,
          ts: message.thread_ts || message.ts,
        });

        const slackConverationHistory = await chatHistoryRetriever.retreiveChatHistory(
          !message.thread_ts,
          message.user,
        );

        // console.log('slackConverationHistory', slackConverationHistory);

        const slackConnection = await getSlackConnection(message.team as string);
        // console.log('slackConnection', slackConnection);
        const { team_id } = slackConnection[0];

        const query = await embedding(text);

        const searchResult = await searchVectorData(`${team_id}-source`, query[0]);

        const promptTemplate = await pull<ChatPromptTemplate>('macdal-rag');

        const generateContext = {
          previousMessages: slackConverationHistory,
          searchResult: searchResult.map((r, i) => `#${i} result: \n ${r.payload?.content || ''}`),
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

        const slackifiedResult = slackify(answer);

        await client.chat.update({
          channel: event.channel,
          ts: typingMessage.ts,
          text: slackifiedResult,
          blocks: messageConversation(slackifiedResult, searchResult),
        });

        /**
        const chatHistoryRetriever = new SlackChatHistoryRetriever({
          slackApp: client,
          channel: message.channel,
          ts: message.thread_ts || message.ts,
        });

        const slackConverationHistory = await chatHistoryRetriever.retreiveChatHistory(
          !message.thread_ts,
          message.user,
        );

        // console.log('slackConverationHistory', slackConverationHistory);

        const slackConnection = await getSlackConnection(message.team as string);
        // console.log('slackConnection', slackConnection);
        const { team_id } = slackConnection[0];
        // TODO:: Making more precise query??

        // Buketize the query

        // const bucketRes = z.object({
        //   source: z.array(z.string()),
        // });

        // const completion = await beta.chat.completions.parse({
        //   model: 'gpt-4o-mini',
        //   messages: [
        //     {
        //       role: 'user',
        //       content: questionBuckenizePrompt(text),
        //       name: 'user',
        //     },
        //   ],
        //   response_format: zodResponseFormat(bucketRes, 'bucketRes'),
        // });

        // const desciptions = completion.choices[0].message;
        // console.log(desciptions);

        // let sources = [];
        // if (desciptions.parsed) {
        //   sources = desciptions.parsed.source;
        // }

        const query = await embedding(text);
        // console.log(query);

        const searchResult = await searchVectorData(`${team_id}-source`, query[0]);

        // if (sources.includes('Notion')) {
        //   console.log('Search Notion');
        //   searchResult = [...searchResult, ...(await searchVectorData(team_id, query[0]))];
        // }

        // if (sources.includes('Figma')) {
        //   console.log('Search Figma');
        //   searchResult = [...searchResult, ...(await searchVectorData('figma_test', query[0]))];
        // }

        for (const result of searchResult) {
          console.log(result.payload?.metadata);
        }

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
          searchResult: searchResult.map((r, i) => `#${i} result: \n ${r.payload?.content || ''}`),
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
          blocks: messageConversation(slackifiedResult, searchResult),
        });
         */
      }
    } catch (error) {
      console.error(error);
    }
  }
};

export default messageHandler;
