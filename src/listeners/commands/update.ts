import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import embedding from '../../embedders';
import notionDataLoader from '../../loaders/notionDataLoader';
import { getNotionPages } from '../../services/notion';
import {
  isCollectionExist,
  deleteCollection,
  createCollection,
  insertVectorData,
} from '../../services/qdrant';
import {
  getNotionConnection,
  deleteNotionIntegrationInfo,
  insertNotionIntegrationInfo,
} from '../../services/supabase';
import split from '../../splitters/notionDataSplitter';
import msgUpdating, { Status } from '../../blocks/messageUpdate';

const updateCallback = async ({
  ack,
  client,
  body,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs) => {
  try {
    await ack();

    const { team_id, user_id } = body;

    console.log(team_id);
    console.log(user_id);

    // TODO: Input Validation
    if (!true) {
      console.error('Invalid Input');
    }

    const msg = await client.chat.postMessage({
      channel: user_id,
      text: 'Updating Notion workspace connection...',
      blocks: msgUpdating(Status.CONNECTING, { state: user_id }),
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

    // const newNotionDatas = [
    //   {
    //     type: 'page',
    //     notion_id: '123456',
    //     title: 'Sample Page',
    //     team_id,
    //     connection_id: '123456',
    //   },
    // ];

    await client.chat.update({
      channel: msg.channel as string,
      ts: msg.ts as string,
      text: 'Notion workspace connection made successfully!',
      blocks: msgUpdating(Status.CONNECTED, {
        state: msg.channel as string,
        pages: newNotionDatas.map((page) => page.title).join(', '),
      }),
    });
  } catch (error) {
    console.error(error);
  }
};

export default updateCallback;
