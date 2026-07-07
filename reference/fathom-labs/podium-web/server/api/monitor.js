export default defineEventHandler(async (event) => {
  // Get the runtime config
  const config = useRuntimeConfig(event);

  try {
    // Comprehensive API key retrieval
    const apiKey = 
      process.env.BETTERSTACK_API_KEY || 
      config.BETTERSTACK_API_KEY || 
      config.public?.BETTERSTACK_API_KEY;

    // Validate API key
    if (!apiKey) {
      return {
        status: 'error',
        message: 'Missing Better Stack API Key'
      };
    }

    // Fetch data from Better Stack API
    const response = await fetch(`https://uptime.betterstack.com/api/v2/monitors/1505362`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Handle response
    if (!response.ok) {
      const errorBody = await response.text();
      return {
        status: 'error',
        message: `API Request Failed: ${response.statusText}`,
        details: errorBody
      };
    }

    // Parse response
    const responseData = await response.json();

    // Extract status from the attributes
    const attributes = responseData.data?.attributes || {};

    // Prepare status details
    const statusDetails = {
      status: attributes.status === 'up' ? 'up' : 'down',
      rawStatus: attributes.status,
      lastCheckedAt: attributes.last_checked_at,
      monitorType: attributes.monitor_type,
      url: attributes.url,
      regions: attributes.regions,
      additionalDetails: {
        pronounceableName: attributes.pronounceable_name,
        teamName: attributes.team_name
      }
    };

    return {
      status: 'success',
      data: statusDetails
    };

  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to fetch monitor data',
      details: error.message
    };
  }
});