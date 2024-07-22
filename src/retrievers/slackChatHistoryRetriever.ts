import {
  BaseRetriever,
  type BaseRetrieverInput,
} from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
// import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
// import { App } from '@slack/bolt';

export interface CustomRetrieverInput extends BaseRetrieverInput {
  slackApp: any;
  event: any;
}

export class SlackChatHistoryRetriever extends BaseRetriever {
  lc_namespace = ['langchain', 'retrievers'];

  slackApp: any;

  event: any;

  constructor(fields?: CustomRetrieverInput) {
    super(fields);
    this.slackApp = fields?.slackApp;
    this.event = fields?.event;
  }

  async _getRelevantDocuments(
    query: string,
    // runManager: CallbackManagerForRetrieverRun,
  ): Promise<Document[]> {
    // 여기서 쿼리를 보고 기존의 메세지가 필요할지 안할지 판단할 수 있을까?

    const slackConversations = await this.slackApp.conversations.replies({
      channel: this.event.channel,
      ts: this.event.thread_ts || this.event.ts, // 스레드의 부모 메시지 타임스탬프
      limit: 10, // 최근 10개의 메시지만 가져오기
    });

    const chatHistory = slackConversations.messages
      .map((message) => {
        if (message.bot_id && message.bot_id === 'B07B1LA8VU7') {
          return new Document({
            pageContent: `AI(You) : ${message.text}`,
            metadata: {},
          });
        }
        return new Document({
          pageContent: `User #(${message.user}) : ${message.text}`,
          metadata: {},
        });
      });

    return chatHistory;
  }
}
