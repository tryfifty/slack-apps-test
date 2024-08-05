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

const msgUpdating = (status, { state, pages, channel }: payload) => {
  console.log('status', status);

  let blocks;
  if (status === Status.CONNECTING) {
    blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Updating Notion workspace...',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: ':spinner:  Updating Data with Notion',
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
          text: '*Updated* :clap:',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `Updated Page: ${pages}`,
            emoji: true,
          },
        ],
      },
    ];
  }

  return blocks;
};

export default msgUpdating;

export { Status };
