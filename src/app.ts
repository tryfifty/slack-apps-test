import { App, LogLevel } from '@slack/bolt';
import * as dotenv from 'dotenv';
import Express from 'express';
import registerListeners from './listeners';
import registControllers from './controllers';
import {
  createNewSlackConnection,
  deleteSlackConnection,
  getSlackConnection,
  upsertSlackConnection,
} from './services/supabase';
import msgWelcome from './blocks/messageWelcome';

// dotenv.config();

/** Initialization */
// const slackApp = new App({
//   token: process.env.SLACK_BOT_TOKEN,
//   socketMode: true,
//   appToken: process.env.SLACK_APP_TOKEN,
//   logLevel: LogLevel.INFO,
// });

// For development purposes only
const tempDB = new Map();

const slackApp = new App({
  logLevel: LogLevel.DEBUG,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: 'my-state-secret',
  redirectUri: 'https://meerkat-valid-skylark.ngrok-free.app/slack/oauth_redirect',
  scopes: [
    'app_mentions:read',
    'channels:history',
    'chat:write',
    'commands',
    'groups:history',
    'im:history',
  ],
  installationStore: {
    storeInstallation: async (installation) => {
      /**
       *  Org-wide installation
       *  We are not currently supporting enterprise installations
       * */
      // if (installation.isEnterpriseInstall && installation.enterprise !== undefined) {
      //   tempDB.set(installation.enterprise.id, installation);
      //   return;
      // }
      // Single team installation
      try {
        if (installation.team !== undefined) {
          console.log('installation', installation);

          const team = await getSlackConnection(installation.team.id);
          console.log('team', team);
          if (team.length === 0) {
            console.log('Creating new team');
            await createNewSlackConnection(
              installation.team.id,
              installation.team.name,
              installation,
            );
          } else {
            // upsert slack connection

            // TODO: Update the installation data is needed? don't know yet.
            console.log('Update installation');
            // await upsertSlackConnection(team[0].id, installation);
          }

          await slackApp.client.chat.postMessage({
            token: installation.bot.token,
            channel: installation.incomingWebhook.channelId || installation.user.id,
            text: 'Welcome to MacDal! Thanks for installing the app!',
            blocks: msgWelcome(),
          });
        }
      } catch (error) {
        console.error(error);
        throw new Error('Failed saving installation data to installationStore');
      }
    },
    fetchInstallation: async (installQuery) => {
      /**
       * Org-wide installation lookup
       * We are not currently supporting enterprise installations
       *  */
      // if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
      //   return tempDB.get(installQuery.enterpriseId);
      // }
      // Single team installation lookup
      if (installQuery.teamId !== undefined) {
        const connection = await getSlackConnection(installQuery.teamId);
        return connection[0].installation;
      }
      throw new Error('Failed fetching installation');
    },
    deleteInstallation: async (installQuery) => {
      /**
       * Org-wide installation deletion
       * We are not currently supporting enterprise installations
       *  */
      // if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
      //   tempDB.delete(installQuery.enterpriseId);
      //   return;
      // }
      // Single team installation deletion
      if (installQuery.teamId !== undefined) {
        await deleteSlackConnection(installQuery.teamId);
        return;
      }
      throw new Error('Failed to delete installation');
    },
  },
  installerOptions: {
    // If true, /slack/install redirects installers to the Slack Authorize URL
    // without rendering the web page with "Add to Slack" button
    directInstall: false,
    redirectUriPath: '/slack/oauth_redirect',
  },
});

/** Register Listeners */
registerListeners(slackApp);

const expressApp = Express();

registControllers(expressApp, slackApp);

expressApp.listen(8080, () => {
  console.log('Express server is running on http://localhost:8080');
});

/** Start Bolt App */
(async () => {
  try {
    await slackApp.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running! ⚡️');
  } catch (error) {
    console.error('Unable to start App', error);
  }
})();
