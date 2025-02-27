document.addEventListener('DOMContentLoaded', () => {
    particlesJS('particles-js', {
        particles: {
            number: { value: 100, density: { enable: true, value_area: 1200 } },
            color: { value: '#ffcc00' },
            shape: { type: 'circle' },
            opacity: { value: 0.7, random: true },
            size: { value: 5, random: true },
            line_linked: { enable: true, distance: 180, color: '#ffffff', opacity: 0.6, width: 1.5 },
            move: { enable: true, speed: 4, direction: 'none', random: true, straight: false, out_mode: 'out' }
        },
        interactivity: {
            events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' } },
            modes: { repulse: { distance: 150 }, push: { particles_nb: 6 } }
        }
    });

    particlesJS('particles-js-ranking', {
        particles: { number: { value: 70 }, color: { value: '#ffcc00' } }
    });

    anime({
        targets: '.loader',
        opacity: 0,
        duration: 600,
        easing: 'easeOutQuad',
        complete: () => document.querySelector('.loader').style.display = 'none'
    });

    // Load initial data
    loadData();
    fetchCourses();
    fetchRankings();
});

anime({
    targets: '.hero-content',
    translateY: [-80, 0],
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 1600,
    easing: 'easeOutElastic(1, .4)'
});

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            anime({
                targets: entry.target.querySelector('h2'),
                translateY: [50, 0],
                opacity: [0, 1],
                duration: 1200,
                easing: 'easeOutExpo'
            });
            anime({
                targets: entry.target.querySelectorAll('.content-card, .ranking-item, .flashcard'),
                translateY: [80, 0],
                opacity: [0, 1],
                scale: [0.9, 1],
                duration: 1400,
                delay: anime.stagger(300),
                easing: 'easeOutExpo'
            });
        }
    });
}, { threshold: 0.4 });

document.querySelectorAll('.section').forEach(section => sectionObserver.observe(section));

const themeToggle = document.querySelector('.theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    themeToggle.innerHTML = document.body.classList.contains('dark') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

let currentUser = null;
let uploadedVideos = [];
let badges = [];
let personalCourses = [];
let progress = 0;
let points = 0;
let level = 1;
let courses = [];
let rankings = [];

function renderGrid(gridId, items, isPersonal = false) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = items.map(item => `
        <div class="content-card" draggable="${!isPersonal}" data-id="${item.id || item._id}">
            <div class="thumbnail" style="background-image: url(${item.thumbnail});"></div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <div class="buttons">
                <button class="action-btn ripple-btn" data-type="learn" data-id="${item.id || item._id}">Học ngay</button>
                ${!isPersonal ? `<button class="action-btn add ripple-btn" data-type="add-personal" data-id="${item.id || item._id}">Thêm</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function fetchCourses() {
    try {
        const response = await fetch('https://your-aws-backend/api/courses', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        courses = await response.json();
        renderGrid('instrument-grid', courses.filter(c => c.category === 'instruments'));
        renderGrid('martial-grid', courses.filter(c => c.category === 'martial-arts'));
    } catch (error) {
        showNotification('Không thể tải khóa học!', 'error');
    }
}

async function fetchRankings() {
    try {
        const response = await fetch('https://your-aws-backend/api/rankings', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        rankings = await response.json();
        renderRanking();
    } catch (error) {
        showNotification('Không thể tải bảng xếp hạng!', 'error');
    }
}

const droppable = document.getElementById('personal-courses-grid');
droppable.addEventListener('dragover', (e) => e.preventDefault());
droppable.addEventListener('drop', async (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const lesson = courses.find(l => l._id === id);
    if (lesson && !personalCourses.some(pc => pc._id === id)) {
        personalCourses.push(lesson);
        renderGrid('personal-courses-grid', personalCourses, true);
        await updateUserProfile({ personalCourses: personalCourses.map(pc => pc._id) });
        showNotification('Đã thêm vào khóa học yêu thích!', 'success');
    }
});

document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('content-card')) {
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
    }
});

function renderFeedbackList() {
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = uploadedVideos.map(video => `
        <div class="feedback-item">
            <p><strong>Email:</strong> ${video.email}</p>
            <p><strong>Ghi chú:</strong> ${video.note}</p>
            <video controls src="${video.url}" class="feedback-video" loading="lazy"></video>
            <textarea class="teacher-comment" placeholder="Nhận xét giảng viên..." data-id="${video._id}">${video.teacherComment || ''}</textarea>
            <button class="action-btn ripple-btn" onclick="submitTeacherComment('${video._id}')">Gửi nhận xét</button>
        </div>
    `).join('');
}

async function submitTeacherComment(videoId) {
    const comment = document.querySelector(`.teacher-comment[data-id="${videoId}"]`).value;
    try {
        const response = await fetch(`https://your-aws-backend/api/videos/${videoId}/comment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ teacherComment: comment })
        });
        if (response.ok) {
            const updatedVideo = await response.json();
            const index = uploadedVideos.findIndex(v => v._id === videoId);
            uploadedVideos[index] = updatedVideo;
            showNotification('Nhận xét đã được gửi!', 'success');
            renderFeedbackList();
        } else {
            showNotification('Không thể gửi nhận xét!', 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server!', 'error');
    }
}

const searchInput = document.getElementById('search');
const suggestions = document.getElementById('search-suggestions');

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query));
    renderGrid('instrument-grid', filteredCourses.filter(c => c.category === 'instruments'));
    renderGrid('martial-grid', filteredCourses.filter(c => c.category === 'martial-arts'));
    suggestions.innerHTML = filteredCourses.map(item => `<option value="${item.title}">`).join('');
}, 300));

document.addEventListener('click', async (e) => {
    const btn = e.target;
    if (btn.dataset.type === 'learn' && currentUser) {
        progress = Math.min(progress + 30, 100);
        points += 20;
        updateLevel();
        checkBadges();
        await updateUserProfile({ progress, points, level, badges });
        updateProgress();
        showNotification('Hoàn thành bài học! +20 điểm', 'success');
        updateProfile();
        updateRanking();
    } else if (btn.dataset.type === 'add-personal' && currentUser) {
        const lessonId = btn.dataset.id;
        const lesson = courses.find(l => l._id === lessonId);
        if (lesson && !personalCourses.some(pc => pc._id === lessonId)) {
            personalCourses.push(lesson);
            renderGrid('personal-courses-grid', personalCourses, true);
            await updateUserProfile({ personalCourses: personalCourses.map(pc => pc._id) });
            showNotification('Đã thêm vào khóa học yêu thích!', 'success');
        }
    }
});

function updateProgress() {
    const circumference = 565.48;
    const offset = circumference - (progress / 100) * circumference;
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        anime({
            targets: progressFill,
            strokeDashoffset: [anime.setDashoffset, offset],
            duration: 1400,
            easing: 'easeOutExpo',
            begin: () => {
                anime({
                    targets: '.progress-circle',
                    scale: [1, 1.2],
                    rotate: [0, 25],
                    duration: 800,
                    easing: 'easeOutElastic(1, .4)',
                    direction: 'alternate'
                });
            }
        });
    }
    document.getElementById('progress-text').textContent = `${progress}%`;
    document.getElementById('points-text').textContent = `Điểm thưởng: ${points}`;
    document.getElementById('level-text').textContent = `Cấp độ: ${level}`;
}

function updateLevel() {
    level = Math.floor(points / 100) + 1;
    if (points % 100 === 0) {
        showNotification(`Chúc mừng! Bạn đã lên cấp ${level}!`, 'success');
    }
}

function checkBadges() {
    const badgeThresholds = [
        { points: 50, name: 'Beginner' },
        { points: 200, name: 'Advanced' },
        { points: 500, name: 'Master' }
    ];
    badgeThresholds.forEach(badge => {
        if (points >= badge.points && !badges.includes(badge.name)) {
            badges.push(badge.name);
            showNotification(`Chúc mừng! Bạn nhận được huy hiệu "${badge.name}"`, 'success');
        }
    });
    renderBadges();
}

function renderBadges() {
    const badgeList = document.getElementById('badge-list');
    badgeList.innerHTML = badges.map(badge => `<div class="badge">${badge}</div>`).join('');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    anime({
        targets: notification,
        translateX: [80, 0],
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 1000,
        easing: 'easeOutExpo',
        complete: () => setTimeout(() => {
            anime({
                targets: notification,
                translateX: 80,
                opacity: 0,
                duration: 1000,
                easing: 'easeInExpo',
                complete: () => notification.style.display = 'none'
            });
        }, 4000)
    });
}

function resetPage() {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.querySelector('.hero').scrollIntoView({ behavior: 'smooth' });
    anime({
        targets: '.hero',
        opacity: [0, 1],
        translateY: [40, 0],
        scale: [0.98, 1],
        duration: 1200,
        easing: 'easeOutExpo'
    });
}

function showLearningPage() {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const learningPage = document.getElementById('learning-page');
    learningPage.style.display = 'block';
    learningPage.scrollIntoView({ behavior: 'smooth' });
    anime({
        targets: '#learning-page .learning-section',
        opacity: [0, 1],
        translateY: [80, 0],
        scale: [0.95, 1],
        duration: 1400,
        delay: anime.stagger(400),
        easing: 'easeOutExpo'
    });
}

document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.dataset.section;
        if (sectionId === 'explore') return showLearningPage();
        showSection(sectionId);
    });
});

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
        anime({
            targets: section,
            opacity: [0, 1],
            translateY: [40, 0],
            scale: [0.98, 1],
            duration: 1200,
            easing: 'easeOutExpo'
        });
        if (sectionId === 'teacher-dashboard') fetchVideos();
        if (sectionId === 'profile') updateProfile();
        if (sectionId === 'ranking') renderRanking();
        if (sectionId === 'flashcards') initFlashcards();
    }
}

const authModal = document.getElementById('auth-modal');
document.querySelector('.login-btn').addEventListener('click', () => openAuthModal('Đăng nhập'));
document.querySelector('.signup-btn').addEventListener('click', () => openAuthModal('Đăng ký'));

function openAuthModal(title) {
    authModal.style.display = 'flex';
    document.getElementById('modal-title').textContent = title;
    document.querySelector('.auth-submit').textContent = title;
    document.getElementById('toggle-link').textContent = title === 'Đăng nhập' ? 'Đăng ký' : 'Đăng nhập';
    anime({
        targets: '.modal-content',
        scale: [0, 1],
        opacity: [0, 1],
        translateY: [-80, 0],
        rotate: [5, 0],
        duration: 1200,
        easing: 'easeOutElastic(1, .4)'
    });
    anime({
        targets: '.auth-form input, .auth-submit, .toggle-auth, .social-login button',
        translateY: [40, 0],
        opacity: [0, 1],
        duration: 1000,
        delay: anime.stagger(200),
        easing: 'easeOutExpo'
    });
}

authModal.querySelector('.close-modal').addEventListener('click', closeAuthModal);
document.getElementById('toggle-link').addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal(document.getElementById('modal-title').textContent === 'Đăng nhập' ? 'Đăng ký' : 'Đăng nhập');
});

function closeAuthModal() {
    anime({
        targets: '.modal-content',
        scale: [1, 0],
        opacity: [1, 0],
        translateY: [0, -80],
        rotate: [0, 5],
        duration: 800,
        easing: 'easeInExpo',
        complete: () => authModal.style.display = 'none'
    });
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const isLogin = document.getElementById('modal-title').textContent === 'Đăng nhập';

    showLoading();
    try {
        const response = await fetch(`https://your-aws-backend/api/auth/${isLogin ? 'login' : 'register'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: isLogin ? null : 'Người dùng mới', role: 'student' })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            progress = currentUser.progress;
            points = currentUser.points;
            level = currentUser.level;
            badges = currentUser.badges || [];
            personalCourses = currentUser.personalCourses.map(id => courses.find(c => c._id === id)) || [];
            showNotification(`${isLogin ? 'Đăng nhập' : 'Đăng ký'} thành công!`, 'success');
            closeAuthModal();
            updateProfile();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server!', 'error');
    } finally {
        hideLoading();
    }
});

const videoUploadModal = document.getElementById('video-upload-modal');
document.getElementById('upload-video-btn')?.addEventListener('click', () => {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để gửi video!', 'error');
        return;
    }
    videoUploadModal.style.display = 'flex';
    anime({
        targets: '.modal-content',
        scale: [0, 1],
        opacity: [0, 1],
        translateY: [-80, 0],
        duration: 1000,
        easing: 'easeOutElastic(1, .4)'
    });
});

videoUploadModal.querySelector('.close-modal').addEventListener('click', () => {
    anime({
        targets: '.modal-content',
        scale: [1, 0],
        opacity: [1, 0],
        translateY: [0, -80],
        duration: 800,
        easing: 'easeInExpo',
        complete: () => videoUploadModal.style.display = 'none'
    });
});

document.getElementById('video-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('video-file').files[0];
    const note = document.getElementById('video-note').value;
    if (file && currentUser) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('note', note);

        try {
            const response = await fetch('https://your-aws-backend/api/videos', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            const video = await response.json();
            uploadedVideos.push(video);
            showNotification('Video đã được gửi thành công!', 'success');
            videoUploadModal.style.display = 'none';
            if (currentUser.role === 'teacher') fetchVideos();
        } catch (error) {
            showNotification('Lỗi khi gửi video!', 'error');
        }
    }
});

async function fetchVideos() {
    try {
        const response = await fetch('https://your-aws-backend/api/videos', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        uploadedVideos = await response.json();
        renderFeedbackList();
    } catch (error) {
        showNotification('Không thể tải video!', 'error');
    }
}

let currentRankingIndex = 0;
function renderRanking() {
    const rankingList = document.getElementById('ranking-list');
    const visibleRankings = rankings.slice(currentRankingIndex, currentRankingIndex + 3);
    rankingList.innerHTML = visibleRankings.map((user, i) => `
        <div class="ranking-item ${i + currentRankingIndex < 3 ? 'top-' + (i + currentRankingIndex + 1) : ''}">
            <div class="rank">${i + currentRankingIndex + 1}</div>
            <img src="${user.avatar}" alt="${user.name}" class="rank-avatar" loading="lazy">
            <span>${user.name}</span>
            <span class="points">${user.points} điểm</span>
        </div>
    `).join('');
    anime({
        targets: '.ranking-item',
        translateX: [-80, 0],
        opacity: [0, 1],
        duration: 1200,
        delay: anime.stagger(200),
        easing: 'easeOutExpo'
    });
    document.querySelector('.scroll-down-btn').style.display = currentRankingIndex + 3 < rankings.length ? 'block' : 'none';
    document.querySelector('.scroll-up-btn').style.display = currentRankingIndex > 0 ? 'block' : 'none';
}

document.querySelector('.scroll-down-btn')?.addEventListener('click', () => {
    if (currentRankingIndex + 3 < rankings.length) {
        currentRankingIndex += 3;
        renderRanking();
    }
});

document.querySelector('.scroll-up-btn')?.addEventListener('click', () => {
    if (currentRankingIndex > 0) {
        currentRankingIndex -= 3;
        renderRanking();
    }
});

function updateProfile() {
    if (currentUser) {
        document.getElementById('profile-name').textContent = currentUser.name;
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('points-text').textContent = `Điểm thưởng: ${points}`;
        document.getElementById('level-text').textContent = `Cấp độ: ${level}`;
        document.getElementById('upload-video-btn').style.display = currentUser.role === 'student' ? 'block' : 'none';
        updateProgress();
        renderBadges();
    }
}

async function updateUserProfile(updates) {
    try {
        const response = await fetch(`https://your-aws-backend/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updates)
        });
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser = updatedUser;
            progress = updatedUser.progress;
            points = updatedUser.points;
            level = updatedUser.level;
            badges = updatedUser.badges || [];
            personalCourses = updatedUser.personalCourses.map(id => courses.find(c => c._id === id)) || [];
        }
    } catch (error) {
        showNotification('Không thể cập nhật profile!', 'error');
    }
}

function showLoading() {
    document.querySelector('.loader').style.display = 'flex';
    anime({ targets: '.loader', opacity: [0, 1], scale: [0.8, 1], duration: 500, easing: 'easeOutExpo' });
}

function hideLoading() {
    anime({
        targets: '.loader',
        opacity: 0,
        scale: 0.8,
        duration: 500,
        easing: 'easeInExpo',
        complete: () => document.querySelector('.loader').style.display = 'none'
    });
}

function showChatbotLoading() {
    document.getElementById('chatbot-loading').style.display = 'flex';
    anime({ targets: '#chatbot-loading', opacity: [0, 1], duration: 500, easing: 'easeOutExpo' });
}

function hideChatbotLoading() {
    anime({
        targets: '#chatbot-loading',
        opacity: 0,
        duration: 500,
        easing: 'easeInExpo',
        complete: () => document.getElementById('chatbot-loading').style.display = 'none'
    });
}

function loadData() {
    if (localStorage.getItem('token')) {
        fetchUserProfile();
    }
}

async function fetchUserProfile() {
    try {
        const response = await fetch('https://your-aws-backend/api/users/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            currentUser = await response.json();
            progress = currentUser.progress;
            points = currentUser.points;
            level = currentUser.level;
            badges = currentUser.badges || [];
            personalCourses = currentUser.personalCourses.map(id => courses.find(c => c._id === id)) || [];
            updateProfile();
        }
    } catch (error) {
        showNotification('Không thể tải thông tin người dùng!', 'error');
    }
}

const chatbot = document.getElementById('chatbot');
const chatbotToggle = document.getElementById('chatbot-toggle');

chatbotToggle.addEventListener('click', () => {
    if (chatbot.style.display === 'none' || chatbot.style.display === '') {
        chatbot.style.display = 'flex';
        chatbotToggle.style.display = 'none';
        anime({
            targets: '.chatbot',
            translateX: [140, 0],
            opacity: [0, 1],
            scale: [0.95, 1],
            duration: 1000,
            easing: 'easeOutElastic(1, .4)'
        });
    }
});

chatbot.querySelector('.chatbot-close').addEventListener('click', () => {
    anime({
        targets: '.chatbot',
        translateX: [0, 140],
        opacity: [1, 0],
        scale: [1, 0.95],
        duration: 800,
        easing: 'easeInExpo',
        complete: () => {
            chatbot.style.display = 'none';
            chatbotToggle.style.display = 'block';
        }
    });
});

chatbot.addEventListener('mouseover', () => {
    document.getElementById('predefined-questions').classList.remove('hidden-questions');
    anime({
        targets: '#predefined-questions',
        opacity: [0, 1],
        translateX: [-40, 0],
        duration: 500,
        easing: 'easeOutExpo'
    });
});

chatbot.addEventListener('mouseout', () => {
    document.getElementById('predefined-questions').classList.add('hidden-questions');
    anime({
        targets: '#predefined-questions',
        opacity: [1, 0],
        translateX: [0, -40],
        duration: 500,
        easing: 'easeInExpo'
    });
});

document.getElementById('send-msg').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});
document.getElementById('predefined-questions').addEventListener('change', (e) => {
    if (e.target.value) {
        document.getElementById('chat-input').value = e.target.value;
        sendChatMessage();
        e.target.value = '';
    }
});

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.textContent = message;
    document.querySelector('.chatbot-body').appendChild(userMsg);
    anime({ targets: userMsg, translateY: [30, 0], opacity: [0, 1], duration: 600, easing: 'easeOutExpo' });

    input.value = '';
    showChatbotLoading();

    const predefinedReplies = {
        'làm sao để chơi đàn tranh?': 'Để chơi đàn tranh, bạn cần điều chỉnh dây đúng cao độ, sau đó tập gảy từng nốt cơ bản bằng cách dùng ngón tay cái và ngón trỏ.',
        'các bước tập vovinam cơ bản?': 'Bắt đầu với tư thế đứng cơ bản (ngựa tấn), sau đó học các động tác quyền như đấm thẳng, đá ngang và khóa tay.',
        'làm thế nào để thổi sáo?': 'Học cách kiểm soát hơi thở đều đặn, đặt môi đúng vị trí lỗ thổi và luyện tập bấm lỗ để tạo nốt.'
    };

    let reply;
    if (predefinedReplies[message.toLowerCase()]) {
        reply = predefinedReplies[message.toLowerCase()];
        setTimeout(() => sendBotReply(reply), 800);
    } else {
        reply = 'Tôi là trợ lý FPT. Tôi có thể giúp bạn với các câu hỏi về nhạc cụ dân tộc hoặc Vovinam. Hãy thử hỏi cụ thể hơn nhé!';
        setTimeout(() => sendBotReply(reply), 800);
    }
}

function sendBotReply(reply) {
    const botMsg = document.createElement('div');
    botMsg.className = 'message bot';
    botMsg.textContent = reply;
    document.querySelector('.chatbot-body').appendChild(botMsg);
    anime({ targets: botMsg, translateY: [30, 0], opacity: [0, 1], duration: 600, easing: 'easeOutExpo' });
    hideChatbotLoading();
    document.querySelector('.chatbot-body').scrollTop = document.querySelector('.chatbot-body').scrollHeight;
}

const hamburger = document.querySelector('.hamburger');
hamburger.addEventListener('click', () => {
    const nav = document.querySelector('.nav-menu');
    nav.classList.toggle('active');
    anime({
        targets: '.nav-menu.active li',
        translateX: [-60, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(150),
        easing: 'easeOutExpo'
    });
});

// Flashcard Logic
let currentCardIndex = 0;
let currentCategory = 'sao';
let flashcardsData = [];

async function initFlashcards() {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để ôn tập flashcard!', 'error');
        document.getElementById('flashcards').style.display = 'none';
        openAuthModal('Đăng nhập');
        return;
    }

    const flashcard = document.getElementById('flashcard');
    const flashcardFront = document.querySelector('.flashcard-front');
    const flashcardBack = document.querySelector('.flashcard-back');
    const flashcardProgress = document.getElementById('flashcard-progress');
    const categorySelect = document.getElementById('flashcard-category');
    const testModal = document.getElementById('flashcard-test-modal');
    const testContent = document.getElementById('flashcard-test-content');

    flashcardsData = await fetchFlashcards(currentCategory);

    function updateCard() {
        if (flashcardsData.length === 0) return;
        flashcardFront.textContent = flashcardsData[currentCardIndex].question;
        flashcardBack.textContent = flashcardsData[currentCardIndex].answer;
        flashcardProgress.textContent = `${currentCardIndex + 1}/${flashcardsData.length}`;
        flashcard.classList.remove('flipped');
    }

    categorySelect.addEventListener('change', async (e) => {
        currentCategory = e.target.value;
        currentCardIndex = 0;
        flashcardsData = await fetchFlashcards(currentCategory);
        updateCard();
    });

    flashcard.addEventListener('click', () => {
        flashcard.classList.toggle('flipped');
    });

    document.getElementById('prev-card').addEventListener('click', () => {
        if (currentCardIndex > 0) {
            currentCardIndex--;
            updateCard();
        }
    });

    document.getElementById('next-card').addEventListener('click', () => {
        if (currentCardIndex < flashcardsData.length - 1) {
            currentCardIndex++;
            updateCard();
        }
    });

    document.getElementById('test-flashcard').addEventListener('click', () => {
        if (!currentUser) return;

        testContent.innerHTML = flashcardsData.map((card, index) => `
            <div class="flashcard-test-item" data-index="${index}">
                <p>Câu hỏi ${index + 1}: ${card.question}</p>
                <input type="text" class="flashcard-test-input" placeholder="Nhập đáp án của bạn" data-answer="${card.answer}">
            </div>
        `).join('');

        testModal.style.display = 'flex';
        anime({
            targets: '.modal-content',
            scale: [0, 1],
            opacity: [0, 1],
            translateY: [-80, 0],
            duration: 1000,
            easing: 'easeOutElastic(1, .4)'
        });
    });

    testModal.querySelector('.close-modal').addEventListener('click', () => {
        anime({
            targets: '.modal-content',
            scale: [1, 0],
            opacity: [1, 0],
            translateY: [0, -80],
            duration: 800,
            easing: 'easeInExpo',
            complete: () => testModal.style.display = 'none'
        });
    });

    document.getElementById('submit-test').addEventListener('click', async () => {
        const inputs = testContent.querySelectorAll('.flashcard-test-input');
        let score = 0;

        inputs.forEach(input => {
            const userAnswer = input.value.toLowerCase().trim();
            const correctAnswer = input.dataset.answer.toLowerCase().trim();
            if (userAnswer === correctAnswer) {
                score += 10;
            }
        });

        points += score;
        updateLevel();
        checkBadges();
        await updateUserProfile({ points, level, badges });
        updateProgress();
        showNotification(`Bạn đã hoàn thành bài kiểm tra! +${score} điểm`, 'success');
        updateProfile();
        updateRanking();

        anime({
            targets: '.modal-content',
            scale: [1, 0],
            opacity: [1, 0],
            translateY: [0, -80],
            duration: 800,
            easing: 'easeInExpo',
            complete: () => testModal.style.display = 'none'
        });
    });

    updateCard();
}

async function fetchFlashcards(category) {
    try {
        const response = await fetch(`https://your-aws-backend/api/flashcards/${category}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        return await response.json();
    } catch (error) {
        showNotification('Không thể tải flashcards!', 'error');
        return [];
    }
}

async function updateRanking() {
    if (currentUser) {
        try {
            const response = await fetch('https://your-aws-backend/api/rankings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: currentUser.id, name: currentUser.name, points, avatar: currentUser.avatar })
            });
            rankings = await response.json();
            renderRanking();
        } catch (error) {
            showNotification('Không thể cập nhật bảng xếp hạng!', 'error');
        }
    }
}