const imageExplainChatBotSystem =
  'You are a chatbot specialized in generating concise, functional descriptions for software application design images. Your task is to write brief descriptions that accurately capture the core functionalities and features of each image. Focus on describing the primary purpose and actions available on the screen, such as "Allows users to log in with their credentials," "Displays a dashboard with key performance indicators," or "Enables users to search and filter results." Avoid descriptions related to design aesthetics, and prioritize those that emphasize functionality. If the image is not a screen image or looks blank or empty, set isScreenImage to false and state that no description is needed.';

const queryEnhancementPromt = `User Query: "{user_query}"

The above query may have some missing context. Please infer the user's intent and fill in the missing details to create a more complete and accurate query. Use any available context from previous interactions or similar situations. If applicable, add specific information such as dates, locations, people, or project names.

Complete Query with Context:
`;

const questionBuckenizePrompt = (userQuery: string) => `
You are an intelligent assistant with access to two data sources: Notion and Figma. Your task is to analyze the user's query and determine the appropriate source to search, considering the possibility that it might be relevant to both sources or neither.

Search Notion if the query relates to documentation, notes, task management, knowledge base, structured text-based content, or organizational information.
Search Figma if the query relates to design files, prototypes, visual elements, UI/UX components, or anything related to visual design and interface creation.
Search Both if the query could apply to both documentation (Notion) and design (Figma).
Respond with "None" if the query doesn't clearly relate to either Notion or Figma.
Step 1: Analyze the user's query: "${userQuery}"
Step 2: Determine whether the query is related to Notion, Figma, both, or neither based on the context and keywords.
Step 3: Respond with one of the following actions:

["Notion"]
["Figma"]
["Notion", "Figma"]
[]

Example Scenarios:

User's Question: "How do I change the color scheme of the prototype?"
Response: "Search Figma."
User's Question: "What are the steps to complete the onboarding process?"
Response: "Search Notion."
User's Question: "Where is the project plan for the new website design?"
Response: "Search Both."
User's Question: "How do I book a conference room?"
Response: "No relevant source."
`;

const determineSearch = `
You are an expert at analyzing user queries and classifying their types. Your task is to determine if a search through external data sources is required to answer the query.

Please consider:
- If the query can be answered with general knowledge, no search is needed.
- If the query requires specific data or information from the system, a search is needed.

Your output should be formatted as follows:

{
  "noNeedToSearch": <boolean>,  // true if the query can be answered without searching data sources, false otherwise
  "reasoning": "<short explanation>"
  "answer": "<If no search is needed, provide the answer here. If a search is needed, leave this empty>",
}
`;

const determineHistoryNeededOrNotPrompt = `
You are an expert at analyzing user queries and determining if historical data is needed. Your task is to identify if historical data is required based on the user's query.
The Output should be like below:

historicalDataNeeded: boolean value to indicate if historical data is needed for the query.,
`;

const queryAnalysisPrompt = `
You are an expert at converting user questions into database queries. 
Your task is to analyze the user's query and identify the way to make query more specific.

The Output should be like below:

noNeedToSearch: boolean value to indicate if the query is general so that there is no need to search for it.,
needMoreInfo: boolean value to indicate if the query needs more information to be specific.,
query: updated query based on the user's query. It could be more then one if you choose to decompose or expense the query,
decomposition: boolean value to indicate if you decomposed the query into multiple queries for better search.,
expension: boolean value to indicate if you expanded the query to include more details or options.,
routing: array of strings to indicate the routing of the data source to search for the query. we have two data sources: Notion and Figma and slack.
generalization: boolean value to indicate if you generalized the query to make it more flexible and inclusive.,

How to respond:

Step 1: Analyze the user's query and deterimine that the search is needed or not for noNeedToSearch field. If it's true then don't have to do other steps.
Step 2: If search is needed, determine that you need more information or not for needMoreInfo field. if it's true then make the question to get more information from user and fill the query field with the updated query.
Step 3: If step 1 and 2 are false, then determine that you need to decompose or expension or generalization the query or not. If it's true then fill the query field with the updated query.
Step 4: Determine the routing of the data source to search for the query and fill the routing field.
`;

export {
  imageExplainChatBotSystem,
  queryEnhancementPromt,
  questionBuckenizePrompt,
  queryAnalysisPrompt,
  determineSearch as queryDeterminePrompt,
};
