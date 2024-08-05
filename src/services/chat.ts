import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { pull } from 'langchain/hub';
import { formatDocumentsAsString } from 'langchain/util/document';
import slackify from 'slackify-markdown';
import { SlackChatHistoryRetriever } from '../retrievers/slackChatHistoryRetriever';

const generateAnswer = async ({ message, from, channel, ts, client }) => {
  try {
    /**
     * TODO:: It shouldn't remove the user id from the message if it's not a bot message.
     */
    const cleanedText = message.replace(/<@[\w\d]+>\s*/, '');

    /**
     * TODO:: Should be Improved.
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
      channel,
      ts,
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

    return slackifiedResult;
  } catch (error) {
    console.error(error);

    return 'Error occurred while generating the answer';
  }
};

export default generateAnswer;
