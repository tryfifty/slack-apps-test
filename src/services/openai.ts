import Openai from 'openai';

const openai = new Openai({
  organization: process.env.OPENAI_ORG_ID,
  project: process.env.OPENAI_PROJECT_ID,
});

const { chat, embeddings } = openai;

export default openai;
export { embeddings, chat };
