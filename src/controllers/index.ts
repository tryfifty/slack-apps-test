import { App } from '@slack/bolt';
import { Express, Request, Response } from 'express';

import fs from 'fs';
import { supabaseClient } from '../services';
import msgConnection from '../blocks/messageConnect';
import appHomeInitialBlocks from '../blocks/appHome';
import messageHelp from '../blocks/messageHelp';
import {
  deleteNotionIntegrationInfo,
  getNotionConnection,
  getSlackConnection,
  getSlackConnectionById,
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
import msgUpdateStart from '../blocks/messageUpdateStart';
import msgUpdateComplete from '../blocks/messageUpdateComplete';
// import { QdrantVectorStore } from '@langchain/qdrant';

const controllers = (app: Express, slackApp: App) => {
  app.get('/notion/callback', async (req: Request, res: Response) => {
    // console.log(req);

    const { code, state } = req.query; // state에 user_id가 저장되어 있음

    // TODO:: Input Validation
    if (!true) {
      console.error('Invalid Input');
    }

    const { userId, teamId, slackTeamId } = JSON.parse(decodeURIComponent(state as string));

    console.log(userId, teamId, slackTeamId);

    try {
      const coneciton = await getSlackConnection(slackTeamId);

      if (coneciton.length === 0) {
        console.error('No Slack Connection');
        return;
      }

      const { token } = coneciton[0].installation.bot;

      const notionData = await getAccessToken(code);

      console.log(notionData);

      const notionConnection = await upsertNotionConnection({
        notionData,
        team_id: teamId,
      });

      console.log(notionConnection);

      await slackApp.client.chat.postMessage({
        token,
        channel: userId as string,
        blocks: msgConnection(),
      });

      // redirect to /update/notion with channel id and access token with post method
      // res.redirect(`/update/notion?team_id=${teamId}&user=${userId}&connection=${coneciton[0].id}`);
    } catch (error) {
      console.error(error);
    }
  });

  app.get('/update/notion', async (req: Request, res: Response) => {
    const { team_id, user, connection } = req.query;

    // TODO: Input Validation
    if (!true) {
      console.error('Invalid Input');
    }

    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notion Integration Complete</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                text-align: center;
                padding: 50px;
            }
            h1 {
                color: #333;
            }
            .button {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                font-size: 16px;
                color: #fff;
                background-color: #4CAF50;
                border: none;
                border-radius: 5px;
                text-decoration: none;
            }
            .button:hover {
                background-color: #45a049;
            }
        </style>
    </head>
    <body>
        <h1>Notion Integration Completed!</h1>
        <a href="https://slack.com" class="button">Return to Slack</a>
    </body>
    </html>
`;

    res.send(htmlResponse);

    try {
      const slackConnection = await getSlackConnectionById(connection as string);

      const chat = await slackApp.client.chat.postMessage({
        token: slackConnection[0].installation.bot.token,
        channel: user as string,
        blocks: msgUpdateStart(),
      });

      /**
       * TODO: Should improve updating logic. (ig, versioning maybe?)
       */
      if (isCollectionExist(team_id as string)) {
        console.log('Collection Delete');
        await deleteCollection(team_id as string);
      }

      await createCollection(team_id as string);

      const notionConnection = await getNotionConnection(team_id as string);

      const { access_token } = notionConnection;
      const results = await getNotionPages(access_token);

      console.log(results.length);

      const pages = [];
      // let i = 0;

      for (const page of results) {
        // console.log(page);
        const pageId = page.id;
        const type = page.object;

        console.log(pageId, type);

        const notionData: Document[] = await notionDataLoader(access_token, page);

        // fs.writeFileSync(`data/${pageId}-v4.json`, JSON.stringify(notionData));

        console.log(`processed ${pageId} pages`);

        pages.push(...notionData);
        // i += 1;

        // if (i > 10) {
        //   break;
        // }
      }

      console.log(pages.length);

      // // filter unique page with metadata.notionId
      // const uniquePages = pages.filter((page, index, self) => {
      //   return index === self.findIndex((t) => t.metadata.notionId === page.metadata.notionId);
      // });

      // console.log(uniquePages.length);

      // for (const notionData of uniquePages) {
      // console.log(notionData.metadata.notionId);
      // console.log(notionData);

      const pageDocs = await split(pages);

      const texts = pageDocs.map((doc) => doc.pageContent);

      const vectors = await embedding(texts);

      const vectorData = [];

      for (let j = 0; j < pageDocs.length; j += 1) {
        const doc = pageDocs[j];
        const vector = vectors[j];

        // console.log(doc.metadata);

        vectorData.push({
          vector,
          payload: {
            content: doc.pageContent,
            metadata: doc.metadata,
          },
        });
      }

      // fs.writeFileSync(`data/${team_id}-vectors.json`, JSON.stringify(vectorData));
      await insertVectorData(team_id as string, vectorData);
      // }

      // console.log(uniquePages);

      // console.log(notionData);

      // // write texts to file

      /**
       * TODO: Should be improved
       */

      // await deleteNotionIntegrationInfo(team_id as string);

      // const newNotionDatas = results.map((page) => ({
      //   type: page.object,
      //   notion_id: page.id,
      //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //   title: page.properties?.title?.title[0].plain_text || '',
      //   team_id,
      //   connection_id: notionConnection.id,
      // }));

      // await insertNotionIntegrationInfo(newNotionDatas);

      // await slackApp.client.chat.update({
      //   token: slackConnection[0].installation.bot.token,
      //   channel: chat.channel,
      //   ts: chat.ts,
      //   text: 'Notion workspace connection made successfully!',
      //   blocks: msgUpdateComplete({
      //     state: user as string,
      //     pages: newNotionDatas
      //       .filter((page) => page.title !== '')
      //       .map((page) => page.title)
      //       .join(', '),
      //   }),
      // });
    } catch (error) {
      console.error(error);
    }
  });

  app.get('/testEmbedding', async (req: Request, res: Response) => {
    const texts = ['Hello, World!', 'This is a test message.'];
    const result = await embedding(texts);

    res.send(result);
  });
};

const registControllers = (app: Express, slackApp: App) => {
  controllers(app, slackApp);
};

export default registControllers;
