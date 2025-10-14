import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
    const { vote, nickname } = JSON.parse(event.body);
    if (!['yay', 'nay'].includes(vote)) {
        return { statusCode: 400, body: 'Invalid vote type' };
    }

    const store = getStore('votes');
    const key = `${vote}_count`;
    
    // 1. 카운트 증가
    const currentCount = await store.get(key, { type: 'json' }) || 0;
    await store.setJSON(key, currentCount + 1);

    // 2. 로그 기록 (최신 10개만 저장)
    const currentLog = await store.get('vote_log', { type: 'json' }) || [];
    const newLogEntry = { nickname, vote, timestamp: Date.now() };
    const updatedLog = [newLogEntry, ...currentLog].slice(0, 10);
    await store.setJSON('vote_log', updatedLog);

    return { statusCode: 200, body: 'Vote recorded' };
};