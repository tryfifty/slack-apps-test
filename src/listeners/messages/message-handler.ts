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
import { SlackChatHistoryRetriever } from '../../retrievers/slackChatHistoryRetriever';
import messageConversation from '../../blocks/messageConversation';

const messageHandler = async ({ context, message, event, say, client }) => {
  // console.log('Message received', event);
  /**
   * TODO:: Bug Fix
   * Currently, the bot's second message type is message_changed so there's error commig out.
   */
  if (
    message.channel_type === 'im'
    && event.subtype !== 'bot_message'
    && !message.message?.bot_id
  ) {
    // console.log('Message is from App Home', event);
    console.log('Message is from App Home', message);

    try {
      const msgFromEvent = event.text;
      const cleanedText = msgFromEvent.replace(/<@[\w\d]+>\s*/, '');

      // console.log('msgFromEvent', cleanedText);

      if (cleanedText.length !== 0) {
        // Initial message indicating bot is typing
        const typingMessage = await say({
          text: 'Bot is typing...',
          thread_ts: message.ts,
        });

        // Load vector store from local(test purpose)
        // const directory = path.resolve(process.cwd(), 'src/data/faiss_index');

        // // Load the vector store from the directory
        // const loadedVectorStore = await FaissStore.loadFromPython(
        //   directory,
        //   new OpenAIEmbeddings(),
        // );

        /**
         * This way is also sucks because It's too over simplified.
         */
        const vectorStore = await QdrantVectorStore.fromExistingCollection(new OpenAIEmbeddings(), {
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
          collectionName: 'notion_test',
        });

        // Search for the most similar document
        // const result = await loadedVectorStore.similaritySearch('login', 2);

        const ContextRetriever = vectorStore.asRetriever();
        const prompt = await pull<ChatPromptTemplate>('rag-macdal-starter');

        console.log('prompt', prompt);

        const llm = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
        const ragChain = await createStuffDocumentsChain({
          llm,
          prompt,
          outputParser: new StringOutputParser(),
        });

        const chatHistoryRetriever = new SlackChatHistoryRetriever({
          slackApp: client,
          channel: event.channel,
          ts: event.ts || event.thread_ts,
        }).pipe(formatDocumentsAsString);

        /**
         * Get slack message history
         *
         * TODO:: Remember that slack history message limit is tier 3
         * ( 50 messages per minute per channle? per user? per account? per bot?)
         */

        // console.log('Thread messages:', slackConversations.messages);

        const result = await ragChain.invoke({
          chat_history: await chatHistoryRetriever.invoke(cleanedText),
          context: await ContextRetriever.invoke(cleanedText),
          question: cleanedText,
        });

        const slackifiedResult = slackify(result);

        // Update the initial message with the result
        await client.chat.update({
          channel: event.channel,
          ts: typingMessage.ts,
          // text: result,
          blocks: messageConversation(slackifiedResult),
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
};

export default messageHandler;
