import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// const embedding = new OpenAIEmbeddings({
//   apiKey: process.env.OPENAI_API_KEY,
// });

export default client.embeddings;

// export default embedding;
