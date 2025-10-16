// public/script.js (v6.2 - 역할 분리 최종 수정본)
const db = firebase.firestore();
const functions = firebase.functions();

document.addEventListener('DOMContentLoaded', () => {
    // --- (HTML 요소 가져오는 부분은 모두 동일) ---
    const yayButton = document.getElementById('vote-yay');
    const nayButton = document.getElementById('vote-nay');
    const yayCountSpan = document.getElementById('yay-count');
    const nayCountSpan = document.getElementById('nay-count');
    const logList = document.getElementById('log-list');
    const mainLinkBtn = document.getElementById('main-link-btn');
    const adminResetBtn = document.getElementById('admin-reset-btn');
    const yayResultP = document.getElementById('yay-result');
    const nayResultP = document.getElementById('nay-result');

    let archiveLogs = []; // 과거 로그를 저장할 변수

    // [수정] 1. '역사가'의 임무: 과거 기록은 페이지 로드 시 딱 한 번만 가져온다.
    async function fetchArchives() {
        try {
            const todayDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
            const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
            const dayBeforeYesterdayDate = new Date(yesterdayDate.getTime() - 24 * 60 * 60 * 1000);
            const yesterdayId = yesterdayDate.toISOString().slice(0, 10);
            const dayBeforeYesterdayId = dayBeforeYesterdayDate.toISOString().slice(0, 10);
            const archiveRef1 = db.collection('archives').doc(yesterdayId);
            const archiveRef2 = db.collection('archives').doc(dayBeforeYesterdayId);

            const [archiveDoc1, archiveDoc2] = await Promise.all([
                archiveRef1.get(), archiveRef2.get()
            ]);

            if (archiveDoc1.exists) archiveLogs.push(...archiveDoc1.data().log);
            if (archiveDoc2.exists) archiveLogs.push(...archiveDoc2.data().log);
        } catch (error) {
            console.error("과거 기록을 불러오는 데 실패했습니다:", error);
        }
    }

    // [수정] 2. '실시간 감시병'의 임무: '오늘'의 데이터만 감시하고 화면을 업데이트한다.
    db.collection('votes').doc('today').onSnapshot((todayDoc) => {
        logList.innerHTML = ''; // 화면을 깨끗이 비운다
        let todayLogs = [];

        if (todayDoc.exists) {
            const data = todayDoc.data();
            todayLogs = data.log || [];

            // 오늘의 데이터 표시 (결과, 하이라이트, 시간대별 분석 등)
            const yayTotal = data.yay || 0;
            const nayTotal = data.nay || 0;
            yayCountSpan.textContent = yayTotal;
            nayCountSpan.textContent = nayTotal;
            yayButton.classList.remove('bigger-emoji');
            nayButton.classList.remove('bigger-emoji');
            if (yayTotal > nayTotal) { yayButton.classList.add('bigger-emoji'); }
            else if (nayTotal > nayTotal) { nayButton.classList.add('bigger-emoji'); }
            yayResultP.classList.remove('highlighted-result');
            nayResultP.classList.remove('highlighted-result');
            if (yayTotal > nayTotal) { yayResultP.classList.add('highlighted-result'); }
            else if (nayTotal > nayTotal) { nayResultP.classList.add('highlighted-result'); }
            const periods = data.periods || {};
            for (let i = 1; i <= 4; i++) {
                const periodData = periods[`p${i}`] || { yay: 0, nay: 0 };
                document.getElementById(`p${i}-yay`).textContent = periodData.yay;
                document.getElementById(`p${i}-nay`).textContent = periodData.nay;
            }
        }
        
        // 3. '역사가'가 가져온 과거 기록과 '감시병'이 가져온 오늘 기록을 합친다.
        const allLogs = [...todayLogs, ...archiveLogs];
        allLogs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

        // 4. 합쳐진 전체 기록을 날짜별로 예쁘게 화면에 표시한다.
        let lastDate = '';
        allLogs.forEach(item => {
            const dateObj = item.timestamp.toDate();
            const dateStr = dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            if (dateStr !== lastDate) {
                const dateHeader = document.createElement('li');
                dateHeader.className = 'log-date-header';
                dateHeader.textContent = dateStr;
                logList.appendChild(dateHeader);
                lastDate = dateStr;
            }
            const li = document.createElement('li');
            const timeStr = dateObj.toLocaleTimeString('ko-KR');
            const voteEmoji = item.vote === 'yay' ? '🥳⚡️' : '🧱🥱'; // 이모지는 네 것으로 수정!
            li.textContent = `[${timeStr}] ${item.nickname} 님이 ${voteEmoji} 를 눌렀습니다.`;
            logList.appendChild(li);
        });
    });

    // 페이지가 처음 열릴 때 '역사가'를 먼저 실행시킨다.
    fetchArchives();

    // --- (submitVote 및 나머지 버튼 이벤트 리스너 부분은 v6.1과 동일하며, 완벽하게 복구됨) ---
    const submitVote = (voteType) => {
        const VOTE_PASSWORD = "1008"; // 투표 비밀번호
        const password = prompt("투표 비밀번호를 입력하세요.");
        if (password === null) return;
        if (password !== VOTE_PASSWORD) {
            alert('비밀번호가 틀렸습니다.');
            return;
        }
        const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
        const lastVoteTimestamp = localStorage.getItem('lastVoteTimestamp');
        if (lastVoteTimestamp && (Date.now() - lastVoteTimestamp < TEN_MINUTES_IN_MS)) {
            const timeLeft = Math.ceil((TEN_MINUTES_IN_MS - (Date.now() - lastVoteTimestamp)) / 1000 / 60);
            alert(`이미 투표했습니다. 약 ${timeLeft}분 후에 다시 시도해주세요.`);
            return;
        }
        const addVoteFunction = functions.httpsCallable('addVote');
        addVoteFunction({ vote: voteType })
            .then(() => {
                localStorage.setItem('lastVoteTimestamp', Date.now());
            })
            .catch(error => console.error('Cloud Function 호출 오류:', error));
    };
    mainLinkBtn.addEventListener('click', () => { window.location.href = 'https://toastout.github.io/toast/'; });
    adminResetBtn.addEventListener('click', () => {
        const password = prompt('관리자 비밀번호를 입력하세요.');
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