import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { pull } from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { StringOutputParser } from '@langchain/core/output_parsers';

import path from 'path';
import { formatDocumentsAsString } from 'langchain/util/document';
import { QdrantVectorStore } from '@langchain/qdrant';
import slackify from 'slackify-markdown';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { SlackChatHistoryRetriever } from '../../retrievers/slackChatHistoryRetriever';
import messageConversation from '../../blocks/messageConversation';
import { getSlackConnection, getSlackConnectionById } from '../../services/supabase';
import generateAnswer from '../../services/chat';
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

        const slackConverationHistory = await chatHistoryRetriever.get1on1Conversation(
          !message.thread_ts,
        );

        console.log('slackConverationHistory', slackConverationHistory);

        const slackConnection = await getSlackConnection(message.team as string);
        // console.log('slackConnection', slackConnection);
        const { team_id } = slackConnection[0];

        const query = await embedding(text);

        // console.log('query', query);

        const searchReuslt = await searchVectorData(team_id, query[0]);

        console.log(searchReuslt);

        const promptTemplate = await pull<ChatPromptTemplate>('macdal-rag');

        const generateContext = {
          previousMessages: slackConverationHistory,
          searchResult: searchReuslt,
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

        const answer = await chat.completions.create({
          model: 'gpt-4o',
          messages,
        });

        console.log('answer', answer.choices[0].message.content);

        // console.log('searchReuslt', searchReuslt);

        // TODO: 개선이 필요해
        // 문맥 파악을 바탕으로 데이터를 가져올지, 어떤 데이터를 가져올지 결정해야해. 이거야말로 멀티 에이젼트 스터프네? 리즈닝이 가능할까? 어느정도로 가능할까?
        // 1. 대화 히스토리
        // 2. 어떤 데이터베이스에서 가져올지
        // 3. 어떤 데이터를 가져올지
        // 4. 어떻게 검색할지

        // Open AI Function 을 활용해보자

        // /**
        //  * This way is also sucks because It's too over simplified.
        //  */
        // const vectorStore = await QdrantVectorStore.fromExistingCollection(new OpenAIEmbeddings(), {
        //   url: process.env.QDRANT_URL,
        //   apiKey: process.env.QDRANT_API_KEY,
        //   collectionName: team_id,
        // });

        // // Search for the most similar document
        // // const result = await loadedVectorStore.similaritySearch('login', 2);

        // const ContextRetriever = vectorStore.asRetriever();
        // const prompt = await pull<ChatPromptTemplate>('rag-macdal-starter');

        // //   console.log('prompt', prompt);

        // const llm = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
        // const ragChain = await createStuffDocumentsChain({
        //   llm,
        //   prompt,
        //   outputParser: new StringOutputParser(),
        // });

        // const chatHistoryRetriever = new SlackChatHistoryRetriever({
        //   slackApp: client,
        //   channel: event.channel,
        //   ts: event.ts || event.thread_ts,
        // }).pipe(formatDocumentsAsString);

        // /**
        //  * Get slack message history
        //  *
        //  * TODO:: Remember that slack history message limit is tier 3
        //  * ( 50 messages per minute per channle? per user? per account? per bot?)
        //  */

        // // console.log('Thread messages:', slackConversations.messages);

        // const result = await ragChain.invoke({
        //   chat_history: await chatHistoryRetriever.invoke(cleanedText),
        //   context: await ContextRetriever.invoke(cleanedText),
        //   question: cleanedText,
        // });

        // const slackifiedResult = slackify(result);

        // const answer = await generateAnswer({
        //   message: text,
        //   team: message.team,
        //   channel: message.channel,
        //   ts: typingMessage.ts,
        //   client,
        // });

        // Update the initial message with the result
        await client.chat.update({
          channel: event.channel,
          ts: typingMessage.ts,
          text: answer.choices[0].message.content,
          blocks: messageConversation(answer.choices[0].message.content),
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
};

export default messageHandler;
