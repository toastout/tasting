import { getStore } from '@netlify/blobs';

export const handler = async () => {
    const store = getStore('votes');
    const yay = await store.get('yay_count', { type: 'json' }) || 0;
    const nay = await store.get('nay_count', { type: 'json' }) || 0;
    const log = await store.get('vote_log', { type: 'json' }) || [];

    return {
        statusCode: 200,
        body: JSON.stringify({ yay, nay, log }),
    };
};