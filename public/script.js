// public/script.js (v6.0 - 날짜별 기록 표시 기능 추가)
const db = firebase.firestore();
const functions = firebase.functions();

document.addEventListener('DOMContentLoaded', () => {
    // --- (HTML 요소 가져오는 부분은 동일) ---
    const yayButton = document.getElementById('vote-yay');
    const nayButton = document.getElementById('vote-nay');
    const yayCountSpan = document.getElementById('yay-count');
    const nayCountSpan = document.getElementById('nay-count');
    const logList = document.getElementById('log-list');
    const mainLinkBtn = document.getElementById('main-link-btn');
    const adminResetBtn = document.getElementById('admin-reset-btn');
    const yayResultP = document.getElementById('yay-result');
    const nayResultP = document.getElementById('nay-result');

    // [수정] 여러 날짜의 데이터를 한 번에 가져와서 표시하는 로직
    async function displayLogs() {
        try {
            // 1. 필요한 모든 데이터를 가져온다 (오늘 + 어제, 그저께 아카이브)
            const todayRef = db.collection('votes').doc('today');
            
            // 한국 시간 기준으로 날짜 생성
            const todayDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
            const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
            const dayBeforeYesterdayDate = new Date(yesterdayDate.getTime() - 24 * 60 * 60 * 1000);
            
            const yesterdayId = yesterdayDate.toISOString().slice(0, 10);
            const dayBeforeYesterdayId = dayBeforeYesterdayDate.toISOString().slice(0, 10);

            const archiveRef1 = db.collection('archives').doc(yesterdayId);
            const archiveRef2 = db.collection('archives').doc(dayBeforeYesterdayId);

            const [todayDoc, archiveDoc1, archiveDoc2] = await Promise.all([
                todayRef.get(),
                archiveRef1.get(),
                archiveRef2.get()
            ]);

            // 2. 오늘의 데이터를 실시간으로 업데이트 (기존 onSnapshot 유지)
            if (todayDoc.exists) {
                const data = todayDoc.data();
                const yayTotal = data.yay || 0;
                const nayTotal = data.nay || 0;
                yayCountSpan.textContent = yayTotal;
                nayCountSpan.textContent = nayTotal;
                yayButton.classList.remove('bigger-emoji');
                nayButton.classList.remove('bigger-emoji');
                if (yayTotal > nayTotal) { yayButton.classList.add('bigger-emoji'); }
                else if (nayTotal > yayTotal) { nayButton.classList.add('bigger-emoji'); }
                yayResultP.classList.remove('highlighted-result');
                nayResultP.classList.remove('highlighted-result');
                if (yayTotal > nayTotal) { yayResultP.classList.add('highlighted-result'); }
                else if (nayTotal > yayTotal) { nayResultP.classList.add('highlighted-result'); }

                const periods = data.periods || {};
                for (let i = 1; i <= 4; i++) {
                    const periodData = periods[`p${i}`] || { yay: 0, nay: 0 };
                    document.getElementById(`p${i}-yay`).textContent = periodData.yay;
                    document.getElementById(`p${i}-nay`).textContent = periodData.nay;
                }
            }

            // 3. 모든 로그를 하나로 합쳐서 시간순으로 정렬
            let allLogs = [];
            if (todayDoc.exists) allLogs.push(...todayDoc.data().log);
            if (archiveDoc1.exists) allLogs.push(...archiveDoc1.data().log);
            if (archiveDoc2.exists) allLogs.push(...archiveDoc2.data().log);

            allLogs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate()); // 최신순 정렬

            // 4. 날짜별로 그룹화하여 화면에 표시
            logList.innerHTML = '';
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
                const voteEmoji = item.vote === 'yay' ? '🥳⚡️' : '🧱🥱'; // 이모지는 네 것으로 수정해줘
                li.textContent = `[${timeStr}] ${item.nickname} 님이 ${voteEmoji} 를 눌렀습니다.`;
                logList.appendChild(li);
            });

        } catch (error) {
            console.error("로그를 불러오는 데 실패했습니다:", error);
        }
    }
    
    // 실시간 감지를 위해 onSnapshot 사용, 초기 로드와 변경 시 모두 displayLogs 호출
    db.collection('votes').doc('today').onSnapshot(displayLogs);
    
    // --- (submitVote 및 나머지 버튼 이벤트 리스너 부분은 기존과 동일) ---
    const submitVote = (voteType) => { /* ... 이전 코드와 동일 ... */ };
    mainLinkBtn.addEventListener('click', () => { /* ... 이전 코드와 동일 ... */ });
    adminResetBtn.addEventListener('click', () => { /* ... 이전 코드와 동일 ... */ });
    yayButton.addEventListener('click', () => submitVote('yay'));
    nayButton.addEventListener('click', () => submitVote('nay'));
});