// public/script.js (v4.1 - 비밀번호 투표 기능 추가)
const db = firebase.firestore();
const functions = firebase.functions();

document.addEventListener('DOMContentLoaded', () => {
    // --- (HTML 요소 가져오는 부분은 동일) ---
    const yayButton = document.getElementById('vote-yay'); // 이모지에 맞게 ID를 수정했다면 여기도 바꿔줘
    const nayButton = document.getElementById('vote-nay'); // 예: const goodButton = document.getElementById('vote-good');
    const yayCountSpan = document.getElementById('yay-count');
    const nayCountSpan = document.getElementById('nay-count');
    const logList = document.getElementById('log-list');
    const mainLinkBtn = document.getElementById('main-link-btn');
    const adminResetBtn = document.getElementById('admin-reset-btn');

    const votesRef = db.collection('votes').doc('today');

    const yayResultP = document.getElementById('yay-result');
    const nayResultP = document.getElementById('nay-result');

    votesRef.onSnapshot((doc) => {
        if (!doc.exists) { return; }
        const data = doc.data();
        const yayTotal = data.yay || 0;
        const nayTotal = data.nay || 0;
        yayCountSpan.textContent = yayTotal;
        nayCountSpan.textContent = nayTotal;

        // [수정] 이모지 크기 조절 로직은 그대로 유지
        yayButton.classList.remove('bigger-emoji');
        nayButton.classList.remove('bigger-emoji');
        if (yayTotal > nayTotal) { yayButton.classList.add('bigger-emoji'); }
        else if (nayTotal > yayTotal) { nayButton.classList.add('bigger-emoji'); }

        // [추가] 결과 값 하이라이트 로직
        yayResultP.classList.remove('highlighted-result');
        nayResultP.classList.remove('highlighted-result');
        if (yayTotal > nayTotal) {
            yayResultP.classList.add('highlighted-result');
        } else if (nayTotal > yayTotal) {
            nayResultP.classList.add('highlighted-result');
        }
		
        logList.innerHTML = '';
        const logs = data.log || [];
        logs.forEach(item => {
            const date = item.timestamp.toDate().toLocaleTimeString('ko-KR');
            const li = document.createElement('li');
            // 이모지를 바꿨다면 아래 '💃', '🤦‍♀️' 부분도 실제 이모지에 맞게 수정해줘
            li.textContent = `[${date}] ${item.nickname} 님이 ${item.vote === 'yay' ? '🥳⚡️' : '🧱🥱'} 를 눌렀습니다.`;
            logList.appendChild(li);
        });
        const periods = data.periods || {};
        for (let i = 1; i <= 4; i++) {
            const periodData = periods[`p${i}`] || { yay: 0, nay: 0 };
            document.getElementById(`p${i}-yay`).textContent = periodData.yay;
            document.getElementById(`p${i}-nay`).textContent = periodData.nay;
        }
    });

    // [수정] 비밀번호 인증 기능이 추가된 투표 제출 함수
    const submitVote = (voteType) => {
        // !!! 중요: 이 비밀번호를 너만 아는 것으로 바꿔줘 !!!
        const VOTE_PASSWORD = "1008";

        const password = prompt("투표 비밀번호를 입력하세요:");

        // 사용자가 취소를 누르거나 비밀번호가 틀리면 함수 종료
        if (password === null) return;
        if (password !== VOTE_PASSWORD) {
            alert('비밀번호가 틀렸습니다.');
            return;
        }

        // 10분 쿨타임 체크 (비밀번호 통과 후에만 검사)
        const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
        const lastVoteTimestamp = localStorage.getItem('lastVoteTimestamp');
        if (lastVoteTimestamp && (Date.now() - lastVoteTimestamp < TEN_MINUTES_IN_MS)) {
            const timeLeft = Math.ceil((TEN_MINUTES_IN_MS - (Date.now() - lastVoteTimestamp)) / 1000 / 60);
            alert(`이미 투표했습니다. 약 ${timeLeft}분 후에 다시 시도해주세요.`);
            return;
        }

        // 서버에 투표 데이터 전송
        const addVoteFunction = functions.httpsCallable('addVote');
        addVoteFunction({ vote: voteType })
            .then(() => {
                localStorage.setItem('lastVoteTimestamp', Date.now());
            })
            .catch(error => console.error('Cloud Function 호출 오류:', error));
    };

    // --- (나머지 버튼 이벤트 리스너 부분은 동일) ---
    mainLinkBtn.addEventListener('click', () => {
        window.location.href = 'https://toastout.github.io/toast/';
    });
    adminResetBtn.addEventListener('click', () => {
        const password = prompt('관리자 비밀번호를 입력하세요:');
        if (password) {
            const resetFunction = functions.httpsCallable('resetVotesAdmin');
            resetFunction({ password: password })
                .then(result => {
                    if (result.data.success) {
                        localStorage.removeItem('lastVoteTimestamp');
                        alert('초기화 및 투표 제한이 해제되었습니다.');
                    }
                })
                .catch(error => { alert('초기화 실패: ' + error.message); });
        }
    });
    yayButton.addEventListener('click', () => submitVote('yay'));
    nayButton.addEventListener('click', () => submitVote('nay'));
});