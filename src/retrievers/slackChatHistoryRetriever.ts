import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
// import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
// import { App } from '@slack/bolt';

export interface CustomRetrieverInput {
  slackApp: any;
  channel: string;
  ts: any;
}

export class SlackChatHistoryRetriever {
  lc_namespace = ['langchain', 'retrievers'];

  slackApp: any;

  channel: string;

  ts: any;

  constructor(fields?: CustomRetrieverInput) {
    this.slackApp = fields?.slackApp;
    this.channel = fields?.channel;
    this.ts = fields?.ts;
  }

  async _getRelevantDocuments(
    query: string,
    // runManager: CallbackManagerForRetrieverRun,
  ): Promise<Document[]> {
    // 여기서 쿼리를 보고 기존의 메세지가 필요할지 안할지 판단할 수 있을까?

    // if ts is null then get the latest message from the channel

    let slackConversations;

    if (this.ts === null) {
      console.log('ts is null', this.channel);
      slackConversations = await this.slackApp.conversations.history({
        channel: this.channel,
        latest: this.ts,
        limit: 1,
      });
    } else {
      slackConversations = await this.slackApp.conversations.replies({
        channel: this.channel,
        ts: this.ts, // 스레드의 부모 메시지 타임스탬프
        limit: 10, // 최근 10개의 메시지만 가져오기
      });
    }

    /**
     * TODO:: bot_id가 constant로 정의되어 있어서 이 부분을 수정해야 함.
     */
    const chatHistory = slackConversations.messages.map((message) => {
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
