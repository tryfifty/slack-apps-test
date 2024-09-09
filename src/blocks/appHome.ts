interface payload {
  user: string;
  notionConnectionStatus?: boolean;
  notionPages?: string;
}

const appHomeInitialBlocks = ({
  state,
  notionConnectionStatus,
  figmaConnectionStatus = false,
  notionPages = ['test', 'test3'],
  figmaPages = [],
}) => {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Ask me about your Product! ',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Hi! I'm Macdal, your AI assistant here to help you find product information quickly and easily. Let's get you set up!",
      },
    },
    {
      type: 'image',
      image_url:
        'https://frbcqifqitmwcfmcdvvb.supabase.co/storage/v1/object/public/public-assets/macdal-breadcom.png',
      alt_text: 'delicious tacos',
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Getting Started',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'To get started, connect your Notion and Figma workspaces to Macdal.',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Notion Workspace*',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: `${
              notionConnectionStatus
                ? ':notion: Change Notion Workspace'
                : ':notion: Connect Notion'
            }`,
          },
          url: `https://www.notion.so/install-integration?response_type=code&client_id=34ca5812-6be1-4e5f-9c43-8651210dbf42&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fnotion%2Fcallback&owner=user&state=${state}`,
          action_id: 'notion_auth_button',
        },
      ],
    },
    // ...(notionConnectionStatus && notionPages.length > 0
    //   ? [
    //       {
    //         type: 'section',
    //         text: {
    //           type: 'mrkdwn',
    //           text: '*Connected Notion Pages*:',
    //         },
    //       },
    //       {s
    //         type: 'context',
    //         elements: notionPages.map((page) => ({
    //           type: 'mrkdwn',
    //           text: `${page}`,
    //         })),
    //       },
    //     ]
    //   : []),
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Figma Workspace*',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: `${figmaConnectionStatus ? '🔗 Change Figma Workspace' : '🎨 Connect Figma'}`,
          },
          url: `https://www.figma.com/oauth?response_type=code&client_id=kgLJAtKeyl6GfypeAVLpWI&redirect_uri=https%3A%2F%2Fgreat-yaks-wish.loca.lt%2Ffigma%2Fcallback&scope=files:read&state=${state}`,
          action_id: 'figma_auth_button',
        },
      ],
    },
    ...(figmaConnectionStatus && figmaPages.length > 0
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Connected Figma Pages*:',
            },
          },
          {
            type: 'section',
            fields: figmaPages.map((page) => ({
              type: 'mrkdwn',
              text: `:art: ${page}`,
            })),
          },
        ]
      : []),
    {
      type: 'divider',
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'How to Use Macdal',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Using Macdal in a Group Chat*\n\nTo interact with Macdal in a channel, simply mention `@macdal` and start a conversation. Macdal will respond, and everyone in the channel can see the discussion.\n\n*Using Macdal in a Private DM*\n\nFor a more private interaction, send a Direct Message (DM) to Macdal. You don’t need to mention `@macdal` in a DM—just type your message, and Macdal will respond directly to you.\n\n',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: "*Important*: Macdal will reply within the thread where you mentioned it. Currently, it only remembers conversations within that specific thread. If you start a new thread or conversation, it won't recall previous discussions. However, we're planning to add this feature in the future.",
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Here are some questions you can ask me',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Product-related Questions*:',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '`"Where is the user registration policy document?"`' +
          '\n' +
          '`"Show me the latest design for the homepage"`' +
          '\n' +
          '`"What is the status of the new feature implementation?"`',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Team-related Questions*:',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '`"Who is the product owner for the registration module?"`' +
          '\n' +
          '`"Can you provide me with the team’s current workload distribution?"`' +
          '\n' +
          '`"Who is responsible for the UX design of our new app?"`',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Schedule-related Questions*:',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '`"When is the next release scheduled?"`' +
          '\n' +
          '`"Can you show me the project timeline for Q3?"`' +
          '\n' +
          '`"What are the upcoming milestones for the team?"`',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '🚀 *Ready to boost your productivity?* Stop wasting time searching and let Macdal do the work for you!',
        },
      ],
    },
  ];

  return blocks;
};

export default appHomeInitialBlocks;
