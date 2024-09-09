import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import appHomeInitialBlocks from '../../blocks/appHome';
import supabase, {
  getNotionConnection,
  getNotionIntegrationInfo,
  getSlackConnection,
} from '../../services/supabase';

const appHomeOpenedCallback = async ({
  client,
  event,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_home_opened'>) => {
  // Ignore the `app_home_opened` event for anything but the Home tab
  if (event.tab !== 'home') return;

  try {
    /**
     * TODO:: Bring Notion and Figma connection information and
     * if it is exist, then show the information.
     */
    const slackTeam = await client.auth.test();

    const slackConnection: any = await getSlackConnection(slackTeam.team_id);

    // console.log('slackConnection', slackConnection);

    const notionConnection = await getNotionConnection(slackConnection[0].team_id);

    // console.log('notionData', notionConnection);

    const notionPages = notionConnection
      ? await getNotionIntegrationInfo(notionConnection.team_id)
      : [];

    // console.log('notionPages', notionPages);

    const state = encodeURIComponent(
      JSON.stringify({
        userId: event.user,
        slackTeamId: slackConnection[0].slack_team_id,
        teamId: slackConnection[0].team_id,
      }),
    );

    // console.log(state);

    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        blocks: appHomeInitialBlocks({
          state,
          notionConnectionStatus: !!notionConnection,
          notionPages: notionPages.map((page) => page.title),
        }),
      },
    });
  } catch (error) {
    console.error(error);
  }
};

export default appHomeOpenedCallback;
