import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frbcqifqitmwcfmcdvvb.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const getTeamBySlackId = async (slackTeamId: string, slackTeamName: string) => {
  /**
   * TODO::Get the team information from the slack
   * Should be changed after OAuth is done.
   */
  //   const slackTeam = await slackApp.client.auth.test();

  const { data: slackConnections, error: slackConnectionsError } = await supabaseClient
    .from('SlackConnections')
    .select()
    .eq('slack_team_id', slackTeamId);

  if (slackConnectionsError) {
    throw new Error(`Error getting teams: ${slackConnectionsError.message}`);
  }

  // if not exist, create new team
  if (slackConnections.length === 0) {
    const { data: newTeam, error: newTeamError } = await supabaseClient
      .from('Teams')
      .insert([
        {
          name: slackTeamName,
        },
      ])
      .select()
      .single();

    if (newTeamError) {
      throw new Error(`Error creating team: ${newTeamError.message}`);
    }

    const teamId = newTeam.id;

    // Integration 생성
    const { data: newIntegration, error: newIntegrationError } = await supabaseClient
      .from('Integrations')
      .insert([
        {
          team_id: teamId,
          type: 'slack',
        },
      ])
      .select()
      .single();

    if (newIntegrationError) {
      // 팀 생성 취소 (롤백)
      await supabaseClient.from('teams').delete().eq('id', teamId);
      throw new Error(`Error creating integration: ${newIntegrationError.message}`);
    }

    // TODO: Should make type for newIntegration
    const integrationId = newIntegration.id;

    // SlackConnection Creation
    const { data: newSlackConnection, error: newSlackConnectionError } = await supabaseClient
      .from('SlackConnections')
      .insert([
        {
          integration_id: integrationId,
          slack_team_id: slackTeamId,
          slack_team_name: slackTeamName,
          team_id: teamId,
        },
      ])
      .select()
      .single();

    if (newSlackConnectionError) {
      // Integration 및 팀 생성 취소 (롤백)
      await supabaseClient.from('integrations').delete().eq('id', integrationId);
      await supabaseClient.from('teams').delete().eq('id', teamId);
      throw new Error(`Error creating notion connection: ${newSlackConnectionError.message}`);
    }

    console.log(
      'Team and integration created successfully:',
      newTeam,
      newIntegration,
      newSlackConnection,
    );

    return { connection: newSlackConnection, isNew: true };
  }
  console.log('Team already exists:', slackConnections);
  return { connection: slackConnections[0], isNew: false };
};

const getNotionConnection = async (teamId: string) => {
  const { data: notionConnections, error: notionConnectionsError } = await supabaseClient
    .from('NotionConnections')
    .select()
    .eq('team_id', teamId);

  const notionConnection = notionConnections[0];

  return notionConnection;
};

const upsertNotionConnection = async ({ notionData, team_id, integration_id }) => {
  const { access_token, workspace_name, workspace_id, workspace_icon, bot_id } = notionData;
  // create notion connection
  const { data: notionConnections, error: notionConnectionsError } = await supabaseClient
    .from('NotionConnections')
    .upsert(
      [
        {
          access_token,
          workspace_name,
          workspace_id,
          workspace_icon,
          bot_id,
          integration_id,
          team_id,
        },
      ],
      {
        onConflict: 'bot_id',
      },
    )
    .select()
    .single();

  if (notionConnectionsError) {
    throw new Error(`Error creating notion connection: ${notionConnectionsError.message}`);
  }

  return notionConnections;
};

const deleteNotionIntegrationInfo = async (teamId: string) => {
  /**
   * Remove all previous datas
   */
  const { error } = await supabaseClient.from('NotionDatas').delete().eq('team_id', teamId);

  if (error) {
    throw new Error(`Error deleting notion data: ${error.message}`);
  }
};

const insertNotionIntegrationInfo = async (notionData) => {
  const { data: notionPagesData, error: notionPagesError } = await supabaseClient
    .from('NotionDatas')
    .upsert(notionData);

  if (notionPagesError) {
    throw new Error(`Error inserting notion data: ${notionPagesError.message}`);
  }

  return notionPagesData;
};

export default supabaseClient;
export {
  getTeamBySlackId,
  getNotionConnection,
  upsertNotionConnection,
  deleteNotionIntegrationInfo,
  insertNotionIntegrationInfo,
};
