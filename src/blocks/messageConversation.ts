const msgConversation = (message) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: message,
    },
  },
];

export default msgConversation;
