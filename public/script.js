// public/script.js (v8.0 - '한마디' + '시간' + '하이라이트' 전체 코드)
const db = firebase.firestore();
const functions = firebase.functions();

document.addEventListener('DOMContentLoaded', () => {
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

    // '역사가'의 임무: 과거 기록은 페이지 로드 시 딱 한 번만 가져온다.
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

    // '실시간 감시병'의 임무: '오늘'의 데이터만 감시하고 화면을 업데이트한다.
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
        
        const allLogs = [...todayLogs, ...archiveLogs];
        allLogs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

        // [수정] '시간'과 '한마디' 하이라이트를 포함한 새 디자인으로 표시
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
            const timeStr = dateObj.toLocaleTimeString('ko-KR'); // [추가] 시간 복원
            const voteEmoji = item.vote === 'yay' ? '🥳⚡️' : '🧱🥱'; // 이모지는 네 것으로 수정!
            const message = item.text || '🐱'; // DB에 text가 없으면 🐱로 표시

            // innerHTML을 사용해 새 포맷으로 렌더링
            li.innerHTML = `[${timeStr}] ${item.nickname}(${voteEmoji}) <span class="log-message">"${message}"</span>`;
            logList.appendChild(li);
        });
    });

    fetchArchives();

    // [수정] '한마디'를 입력받는 새로운 submitVote 함수
    const submitVote = (voteType) => {
        const VOTE_PASSWORD = "1008"; // 네가 설정한 "1008" 비밀번호
        const password = prompt("투표 비밀번호를 입력하세요:");
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

        // [추가] '한마디' 입력받기
        let message = prompt("하고 싶은 말을 6자 이내로 입력하세요 (미입력 시 🐱):");
        if (message === null) return; 

        if (message.length > 6) {
            alert('6자를 초과했습니다! 6자 이내로 다시 작성해주세요.');
            return; 
        }

        if (message.trim() === "") {
            message = "🐱"; 
        }

        const addVoteFunction = functions.httpsCallable('addVote');
        addVoteFunction({ vote: voteType, text: message })
            .then(() => {
                localStorage.setItem('lastVoteTimestamp', Date.now());
            })
            .catch(error => console.error('Cloud Function 호출 오류:', error));
    };

    mainLinkBtn.addEventListener('click', () => { window.location.href = 'https://toastout.github.io/toast/'; });
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