import { App } from '@slack/bolt';
import { Express, Request, Response } from 'express';

import { supabaseClient } from '../services';

const getTeams = async (slackApp) => {
  const slackTeam = await slackApp.client.auth.test();

  // const slackTeamName = slackTeam.team;
  // const slackTeamId = slackTeam.team_id;

  // get supabase team table with teamId

  const { data: slackConnections, error: slackConnectionsError } = await supabaseClient.from('SlackConnections').select().eq('slack_team_id', slackTeam.team_id);

  // if not exist, create new team
  if (slackConnectionsError) {
    throw new Error(`Error getting teams: ${slackConnectionsError.message}`);
  }

  if (slackConnections.length === 0) {
    const { data: newTeam, error: newTeamError } = await supabaseClient.from('Teams').insert([
      {
        name: slackTeam.team,
      },
    ]).select().single();

    if (newTeamError) {
      throw new Error(`Error creating team: ${newTeamError.message}`);
    }

    console.log(newTeam);

    // @ts-ignore
    const teamId = newTeam.id;

    // Integration 생성
    const { data: newIntegration, error: newIntegrationError } = await supabaseClient.from('Integrations').insert([
      {
        team_id: teamId,
        type: 'notion',
      },
    ]).select().single();

    if (newIntegrationError) {
      // 팀 생성 취소 (롤백)
      await supabaseClient.from('teams').delete().eq('id', teamId);
      throw new Error(`Error creating integration: ${newIntegrationError.message}`);
    }

    // TODO: Should make type for newIntegration
    // @ts-ignore
    const integrationId = newIntegration.id;

    // NotionConnection 생성
    const { data: newSlackConnection, error: newSlackConnectionError } = await supabaseClient.from('SlackConnections').insert([
      {
        integration_id: integrationId,
        slack_team_id: slackTeam.team_id,
        slack_team_name: slackTeam.team,
        team_id: teamId,
      },
    ]).select().single();

    if (newSlackConnectionError) {
      // Integration 및 팀 생성 취소 (롤백)
      await supabaseClient.from('integrations').delete().eq('id', integrationId);
      await supabaseClient.from('teams').delete().eq('id', teamId);
      throw new Error(`Error creating notion connection: ${newSlackConnectionError.message}`);
    }

    console.log('Team and integration created successfully:', newTeam, newIntegration, newSlackConnection);

    return newSlackConnection;
  }
  console.log('Team already exists:', slackConnections);
  return slackConnections[0];
};

const controllers = (app: Express, slackApp: App) => {
  app.get('/notion/callback', async (req: Request, res: Response) => {
    // console.log(req);

    const { code, state } = req.query; // state에 user_id가 저장되어 있음

    const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
    const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI;

    // encode in base 64
    // Notion OAuth token 교환
    try {
      const { team_id, integration_id } = await getTeams(slackApp);

      // create Notion Connections

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

      const notionData = await response.json();
      console.log(notionData);

      const { access_token, workspace_name, workspace_id, workspace_icon, bot_id } = notionData;

      // create notion connection
      const { data: notionConnections, error: notionConnectionsError } = await supabaseClient.from('NotionConnections').insert([
        {
          access_token,
          workspace_name,
          workspace_id,
          workspace_icon,
          bot_id,
          integration_id,
          team_id,
        },
      ]).select().single();

      if (notionConnectionsError) {
        throw new Error(`Error creating notion connection: ${notionConnectionsError.message}`);
      } else {
        console.log(notionConnections);

        slackApp.client.chat.postMessage({
          channel: state as string,
          text: 'Notion 연동이 완료되었습니다.',
        });
      }
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
