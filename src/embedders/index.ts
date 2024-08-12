// TODO: Add more embedders here
import embedder from './openAI';

// const embedding = async (texts) => {
//   const result = await embedder.embedDocuments(texts);

//   console.log(result);
// };

const embedding = async (texts) => {
  const result = await embedder.create({
    input: texts,
    model: 'text-embedding-3-small',
  });

  const vector = result.data.map((item) => item.embedding);

  return vector;
};

export default embedding;
