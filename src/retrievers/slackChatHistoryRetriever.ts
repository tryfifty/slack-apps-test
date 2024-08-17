// import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';
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

  limit = 10;

  async retreiveChatHistory(isNew: boolean, user: any): Promise<string> {
    let slackConversations: { messages: any[] };

    if (isNew) {
      slackConversations = await this.slackApp.conversations.history({
        channel: this.channel,
        limit: this.limit,
      });
    } else {
      slackConversations = await this.slackApp.conversations.replies({
        channel: this.channel,
        ts: this.ts, // 스레드의 부모 메시지 타임스탬프
        limit: this.limit, // 최근 10개의 메시지만 가져오기
      });
    }

    // console.log('slackConversations', slackConversations);

    const sender = await this.slackApp.users.info({
      user,
    });

    console.log('sender', sender);

    const senderName = sender.user.real_name || sender.user.name;

    const chatHistory = await Promise.all(
      slackConversations.messages.map(async (message: { app_id: string; text: any; user: any }) => {
        if (message.app_id && message.app_id === 'A07FV37KKM3') {
          return new Document({
            pageContent: `AI(You) : ${message.text}`,
            metadata: message,
          });
        }

        let cleanedText = message.text;
        const userIds = cleanedText.match(/<@(\w+)>/g);

        if (userIds) {
          for (const userId of userIds) {
            const userInfo = await this.slackApp.users.info({
              user: userId.replace(/<@|>/g, ''),
            });

            if (!userInfo) {
              const userName = userInfo.user.real_name || userInfo.user.name;

              // 사용자 ID를 이름으로 대체합니다.
              cleanedText = cleanedText.replace(userId, `@${userName}`);
            }
          }
        }

        return new Document({
          pageContent: `User #(${senderName}) : ${cleanedText}`,
          metadata: message,
        });
      }),
    );

    const combinedContent: string = chatHistory.map((doc: Document) => doc.pageContent).join('\n');

    return combinedContent;
  }
}
