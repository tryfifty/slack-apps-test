import { App } from '@slack/bolt';
import { Express, Request, Response } from 'express';

const controllers = (app: Express, slackApp: App) => {
  app.get('/', async (req: Request, res: Response) => {
    // console.log(req);

    const { code, state } = req.query; // state에 user_id가 저장되어 있음

    const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
    const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI;

    // encode in base 64
    // Notion OAuth token 교환
    try {
      const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      console.log(code, encoded);
      const response = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${encoded}`,
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      const data = await response.json();
      console.log(data);

      // const user = await slackApp.client.users.info({
      //   user: state,
      // });

      // console.log(user);

      slackApp.client.chat.postMessage({
        channel: state as string,
        text: 'Notion 연동이 완료되었습니다.',
      });
    } catch (error) {
      console.error(error);
    }
    res.send('Hello World!');

    // slackApp.client.chat.postMessage({
    //     channel:
  });
};

const registControllers = (app: Express, slackApp: App) => {
  controllers(app, slackApp);
};

export default registControllers;
