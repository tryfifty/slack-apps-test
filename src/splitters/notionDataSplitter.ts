import { MarkdownTextSplitter } from '@langchain/textsplitters';

/**
 * TODO: Should improve the splitter.
 * Image, Table, Code blocks...
 * There are so many types in Notion Page.
 * How to handle them?
 */
const chunkSize = 500;
const chunkOverlap = 100;

const split = async (data: any) => {
  // const separators = RecursiveCharacterTextSplitter.getSeparatorsForLanguage('markdown');
  // console.log({ separators });

  const splitter = new MarkdownTextSplitter({
    chunkSize,
  });
  const pageDocs = await splitter.splitDocuments(data);
  return pageDocs;
};

export default split;
