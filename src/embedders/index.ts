// TODO: Add more embedders here
import { embeddings as embedder } from '../services/openai';

// const embedding = async (texts) => {
//   const result = await embedder.embedDocuments(texts);

//   console.log(result);
// };

const embedding = async (texts) => {
  // console.log(texts);

  let result = null;

  result = await embedder.create({
    input: texts,
    model: 'text-embedding-3-small',
  });

  const vector = result?.data.map((item) => item.embedding) || [];

  return vector;
};

export default embedding;
