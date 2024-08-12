import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 } from 'uuid';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const isCollectionExist = async (collectionName: string) => {
  const { exists } = await qdrant.collectionExists(collectionName);
  return exists;
};

const createCollection = async (collectionName: string) => {
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

const insertVectorData = async (collectionName: string, vectorData) => {
  await qdrant.upsert(collectionName, {
    points: [
      ...vectorData.map((data) => ({
        id: v4(),
        ...data,
      })),
    ],
  });
};

const searchVectorData = async (collectionName: string, vector) => {
  const results = await qdrant.search(collectionName, {
    vector,
    limit: 3,
  });
  return results;
};

export { isCollectionExist, createCollection, insertVectorData, deleteCollection };
