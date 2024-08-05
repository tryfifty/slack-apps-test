const msgHelp = (user) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Hello <@${user}>, ready for ask?*`,
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':heavy_check_mark: What do people mostly ask?',
    },
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: 'Where is the user registration policy document?\nWhat is the status of the latest feature implementation?\nCan you show me the design guidelines for our new product?',
      },
    ],
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':heavy_check_mark: How to use macdal?',
    },
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '@macdal \n -Use this when you want to ask macdal at anytime\n/update notion \n -Use this command when you want to instantly update the linked data\n/ask macdal in secret\n -If you use this command in a group chat, only you will be able to see it',
      },
    ],
  },
  {
    type: 'divider',
  },
];

export default msgHelp;
