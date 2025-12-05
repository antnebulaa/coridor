import axios from 'axios';

const POWENS_API_URL = 'https://coridor-sandbox.biapi.pro/2.0';

export const getPowensToken = async (code: string, redirectUrl: string) => {
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', process.env.POWENS_CLIENT_ID || '');
    params.append('client_secret', process.env.POWENS_CLIENT_SECRET || '');
    params.append('redirect_uri', redirectUrl);
    params.append('grant_type', 'authorization_code');

    try {
        const response = await axios.post(
            `${POWENS_API_URL}/auth/token/access`,
            params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("Powens Token Error:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        throw error;
    }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getPowensTransactions = async (accessToken: string) => {
    try {
        let connections: any[] = [];
        let isSynced = false;
        const maxRetries = 15; // Wait up to 30 seconds

        // 1. Poll for synchronization completion
        for (let i = 0; i < maxRetries; i++) {
            const connectionsResponse = await axios.get(
                `${POWENS_API_URL}/users/me/connections?expand=accounts`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                    },
                }
            );

            connections = connectionsResponse.data.connections || [];

            // Check if any connection has finished syncing (has last_update)
            const syncedConnection = connections.find(c => c.last_update !== null);

            if (syncedConnection) {
                console.log(`[Powens] Connection ${syncedConnection.id} synced at ${syncedConnection.last_update}`);
                isSynced = true;
                break;
            }

            console.log(`[Powens] Waiting for sync... (Attempt ${i + 1}/${maxRetries})`);
            await delay(2000);
        }

        if (!isSynced) {
            console.warn("[Powens] Timeout waiting for sync. Fetching available data anyway.");
        }

        let allTransactions: any[] = [];

        // Calculate date 1 year ago
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const minDate = oneYearAgo.toISOString().split('T')[0];
        console.log(`[Powens] Requesting transactions since: ${minDate}`);

        // 2. Iterate and fetch transactions for each account
        for (const connection of connections) {
            // Log full object for debugging if needed, but now we trust last_update
            // console.log(`[Powens] Connection ${connection.id} details:`, JSON.stringify(connection, null, 2));

            for (const account of connection.accounts) {
                try {
                    let offset = 0;
                    let hasMore = true;

                    while (hasMore) {
                        const url = `${POWENS_API_URL}/users/me/connections/${connection.id}/accounts/${account.id}/transactions?limit=1000&min_date=${minDate}&offset=${offset}`;
                        console.log(`[Powens] Fetching: ${url}`);

                        const transactionsResponse = await axios.get(
                            url,
                            {
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Accept': 'application/json',
                                },
                            }
                        );

                        const newTransactions = transactionsResponse.data.transactions || [];
                        allTransactions = [...allTransactions, ...newTransactions];

                        if (newTransactions.length < 1000) {
                            hasMore = false;
                        } else {
                            offset += 1000;
                        }
                    }
                } catch (txError) {
                    console.warn(`Failed to fetch transactions for account ${account.id}`, txError);
                }
            }
        }

        return { transactions: allTransactions };
    } catch (error: any) {
        console.error("Powens Transactions Error:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        throw error;
    }
};
