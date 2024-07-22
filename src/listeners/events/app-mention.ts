import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { pull } from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { StringOutputParser } from '@langchain/core/output_parsers';

import path from 'path';
import { formatDocumentsAsString } from 'langchain/util/document';
import { SlackChatHistoryRetriever } from '../../retrievers/slackChatHistoryRetriever';

const appMetionedCallback = async ({ event, client }) => {
  console.log('app_mention event payload:', event);
  try {
    const msgFromEvent = event.text;
    const cleanedText = msgFromEvent.replace(/<@[\w\d]+>\s*/, '');

    // console.log('msgFromEvent', cleanedText);

    if (cleanedText.length !== 0) {
      // const slackConversations = await client.conversations.replies({
      //   channel: event.channel,
      //   ts: event.thread_ts || event.ts, // 스레드의 부모 메시지 타임스탬프
      //   limit: 10, // 최근 10개의 메시지만 가져오기
      // });

      // const chatHistory = slackConversations.messages
      //   .map((message) => {
      //     if (message.bot_id && message.bot_id === 'B07B1LA8VU7') {
      //       return `AI(You) : ${message.text}`;
      //     }
      //     return `User #(${message.user}) : ${message.text}`;
      //   })
      //   .join('\n');

      // Initial message indicating bot is typing
      const typingMessage = await client.chat.postMessage({
        channel: event.channel,
        text: 'Bot is typing...',
        thread_ts: event.thread_ts || event.ts,
      });

      // TODO:: Load the vector store from the local (Test purpose only)
      const directory = path.resolve(process.cwd(), 'src/data/faiss_index');

      // Load the vector store from the directory
      const loadedVectorStore = await FaissStore.loadFromPython(
        directory,
        new OpenAIEmbeddings(),
      );

      // Search for the most similar document
      // const result = await loadedVectorStore.similaritySearch('login', 2);

      const retriever = loadedVectorStore.asRetriever();
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
        event,
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
        context: await retriever.invoke(cleanedText),
        question: cleanedText,
      });

      // Update the initial message with the result
      await client.chat.update({
        channel: event.channel,
        ts: typingMessage.ts,
        text: result,
      });
    }
  } catch (error) {
    console.error(error);
  }
};

export default appMetionedCallback;
