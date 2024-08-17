import Openai from 'openai';
import { wrapOpenAI } from 'langsmith/wrappers';

const openai = new Openai({
  organization: process.env.OPENAI_ORG_ID,
  project: process.env.OPENAI_PROJECT_ID,
});

const { chat, embeddings } = wrapOpenAI(openai);

// export default openai;
export { embeddings, chat };
