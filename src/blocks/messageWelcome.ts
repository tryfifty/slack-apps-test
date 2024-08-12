const msgWelcome = () => {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎉 Welcome to MacDal!',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Thank you for installing MacDal! We’re thrilled to have you onboard. 🤗',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'To get started, simply connect your data sources in the app. Click on the "Home" tab at the top to begin setting up your workspace!',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Need help or have questions? Just type */macdal-help* anytime. We’re here to assist!',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '🚀 Let’s get started and make your data work for you!',
        },
      ],
    },
  ];

  return blocks;
};

export default msgWelcome;
