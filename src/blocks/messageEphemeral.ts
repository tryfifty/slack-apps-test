const msgEmpheral = (message) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: message,
    },
  },
  {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Talk about this more',
          emoji: true,
        },
        value: message,
        action_id: 'talk-more-button',
      },
    ],
  },
];

export default msgEmpheral;
