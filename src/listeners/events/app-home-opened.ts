import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

const appHomeOpenedCallback = async ({ client, event }: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_home_opened'>) => {
  // Ignore the `app_home_opened` event for anything but the Home tab
  if (event.tab !== 'home') return;

  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: ':macdal:  Ask me about your Product! ',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: "Hi! It's Macdal, the AI that supports you to find the product information quickly and easy.",
            },
          },
          {
            type: 'divider',
          },
          {
            type: 'rich_text',
            elements: [
              {
                type: 'rich_text_quote',
                elements: [
                  {
                    type: 'text',
                    text: 'Utilize me with questions like this! ',
                    style: {
                      bold: true,
                    },
                  },
                  {
                    type: 'text',
                    text: '(Samples)',
                    style: {
                      bold: true,
                      code: true,
                    },
                  },
                ],
              },
              {
                type: 'rich_text_list',
                style: 'bullet',
                indent: 0,
                border: 1,
                elements: [
                  {
                    type: 'rich_text_section',
                    elements: [
                      {
                        type: 'text',
                        text: 'Where is the user registration policy document?',
                        style: {
                          italic: true,
                        },
                      },
                    ],
                  },
                  {
                    type: 'rich_text_section',
                    elements: [
                      {
                        type: 'text',
                        text: 'What is the status of the latest feature implementation?',
                        style: {
                          italic: true,
                        },
                      },
                    ],
                  },
                  {
                    type: 'rich_text_section',
                    elements: [
                      {
                        type: 'text',
                        text: 'Can you show me the design guidelines for our new product?',
                        style: {
                          italic: true,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'divider',
          },
          {
            type: 'rich_text',
            elements: [
              {
                type: 'rich_text_quote',
                elements: [
                  {
                    type: 'text',
                    text: 'How to get started?',
                    style: {
                      bold: true,
                    },
                  },
                  {
                    type: 'text',
                    text: '\n(1) Connect your Notion workspace\n(2) Connect your Figma workspace\n(3) Start asking me questions!',
                  },
                ],
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Connect Notion',
                },
                url: `https://www.notion.so/install-integration?response_type=code&client_id=34ca5812-6be1-4e5f-9c43-8651210dbf42&redirect_uri=http%3A%2F%2Flocalhost%3A8080&owner=user&state=${event.user}`,
                action_id: 'notion_auth_button',
                style: 'primary',
              },
            ],
          },
          {
            type: 'divider',
          },
          {
            type: 'rich_text',
            elements: [
              {
                type: 'rich_text_section',
                elements: [
                  {
                    type: 'text',
                    text: 'Stop wasting time on searching no more ',
                  },
                  {
                    type: 'emoji',
                    name: 'stopwatch',
                    unicode: '23f1-fe0f',
                  },
                ],
              },
            ],
          },

        ],
      },
    });
  } catch (error) {
    console.error(error);
  }
};

export default appHomeOpenedCallback;
