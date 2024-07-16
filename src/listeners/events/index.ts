import { App } from '@slack/bolt';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { pull } from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { StringOutputParser } from '@langchain/core/output_parsers';

import path from 'path';
import appHomeOpenedCallback from './app-home-opened';

const register = (app: App) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  app.event('app_mention', async ({ event, client }) => {
    console.log('app_mention event payload:', event);
    try {
      const msgFromEvent = event.text;
      const cleanedText = msgFromEvent.replace(/<@[\w\d]+>\s*/, '');

      console.log('msgFromEvent', cleanedText);

      if (cleanedText.length !== 0) {
        // Initial message indicating bot is typing
        const typingMessage = await client.chat.postMessage({
          channel: event.channel,
          text: 'Bot is typing...',
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
        const prompt = await pull<ChatPromptTemplate>('rlm/rag-prompt');
        const llm = new ChatOpenAI({ model: 'gpt-3.5-turbo', temperature: 0 });
        const ragChain = await createStuffDocumentsChain({
          llm,
          prompt,
          outputParser: new StringOutputParser(),
        });

        const result = await ragChain.invoke({
          context: await retriever.invoke(cleanedText),
          question: cleanedText,
        });
        console.log('result', result);

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
  });
};

export default { register };
