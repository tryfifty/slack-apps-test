import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

/**
 * TODO: Should improve the splitter.
 * Image, Table, Code blocks...
 * There are so many types in Notion Page.
 * How to handle them?
 */
const split = async (data: any) => {
  const separators = RecursiveCharacterTextSplitter.getSeparatorsForLanguage('markdown');
  // console.log({ separators });

  const splitter = new RecursiveCharacterTextSplitter({
    separators,
    chunkSize: 1000,
    chunkOverlap: 100,
  });

  const pageDocs = await splitter.splitDocuments(data);
  return pageDocs;
};

export default split;
