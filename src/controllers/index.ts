import { App } from '@slack/bolt';
import { Express, Request, Response } from 'express';
import path from 'path';

import fs from 'fs';
import { Queue, Worker } from 'bullmq';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { Document } from '@langchain/core/documents';
import { supabaseClient } from '../services';
import msgConnection from '../blocks/messageConnect';
import appHomeInitialBlocks from '../blocks/appHome';
import messageHelp from '../blocks/messageHelp';
import {
  deleteNotionIntegrationInfo,
  getFigmaConnection,
  getNotionConnection,
  getSlackConnection,
  getSlackConnectionById,
  getTeamBySlackId,
  insertFigmaConnection,
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
import { addjob, addQueue } from '../data-processor/processor';
import { beta, chat } from '../services/openai';
import { imageExplainChatBotSystem } from '../constanats/prompts';

// import { QdrantVectorStore } from '@langchain/qdrant';

const isScreenSize = (width) => {
  /**
   * Desktop Sizes
   */
  if (width === 1280) {
    return true;
  }
  if (width === 1512) {
    return true;
  }
  if (width === 1728) {
    return true;
  }
  if (width === 1440) {
    return true;
  }
  if (width === 1920) {
    return true;
  }

  /**
   * Tablet Sizes
   */
  if (width === 834) {
    return true;
  }
  if (width === 744) {
    return true;
  }

  if (width === 1024) {
    return true;
  }

  if (width === 1440) {
    return true;
  }

  /**
   * Phone Sizes
   */
  if (width === 360) {
    return true;
  }
  if (width === 414) {
    return true;
  }
  if (width === 320) {
    return true;
  }
  if (width === 375) {
    return true;
  }
  if (width === 428) {
    return true;
  }
  if (width === 390) {
    return true;
  }
  if (width === 393) {
    return true;
  }
  if (width === 430) {
    return true;
  }
  return false;
};

const filterframes = (frames: any[]) => {
  let filteredFrames = [];
  for (const frame of frames) {
    if (frame.type === 'FRAME') {
      // console.log(frame);
      const { width } = frame.absoluteBoundingBox;
      // const { height } = frame.absoluteBoundingBox;

      if (isScreenSize(width)) {
        filteredFrames.push(frame);
      } else if (frame.children) {
        const filtered = filterframes(frame.children);
        filteredFrames = [...filteredFrames, ...filtered];
      }
    }
  }
  return filteredFrames;
};

const controllers = (app: Express, slackApp: App) => {
  app.get('/notion/callback', async (req: Request, res: Response) => {
    // console.log(req);

    const { code, state } = req.query; // state에 user_id가 저장되어 있음

    // TODO:: Input Validation
    if (!true) {
      console.error('Invalid Input');
    }

    const { userId, teamId, slackTeamId } = JSON.parse(decodeURIComponent(state as string));

    // console.log(userId, teamId, slackTeamId);

    try {
      const coneciton = await getSlackConnection(slackTeamId);

      if (coneciton.length === 0) {
        console.error('No Slack Connection');
        return;
      }

      const { token } = coneciton[0].installation.bot;

      await slackApp.client.chat.postMessage({
        token,
        channel: userId as string,
        blocks: msgConnection(),
      });

      const notionData = await getAccessToken(code);

      // console.log(notionData);

      const notionConnection = await upsertNotionConnection({
        notionData,
        team_id: teamId,
      });

      // console.log(notionConnection);

      const { access_token } = notionConnection;

      const notionPages = await getNotionPages(access_token);
      await slackApp.client.chat.postMessage({
        token,
        channel: userId as string,
        blocks: msgUpdateStart(),
      });

      /**
       * TODO: Should improve updating logic. (ig, versioning maybe?)
       */
      if (isCollectionExist(teamId as string)) {
        console.log('Collection Delete');
        await deleteCollection(teamId as string);
      }

      await createCollection(teamId as string);

      // const queueId = `notion-data-${teamId}`;
      const queue = new Queue('notion');
      // const queue = await addQueue(
      //   queueId,
      //   notionPages.length,
      //   slackApp.client,
      //   token,
      //   userId as string,
      // );

      const connection = {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      };

      const worker = new Worker(
        'notion',
        async (job) => {
          // Will print { foo: 'bar'} for the first job
          // and { qux: 'baz' } for the second.
          // console.log(`Processing job ${job.data} of team ${job.data.teamId}`);
          // console.log(job.data);

          console.log(`Processing job ${job.data.pages.length} of team ${job.data.teamId}`);

          const { access_token: notionToken, pages } = job.data;

          // const { teamId, access_token: notionToken, page } = job.data;

          for (const page of pages) {
            console.log(`Processing ${page.object} ${page.id}`);

            if (page.object === 'page') {
              // try {
              const pageData: Document[] = await notionDataLoader(notionToken, page);

              // console.log(pageData);

              const pageDocs = await split(pageData);

              // console.log(pageDocs);

              const texts = pageDocs.map((doc) => doc.pageContent.trim() || '');

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
              await insertVectorData(`${teamId}-source`, vectorData);
              // console.log(`page ${page.id} inserted`);
              // } catch (error) {
              //   console.error(error);
              // }
            }
          }

          // console.log(vectorData);

          // // // fs.writeFileSync(`data/${team_id}-vectors.json`, JSON.stringify(vectorData));
          // console.log('inserted vector data');
        },
        {
          connection,
          concurrency: 1,
          removeOnComplete: { count: 0 },
          autorun: true,
        },
      );

      worker.on('completed', async (job) => {
        slackApp.client.chat.postMessage({
          token,
          channel: userId as string,
          text: 'Notion workspace connection made successfully!',
          blocks: msgUpdateComplete({
            state: userId as string,
            pages: '',
          }),
        });

        await worker.close();
      });

      queue.add('notion', { teamId, access_token, pages: notionPages });

      res.sendFile(path.join(__dirname, '../views/notionConnected.html'));

      // redirect to /update/notion with channel id and access token with post method
      // res.redirect(`/update/notion?team_id=${teamId}&user=${userId}&connection=${coneciton[0].id}`);
    } catch (error) {
      console.error(error);
    }
  });

  app.get('/figma/callback', async (req: Request, res: Response) => {
    // console.log(req);

    const { code, state } = req.query; // state에 user_id가 저장되어 있음

    const { userId, teamId, slackTeamId } = JSON.parse(decodeURIComponent(state as string));

    const client_id = process.env.FIGMA_CLIENT_ID;
    const client_secret = process.env.FIGMA_CLIENT_SECRET;
    const redirect_uri = 'https://great-yaks-wish.loca.lt/figma/callback';

    console.log(client_id, client_secret, redirect_uri);

    try {
      // Exchange the authorization code for an access token
      const response = await fetch('https://www.figma.com/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id,
          client_secret,
          redirect_uri,
          code: code as string,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for access token');
      }

      const data = await response.json();
      const accessToken = data.access_token;
      console.log('Data', data);

      // Get the current date and time
      const currentDate = new Date();

      // Calculate the expiration date by adding the expires_in seconds
      const expirationDate = new Date(currentDate.getTime() + data.expires_in * 1000);

      insertFigmaConnection({
        team_id: teamId as string,
        access_token: accessToken,
        figma_user_id: data.user_id as string,
        expires_at: expirationDate,
        refresh_token: data.refresh_token,
      });

      // You can now store the access token or perform further operations

      res.redirect(`/figmaConnect.html?team_id=${teamId}`);
    } catch (error) {
      console.error('Error exchanging code for access token:', error);
      res.status(500).send('An error occurred while retrieving the access token');
    }
  });

  app.post('/figma/getPages', async (req: Request, res: Response) => {
    const { linkType, extractedID, teamId } = req.body;

    const figmaConnection = await getFigmaConnection(teamId as string);

    const { access_token } = figmaConnection[0];

    let response;
    if (linkType === 'team') {
      response = await fetch(`https://api.figma.com/v1/teams/${extractedID}/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      });

      response = await response.json();

      const { name: teamName, projects } = response;

      let projectList = [];

      for (const project of projects) {
        const result = await fetch(`https://api.figma.com/v1/projects/${project.id}/files`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access_token}`,
          },
        });

        const projectData = await result.json();

        projectList = [...projectList, projectData];
      }
      res.json(projectList);
    } else {
      response = await fetch(`https://api.figma.com/v1/files/${extractedID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      });

      response = await response.json();
      res.json(response);
    }
  });

  app.post('/figma/share', async (req: Request, res: Response) => {
    const { teamId, shardPages: figmaPages } = req.body;

    const figmaConnection = await getFigmaConnection(teamId as string);

    const { access_token } = figmaConnection[0];

    const queue = new Queue('figma');
    // const queue = await addQueue(
    //   queueId,
    //   notionPages.length,
    //   slackApp.client,
    //   token,
    //   userId as string,
    // );

    const connection = {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    };

    const worker = new Worker(
      'figma',
      async (job) => {
        // Will print { foo: 'bar'} for the first job
        // and { qux: 'baz' } for the second.
        // console.log(`Processing job ${job.data} of team ${job.data.teamId}`);
        console.log(job.data);
        console.log(`Processing job ${job.data.pages.length} of team ${job.data.teamId}`);

        const { data } = job;

        console.log(data.pages);
        try {
          for (const file of data.pages) {
            const response = await fetch(`https://api.figma.com/v1/files/${file.id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${access_token}`,
              },
            });

            const figmaData = await response.json();

            const pages = figmaData.document.children;

            const docs = [];

            for (const page of pages) {
              const frames = page.children;

              /**
               * TODO: Should be support much more screen sizes
               */
              const filteredFrames = filterframes(frames);

              console.log(`${page.name} has ${filteredFrames.length} screens`);

              // eslint-disable-next-line no-unreachable-loop
              for (const frame of filteredFrames) {
                /**
                 * TODO:: Can send multiple ids to get multiple images
                 */
                const imageResponse = await fetch(
                  `https://api.figma.com/v1/images/${file.id}?ids=${frame.id}`,
                  {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${access_token}`,
                    },
                  },
                );
                const imageData = await imageResponse.json();

                const descResObject = z.object({
                  isScreenImage: z.boolean(),
                  descriptions: z.array(z.string()),
                });

                try {
                  const completion = await beta.chat.completions.parse({
                    model: 'gpt-4o-mini',
                    messages: [
                      {
                        role: 'system',
                        content: imageExplainChatBotSystem,
                      },
                      {
                        role: 'user',
                        content: [
                          {
                            type: 'text',
                            text: `This Image name is ${frame.name}`,
                          },
                          {
                            type: 'image_url',
                            image_url: {
                              url: imageData.images[frame.id],
                            },
                          },
                        ],
                      },
                    ],
                    response_format: zodResponseFormat(descResObject, 'description'),
                  });
                  // console.log(completion.choices[0]);
                  const desciptions = completion.choices[0].message;
                  // console.log(desciptions);
                  if (desciptions.parsed) {
                    // console.log(desciptions.parsed);

                    if (desciptions.parsed.isScreenImage) {
                      // 일단 데이터 구조 짜고 아마도 Document 객체?
                      const newData = new Document({
                        pageContent: desciptions.parsed.descriptions.join('\n'),
                        metadata: {
                          source: 'figma',
                          figmaId: frame.id,
                          figmaName: frame.name,
                          figmaPageId: page.id,
                          figmaPageName: page.name,
                          figmaFileId: file.id,
                          figmaFileName: file.name,
                          imageUrl: imageData.images[frame.id],
                        },
                      });

                      docs.push(newData);
                    }
                  } else if (desciptions.refusal) {
                    // handle refusal
                    console.log(desciptions.refusal);
                  }
                } catch (e) {
                  if (e.constructor.name === 'LengthFinishReasonError') {
                    // Retry with a higher max tokens
                    console.log('Too many tokens: ', e.message);
                  } else {
                    // Handle other exceptions
                    console.log('An error occurred: ', e.message);
                  }
                }
              }
            }

            console.log(docs);

            const texts = docs.map((doc) => doc.pageContent.trim() || '');

            const vectors = await embedding(texts);

            const vectorData = [];

            for (let j = 0; j < docs.length; j += 1) {
              const doc = docs[j];
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

            insertVectorData(`${teamId}-source`, vectorData);
            // console.log(figmaData[0].id);

            // const doc = figmaData[0].document;
            // console.log(figmaData);
            // fs.writeFileSync(`data/${teamId}-${page.id}.json`, JSON.stringify(figmaData));
          }
        } catch (error) {
          console.error(error);
        }
      },
      {
        connection,
        concurrency: 1,
        removeOnComplete: { count: 0 },
        autorun: true,
      },
    );

    worker.on('completed', async (job) => {
      // slackApp.client.chat.postMessage({
      //   token,
      //   channel: userId as string,
      //   text: 'Notion workspace connection made successfully!',
      //   blocks: msgUpdateComplete({
      //     state: userId as string,
      //     pages: '',
      //   }),
      // });

      await worker.close();
    });

    queue.add('figma', { teamId, access_token, pages: figmaPages });

    // res.redirect(`/figmaConnected.html`);
  });

  app.get('/update/notion', async (req: Request, res: Response) => {
    const { team_id, user, connection } = req.query;

    // TODO: Input Validation
    if (!true) {
      console.error('Invalid Input');
    }

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
