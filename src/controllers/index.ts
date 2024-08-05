import { App } from '@slack/bolt';
import { Express, Request, Response } from 'express';

import { supabaseClient } from '../services';
import msgConnection, { Status } from '../blocks/messageConnect';
import appHomeInitialBlocks from '../blocks/appHome';
import messageHelp from '../blocks/messageHelp';
import {
  deleteNotionIntegrationInfo,
  getNotionConnection,
  getTeamBySlackId,
  insertNotionIntegrationInfo,
  upsertNotionConnection,
} from '../services/supabase';
import { getAccessToken, getNotionPages } from '../services/notion';
import notionDataLoader from '../loaders/notionDataLoader';
import split from '../splitters/notionDataSplitter';
import embedding from '../embedders';
import {
  createCollection,
  deleteCollection,
  insertVectorData,
  isCollectionExist,
} from '../services/qdrant';
// import { QdrantVectorStore } from '@langchain/qdrant';

const controllers = (app: Express, slackApp: App) => {
  app.get('/notion/callback', async (req: Request, res: Response) => {
    // console.log(req);

    const { code, state } = req.query; // state에 user_id가 저장되어 있음

    // TODO:: Input Validation
    if (!true) {
      console.error('Invalid Input');
    }

    try {
      /**
       * TODO: Get the team information from the slack (Should be changed after OAuth is done.)
       */
      const slackTeam = await slackApp.client.auth.test();

      const { connection, isNew } = await getTeamBySlackId(slackTeam.team_id, slackTeam.team);

      const { team_id, integration_id } = connection;

      // get access token for notion
      const notionData = await getAccessToken(code);

      const notionConnection = upsertNotionConnection({ notionData, team_id, integration_id });

      console.log(notionConnection);

      const result = await slackApp.client.chat.postMessage({
        channel: state as string,
        blocks: msgConnection(Status.CONNECTING, { state: state as string }),
      });

      // redirect to /update/notion with channel id and access token with post method
      res.redirect(
        `/update/notion?team_id=${team_id}&channel=${result.channel}&ts=${result.ts}&user=${state}&first=${isNew}`,
      );
    } catch (error) {
      console.error(error);
    }
  });

  app.get('/update/notion', async (req: Request, res: Response) => {
    const { team_id, channel, ts, first, user } = req.query;

    // TODO: Input Validation
    if (!true) {
      console.error('Invalid Input');
    }

    /**
     * TODO: Should improve updating logic. (ig, versioning maybe?)
     */
    if (isCollectionExist(team_id as string)) {
      console.log('Collection Delete');
      await deleteCollection(team_id as string);
    }

    await createCollection(team_id as string);

    try {
      const notionConnection = await getNotionConnection(team_id as string);

      const { access_token } = notionConnection;
      const { results } = await getNotionPages(access_token);

      for (const page of results) {
        const pageId = page.id;

        // console.log(page);

        const notionData = await notionDataLoader(access_token, pageId);

        // console.log(notionData);

        const pageDocs = await split(notionData);
        const texts = pageDocs.map((doc) => doc.pageContent);
        const vectors = await embedding(texts);

        const vectorData = [];

        for (let j = 0; j < pageDocs.length; j += 1) {
          const doc = pageDocs[j];
          const vector = vectors[j];

          vectorData.push({
            vector,
            payload: {
              content: doc.pageContent,
              metadata: doc.metadata,
            },
          });

          await insertVectorData(team_id as string, vectorData);
        }
      }

      /**
       * TODO: Should be improved
       */

      await deleteNotionIntegrationInfo(team_id as string);

      const newNotionDatas = results.map((page) => ({
        type: page.object,
        notion_id: page.id,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        title: page.properties.title.title[0].plain_text,
        team_id,
        connection_id: notionConnection.id,
      }));

      await insertNotionIntegrationInfo(newNotionDatas);

      await slackApp.client.chat.update({
        channel: channel as string,
        ts: ts as string,
        text: 'Notion workspace connection made successfully!',
        blocks: msgConnection(Status.CONNECTED, {
          state: channel as string,
          pages: newNotionDatas.map((page) => page.title).join(', '),
        }),
      });

      if (first) {
        console.log(user);

        await slackApp.client.views.publish({
          user_id: user as string,
          view: {
            type: 'home',
            blocks: appHomeInitialBlocks({
              user: channel as string,
              notionConnectionStatus: true,
            }),
          },
        });

        await slackApp.client.chat.postMessage({
          channel: channel as string,
          text: `Hello, <@${user}>, Ready to ask?`,
          blocks: messageHelp(user as string),
        });
      }
    } catch (error) {
      console.error(error);
    }

    res.send('Hello World!');
  });
};

const registControllers = (app: Express, slackApp: App) => {
  controllers(app, slackApp);
};

export default registControllers;
