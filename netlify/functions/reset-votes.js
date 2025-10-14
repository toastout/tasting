import { getStore } from "@netlify/blobs";

export const handler = async () => {
    const store = getStore('votes');
    await store.setJSON('yay_count', 0);
    await store.setJSON('nay_count', 0);
    await store.setJSON('vote_log', []);

    console.log('Votes have been reset.');
    return {
        statusCode: 200,
        body: 'Votes reset successfully',
    };
};