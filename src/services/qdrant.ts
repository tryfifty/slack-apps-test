import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 } from 'uuid';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const isCollectionExist = async (collectionName: string) => {
  console.log(`Checking if collection ${collectionName} exists...`);
  try {
    const { exists } = await qdrant.collectionExists(collectionName);
    return exists;
  } catch (e) {
    console.log(e);
    return false;
  }
};

const createCollection = async (collectionName: string) => {
  console.log(`Creating collection ${collectionName}...`);
  await qdrant.createCollection(collectionName, {
    vectors: {
      size: 1536, // OpenAIEmbeddings의 벡터 크기
      distance: 'Cosine', // 거리 측정 방법
    },
  });
};

const deleteCollection = async (collectionName: string) => {
  await qdrant.deleteCollection(collectionName);
};

const insertVectorData = async (collectionName: string, vectorData: any[]) => {
  if (!(await isCollectionExist(collectionName))) {
    await createCollection(collectionName);
  }

  const BATCH_SIZE = 1000; // 한 배치당 데이터 수
  for (let i = 0; i < vectorData.length; i += BATCH_SIZE) {
    const batch = vectorData.slice(i, i + BATCH_SIZE);
    await qdrant.upsert(collectionName, {
      points: batch.map((data) => ({
        id: v4(),
        ...data,
      })),
    });
  }
};

// const searchByKeyword = async (collectionName: string, keyword: string) => {
//   const results = await qdrant.search(collectionName, {
//     query: keyword,
//     limit: 3,
//   });
//   return results;
// }

const searchVectorData = async (collectionName: string, vector: number[]) => {
  const results = await qdrant.search(collectionName, {
    vector,
    limit: 3,
  });

  // const results = await qdrant.search(collectionName, {
  //   vector,
  //   with_vector: true,
  // });

  return results;
};

export {
  isCollectionExist,
  createCollection,
  insertVectorData,
  deleteCollection,
  searchVectorData,
};
