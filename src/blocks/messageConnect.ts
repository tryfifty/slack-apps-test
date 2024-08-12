interface payload {
  state?: string;
  pages?: string;
  channel?: string;
}

const msgConnection = () => {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Notion Successfully Connected! 🎉',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':notion: *Your Notion workspace is now linked with Slack.*',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_You can manage or change your connection anytime from the_ *Home* _tab._',
      },
    },
  ];

  return blocks;
};

export default msgConnection;
