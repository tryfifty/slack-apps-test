interface payload {
  state?: string;
  pages?: string;
  channel?: string;
}

const msgUpdateStart = () => {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🤖 Macdal at Work: Reading Your Notion Data...',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Our AI is hard at work processing your Notion workspace.*\nHang tight while we get everything ready for analysis!',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '⏳ Updating Data...',
            emoji: true,
          },
          style: 'primary',
          action_id: 'update_data_button',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: ":hourglass_flowing_sand: This might take a moment, but we promise it's worth the wait!",
        },
      ],
    },
  ];

  return blocks;
};

export default msgUpdateStart;
