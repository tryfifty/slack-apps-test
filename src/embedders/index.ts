// TODO: Add more embedders here
import embedder from './openAI';

const embedding = async (texts) => embedder.embedDocuments(texts);

export default embedding;
