import { Queue, QueueEvents, Worker } from 'bullmq';

import embedding from '../embedders';
import notionDataLoader from '../loaders/notionDataLoader';
import { insertVectorData } from '../services/qdrant';
import split from '../splitters/notionDataSplitter';
import msgUpdateComplete from '../blocks/messageUpdateComplete';

const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
};

const notionDataProcesse = async (job) => {};

async function addjob(queue: any, id: any, data: any) {
  await queue.add(id, data);
}

async function runworker(queueId) {
  const worker = new Worker(
    queueId,
    async (job) => {
      // Will print { foo: 'bar'} for the first job
      // and { qux: 'baz' } for the second.
      console.log(`Processing job ${job.data.page.object} of team ${job.data.teamId}`);

      // const { teamId, access_token: notionToken, page } = job.data;

      // const notionData: Document[] = await notionDataLoader(notionToken, page);

      // console.log(notionData);

      // const pageDocs = await split(notionData);

      // const texts = pageDocs.map((doc) => doc.pageContent);

      // const vectors = await embedding(texts);

      // const vectorData = [];

      // for (let j = 0; j < pageDocs.length; j += 1) {
      //   const doc = pageDocs[j];
      //   const vector = vectors[j];

      //   // console.log(doc.metadata);

      //   vectorData.push({
      //     vector,
      //     payload: {
      //       content: doc.pageContent,
      //       metadata: doc.metadata,
      //     },
      //   });
      // }

      // console.log(vectorData);

      // // // fs.writeFileSync(`data/${team_id}-vectors.json`, JSON.stringify(vectorData));
      // await insertVectorData(teamId as string, vectorData);
      // console.log('inserted vector data');
    },
    {
      connection,
      concurrency: 3,
      removeOnComplete: { count: 0 },
      autorun: true,
    },
  );

  return worker;
}

async function addQueue(queueId, totalJobs, slackClient, slackToken, channel) {
  const queue = new Queue(queueId);
  const queueEvents = new QueueEvents(queueId);
  let completedJobs = 0;

  const worker = await runworker(queueId);

  // 작업 완료 이벤트 핸들링
  queueEvents.on('completed', async ({ jobId }) => {
    console.log(`작업 ${jobId}이 완료되었습니다.`);
    completedJobs += 1;

    console.log(completedJobs);
    if (completedJobs === totalJobs) {
      console.log(`${queueId}의 모든 작업이 완료되었습니다.`);

      slackClient.chat.postMessage({
        token: slackToken,
        channel,
        text: 'Notion workspace connection made successfully!',
        blocks: msgUpdateComplete({
          state: channel,
          pages: '',
        }),
      });

      await worker.close();

      // 큐 삭제
      await queue.close();
      // await queue.obliterate({ force: true });
      console.log(`${queueId} 큐가 삭제되었습니다.`);

      // 이벤트 리스너 제거
      queueEvents.removeAllListeners();
      console.log(`${queueId}의 모든 이벤트 리스너가 제거되었습니다.`);
    }
  });

  return queue;
}

// const runworker = async () => {
//   await worker.run();
// };

export default runworker;
export { addQueue, addjob };
