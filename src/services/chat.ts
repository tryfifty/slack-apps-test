import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { pull } from 'langchain/hub';
import { formatDocumentsAsString } from 'langchain/util/document';
import slackify from 'slackify-markdown';
import { SlackChatHistoryRetriever } from '../retrievers/slackChatHistoryRetriever';
import { getSlackConnection } from './supabase';

import openaiClient from './openai';

const generateAnswer = async ({ message, team, channel, ts, client }) => {
  try {
    /**
     * TODO:: It shouldn't remove the user id from the message if it's not a bot message.
     */
    let cleanedText;

    // 정규 표현식을 사용하여 메시지에서 모든 사용자 ID를 찾습니다.
    const userIds = message.match(/<@(\w+)>/g);

    /**
     * TODO: 여기서 사용자 ID를 단순히 이름으로 대체하는 것은 너무 단순한 방법이다.
     * 나중에는 유저 목록을 관리해해야 할 것 이다
     */
    if (userIds) {
      for (const userId of userIds) {
        const user = await client.users.info({ user: userId.replace(/<@|>/g, '') });
        const userName = user.user.real_name || user.user.name;

        // 사용자 ID를 이름으로 대체합니다.
        cleanedText = message.replace(userId, `@${userName}`);
      }
    } else {
      cleanedText = message;
    }

    console.log('msgFromEvent', cleanedText);

    const slackConnection = await getSlackConnection(team as string);
    console.log('slackConnection', slackConnection);
    const { team_id } = slackConnection[0];

    const prompt = await pull<ChatPromptTemplate>('rag-macdal-starter');
    console.log('prompt', prompt);

    // const ragChain = await createStuffDocumentsChain({
    //   llm,
    //   prompt,
    //   outputParser: new StringOutputParser(),
    // });

    const chatHistoryRetriever = new SlackChatHistoryRetriever({
      slackApp: client,
      channel,
      ts,
    }).pipe(formatDocumentsAsString);

    const slackConverationHistory = await chatHistoryRetriever.invoke(cleanedText);

    console.log('slackConverationHistory', slackConverationHistory);

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

    // return slackifiedResult;
  } catch (error) {
    console.error(error);
    return 'Error occurred while generating the answer';
  }
};

export default generateAnswer;
