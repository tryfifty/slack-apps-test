interface payload {
  state?: string;
  pages?: string;
  channel?: string;
}

const msgUpdateComplete = ({ state, pages, channel }: payload) => {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🤖✨ Analysis Complete!',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Beep boop!* Your Notion data has been fully scanned, processed, and analyzed by MacDal!',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Linked Pages*: ${pages}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Everything is now up to date! MacDal is ready and waiting to chat with you about your data. 🗨️',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: ':robot_face: Want some tips? Type */macdal-help* to see what I can do!',
        },
      ],
    },
  ];

  return blocks;
};

export default msgUpdateComplete;
