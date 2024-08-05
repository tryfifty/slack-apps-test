// status enum
const Status = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
};

interface payload {
  state?: string;
  pages?: string;
  channel?: string;
}

const msgConnection = (status, { state, pages, channel }: payload) => {
  console.log('status', status);

  let blocks;
  if (status === Status.CONNECTING) {
    blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Connecting to Notion workspace...',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: ':spinner:  Connecting Notion',
            },
            value: 'button_2',
            action_id: 'button_2_click',
          },
        ],
      },
    ];
  } else {
    blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Notion is Connected* :clap:',
        },
      },
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              {
                type: 'text',
                text: 'You can change it anytime at ',
              },
              {
                type: 'text',
                text: 'App Home Tab',
                style: {
                  code: true,
                },
              },
            ],
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `Connected Page: ${pages}`,
            emoji: true,
          },
        ],
      },
    ];
  }

  return blocks;
};

export default msgConnection;

export { Status };
