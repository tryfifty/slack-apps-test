import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import appHomeInitialBlocks from '../../blocks/appHome';
import supabase from '../../services/supabase';

const appHomeOpenedCallback = async ({
  client,
  event,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_home_opened'>) => {
  // Ignore the `app_home_opened` event for anything but the Home tab
  if (event.tab !== 'home') return;

  try {
    // await client.views.publish({
    //   user_id: event.user,
    //   view: {
    //     type: 'home',
    //     blocks: appHomeInitialBlocks(event),
    //   },
    // });

    /**
     * TODO:: Bring Notion and Figma connection information and
     * if it is exist, then show the information.
     */
    const slackTeam = await client.auth.test();

    const slackConnection = await supabase
      .from('SlackConnections')
      .select()
      .eq('slack_team_id', slackTeam.team_id);

    if (slackConnection.error) {
      console.error(slackConnection.error);
      return;
    }

    const data = slackConnection.data[0];

    console.log('data', data);

    const notionConnection = await supabase
      .from('NotionConnections')
      .select()
      .eq('team_id', data.team_id);

    if (notionConnection.error) {
      console.error(notionConnection.error);
      return;
    }

    const notionData = notionConnection.data[0];

    console.log('notionData', notionData);

    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        blocks: appHomeInitialBlocks({
          user: event.user,
          notionConnectionStatus: !!notionData,
        }),
      },
    });
  } catch (error) {
    console.error(error);
  }
};

export default appHomeOpenedCallback;
