// functions/index.js (v5.2 - 데이터 아카이빙 기능이 포함된 최종 완성본)
const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const generateRandomNickname = () => {
    const adjectives = [
        // 감정·기분
        '행복한', '즐거운', '신나는', '설레는', '두근거리는', '기분 좋은', '만족스러운',
        '평화로운', '고요한', '나른한', '느긋한', '여유로운', '따스한', '포근한', '상쾌한',
        '명랑한', '해맑은', '사랑스러운', '다정한', '수줍은', '용감한', '씩씩한', '희망찬',
        '뭉클한', '아련한', '짜릿한', '의젓한', '천진난만한', '산뜻한', '쾌활한', '기특한',
        '해사한', '소곤거리는',

        // 모양·질감
        '동글동글한', '폭신한', '말랑말랑한', '보송보송한', '매끈한', '몽글몽글한', '반짝이는',
        '투명한', '아기자기한', '조그만', '오밀조밀한', '가느다란', '하늘하늘한', '나풀거리는',
        '오동통한', '말랑쫀득한', '솜사탕같은', '조랭이떡같은', '포동포동한', '삐뚤빼뚤한',

        // 색감·빛
        '알록달록한', '무지갯빛', '햇살같은', '달빛같은', '별빛같은', '눈부신', '은은한',
        '새하얀', '노란빛의', '분홍빛의', '연두빛의', '하늘빛의', '보랏빛의', '영롱한',
        '새벽녘의', '저녁노을빛', '찬란한', '화사한', '청아한', '티없이 맑은',

        // 맛·향
        '달콤한', '상큼한', '새콤달콤한', '향긋한', '은은한 향기의', '시원한', '달짝지근한',
        '고소한', '쌉쌀한', '사르르 녹는',

        // 성격·분위기
        '자유로운', '낭만적인', '신비로운', '꿈꾸는', '장난기 많은', '호기심 많은', '엉뚱한',
        '슬기로운', '지혜로운', '똑똑한', '상냥한', '우아한', '게으른', '부지런한', '대담한',
        '엉뚱발랄한', '치명적인', '도도한', '고운', '단아한', '아리따운', '세련된', '매혹적인',
        '섬세한', '미묘한', '요상한', '심오한', '앙큼한', '앙증맞은', '새초롬한', '시크한',

        // 동식물·자연
        '꽃과 같은', '풀잎같은', '이슬같은', '바람같은', '구름같은', '바다같은', '숲속의',
        '강아지같은', '고양이같은', '다람쥐같은', '토끼같은', '병아리같은', '나비같은',
        '새싹같은', '밤하늘의', '우주를 유영하는', '살랑이는', '깡총 뛰는',

        // 기타 (의성/의태어 및 명사형)
        '마법의', '비밀스러운', '소중한', '특별한', '작고 소중한', '세상에 하나뿐인',
        '이야기가있는', '전설속의', '시간을 넘어서는', '오묘한', '아름다운', '재롱부리는',
        '개구쟁이같은', '깔깔대는', '헤헤거리는', '까부는'
    ];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} 펠시`;
};

exports.addVote = onCall(async (request) => {
    const vote = request.data.vote;
    if (!['yay', 'nay'].includes(vote)) { throw new Error('Invalid vote type'); }
    const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const hour = now.getUTCHours();
    let period;
    if (hour >= 0 && hour < 6) period = 'p1';
    else if (hour >= 6 && hour < 12) period = 'p2';
    else if (hour >= 12 && hour < 18) period = 'p3';
    else period = 'p4';
    const db = getFirestore();
    const voteRef = db.collection('votes').doc('today');
    const nickname = generateRandomNickname();
    const newLog = { nickname, vote, timestamp: new Date() };
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(voteRef);
        const updates = {};
        updates.log = [newLog, ...(doc.data()?.log || [])].slice(0, 20);
        updates.yay = FieldValue.increment(vote === 'yay' ? 1 : 0);
        updates.nay = FieldValue.increment(vote === 'nay' ? 1 : 0);
        updates[`periods.${period}.${vote}`] = FieldValue.increment(1);
        if (!doc.exists) {
            transaction.set(voteRef, updates);
        } else {
            transaction.update(voteRef, updates);
        }
    });
    return { success: true };
});

const resetData = {
    yay: 0, nay: 0, log: [],
    periods: {
        p1: { yay: 0, nay: 0 }, p2: { yay: 0, nay: 0 },
        p3: { yay: 0, nay: 0 }, p4: { yay: 0, nay: 0 },
    }
};

// [수정] 자동 초기화 시 어제 날짜로 데이터를 백업(아카이빙)하는 기능
exports.resetVotesScheduled = onSchedule({schedule: '0 0 * * *', timeZone: 'Asia/Seoul'}, async (event) => {
    const db = getFirestore();
    const todayRef = db.collection('votes').doc('today');

    const todayDoc = await todayRef.get();
    if (todayDoc.exists && todayDoc.data().log.length > 0) { // 로그가 있을 때만 아카이빙
        const yesterday = new Date(new Date().getTime() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
        const archiveId = yesterday.toISOString().slice(0, 10);
        
        const archiveRef = db.collection('archives').doc(archiveId);
        await archiveRef.set(todayDoc.data());
        console.log(`Data for ${archiveId} has been archived.`);
    }

    await todayRef.set(resetData);
    console.log('Daily vote reset complete.');
    return null;
});

// [수정] 관리자 초기화는 아카이빙 없이 '오늘' 데이터만 리셋
exports.resetVotesAdmin = onCall(async (request) => {
    const ADMIN_PASSWORD = "burnout"; // 이 부분은 네 비밀번호로!
    if (request.data.password !== ADMIN_PASSWORD) {
        throw new Error('비밀번호가 올바르지 않습니다.');
    }
    const db = getFirestore();
    await db.collection('votes').doc('today').set(resetData);
    console.log('Admin vote reset completed.');
    return { success: true };
});