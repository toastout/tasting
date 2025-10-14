document.addEventListener('DOMContentLoaded', () => {
    const yayButton = document.getElementById('vote-yay');
    const nayButton = document.getElementById('vote-nay');
    const resetButton = document.getElementById('reset-button'); // [수정] 리셋 버튼
    const yayCountSpan = document.getElementById('yay-count');
    const nayCountSpan = document.getElementById('nay-count');
    const logList = document.getElementById('log-list');

    const API_BASE = '/.netlify/functions/';

    // [수정] '펠시'를 위한 랜덤 닉네임 생성기
    const generateRandomNickname = () => {
        const adjectives = ['사랑에 빠진', '쓰러진', '귀여운', '다람쥐', '피곤한', '행복한', '용감한', '배고픈', '신난', '고요한'];
        return `${adjectives[Math.floor(Math.random() * adjectives.length)]} 펠시`;
    };

    // 투표 결과 및 기록 불러오기
    const fetchVotes = async () => {
        try {
            const response = await fetch(`${API_BASE}get-votes`);
            const data = await response.json();
            yayCountSpan.textContent = data.yay || 0;
            nayCountSpan.textContent = data.nay || 0;
            
            logList.innerHTML = '';
            (data.log || []).forEach(item => {
                const li = document.createElement('li');
                const date = new Date(item.timestamp).toLocaleTimeString('ko-KR');
                li.textContent = `[${date}] ${item.nickname} 님이 ${item.vote === 'yay' ? '💃' : '🤦‍♀️'} 를 눌렀습니다.`;
                logList.prepend(li);
            });
        } catch (error) {
            console.error('결과 로딩 실패:', error);
        }
    };

    // 투표 제출
    const submitVote = async (voteType) => {
        const nickname = generateRandomNickname();
        try {
            await fetch(`${API_BASE}add-vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vote: voteType, nickname: nickname })
            });
            await fetchVotes();
        } catch (error) {
            console.error('투표 제출 실패:', error);
        }
    };

    // [추가] 투표 초기화
    const resetVotes = async () => {
        if (!confirm('정말로 모든 투표 기록을 초기화하시겠습니까?')) {
            return;
        }
        try {
            await fetch(`${API_BASE}reset-votes`, { method: 'POST' });
            await fetchVotes();
        } catch (error) {
            console.error('초기화 실패:', error);
        }
    };
    
    // [추가] 관리자 모드 확인
    const checkAdminMode = () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            resetButton.style.display = 'inline-block';
        }
    };

    yayButton.addEventListener('click', () => submitVote('yay'));
    nayButton.addEventListener('click', () => submitVote('nay'));
    resetButton.addEventListener('click', resetVotes); // [추가] 리셋 버튼 이벤트

    // 페이지 로드 시 실행
    fetchVotes();
    checkAdminMode(); // [추가] 관리자 모드 확인
});