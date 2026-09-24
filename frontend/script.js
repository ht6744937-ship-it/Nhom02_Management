/* ============================================================
   PawnCare — script.js
   File JS DÙNG CHUNG cho tất cả các trang.

   Vì Back-End nhóm chưa xong, các hàm auth/forum/notification/
   campaign ở đây là MOCK: dữ liệu được lưu tạm trong
   localStorage của trình duyệt. Khi API thật sẵn sàng, chỉ cần
   thay phần bên trong các hàm registerUser(), loginUser(),
   fetchPosts()... bằng fetch()/axios gọi API — phần HTML/CSS
   và cách gọi hàm ở các trang không cần đổi.
   ============================================================ */

const STORAGE_KEYS = {
  USERS: "pawncare_users",
  CURRENT_USER: "pawncare_current_user",
  NOTIFICATIONS: "pawncare_notifications",
  FORUM_POSTS: "pawncare_forum_posts",
  CAMPAIGN_REGS: "pawncare_campaign_regs",
};

/* ---------------- Helpers lưu trữ (localStorage) ---------------- */
function getData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatTimeAgo(timestamp) {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   1 & 2 & 3. AUTHENTICATION — Login / Register / Logout
   ============================================================ */
function getUsers() {
  return getData(STORAGE_KEYS.USERS, []);
}

function getCurrentUser() {
  return getData(STORAGE_KEYS.CURRENT_USER, null);
}

async function registerUser({ name, email, phone, password }) {
    const response = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            email,
            phone,
            password
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message);
    }

    return data.user;
}

async function loginUser({ email, password }) {
    const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message);
    }

    setData(STORAGE_KEYS.CURRENT_USER, data.user);

    return data.user;
}

function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

/* ---------------- Render trạng thái auth trên header ---------------- */
function renderHeaderAuth() {
  const guestBox = document.getElementById("authGuest");
  const userBox = document.getElementById("authUser");
  if (!guestBox || !userBox) return;

  const user = getCurrentUser();
  if (user) {
    guestBox.hidden = true;
    userBox.hidden = false;
    const initialEl = document.getElementById("userInitial");
    const nameEl = document.getElementById("userName");
    if (initialEl) initialEl.textContent = user.name.trim().charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = user.name;
  } else {
    guestBox.hidden = false;
    userBox.hidden = true;
  }
}

/* ============================================================
   6. NOTIFICATION — badge + trang thông báo
   ============================================================ */
function seedNotificationsIfEmpty() {
  const existing = getData(STORAGE_KEYS.NOTIFICATIONS, null);
  if (existing) return existing;

  const now = Date.now();
  const seeded = [
    {
      id: 1,
      icon: "📅",
      title: "Lịch hẹn sắp tới",
      desc: "Boss Mít có lịch khám sức khỏe định kỳ vào 9:00 sáng mai.",
      time: now - 2 * 60 * 60 * 1000,
      read: false,
    },
    {
      id: 2,
      icon: "🎉",
      title: "Ưu đãi tháng 9",
      desc: "Giảm 20% dịch vụ Spa & Tỉa lông cho khách hàng thân thiết.",
      time: now - 26 * 60 * 60 * 1000,
      read: false,
    },
    {
      id: 3,
      icon: "💬",
      title: "Phản hồi diễn đàn",
      desc: "Có người vừa bình luận vào bài viết của bạn trên Diễn đàn.",
      time: now - 50 * 60 * 60 * 1000,
      read: true,
    },
  ];
  setData(STORAGE_KEYS.NOTIFICATIONS, seeded);
  return seeded;
}

function renderNotifBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  const list = seedNotificationsIfEmpty();
  const unread = list.filter((n) => !n.read).length;
  if (unread > 0) {
    badge.hidden = false;
    badge.textContent = unread > 9 ? "9+" : String(unread);
  } else {
    badge.hidden = true;
  }
}

function initNotificationsPage() {
  const listEl = document.getElementById("notifList");
  if (!listEl) return;

  function draw() {
    const list = seedNotificationsIfEmpty().sort((a, b) => b.time - a.time);

    if (list.length === 0) {
      listEl.innerHTML = "";
      document.getElementById("notifEmpty").hidden = false;
      return;
    }
    document.getElementById("notifEmpty").hidden = true;

    listEl.innerHTML = list
      .map(
        (n) => `
        <div class="notif-item ${n.read ? "read" : "unread"}" data-id="${n.id}">
          <span class="notif-dot"></span>
          <span class="notif-icon">${n.icon}</span>
          <div>
            <p class="notif-title">${escapeHTML(n.title)}</p>
            <p class="notif-desc">${escapeHTML(n.desc)}</p>
            <p class="notif-time">${formatTimeAgo(n.time)}</p>
          </div>
        </div>`
      )
      .join("");

    listEl.querySelectorAll(".notif-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = Number(el.dataset.id);
        const all = getData(STORAGE_KEYS.NOTIFICATIONS, []);
        const target = all.find((n) => n.id === id);
        if (target) target.read = true;
        setData(STORAGE_KEYS.NOTIFICATIONS, all);
        draw();
        renderNotifBadge();
      });
    });
  }

  const markAllBtn = document.getElementById("markAllRead");
  if (markAllBtn) {
    markAllBtn.addEventListener("click", () => {
      const all = getData(STORAGE_KEYS.NOTIFICATIONS, []).map((n) => ({
        ...n,
        read: true,
      }));
      setData(STORAGE_KEYS.NOTIFICATIONS, all);
      draw();
      renderNotifBadge();
    });
  }

  draw();
}

/* ============================================================
   5. FORUM — đăng bài / xem bài / like
   ============================================================ */
function seedForumIfEmpty() {
  const existing = getData(STORAGE_KEYS.FORUM_POSTS, null);
  if (existing) return existing;

  const now = Date.now();
  const seeded = [
    {
      id: 1,
      author: "Minh Anh",
      time: now - 3 * 60 * 60 * 1000,
      content:
        "Mọi người ơi, bé mèo nhà mình dạo này hay lười ăn, có ai gặp tình trạng tương tự chưa ạ? 🐱",
      likes: 5,
      liked: false,
    },
    {
      id: 2,
      author: "Thanh Tùng",
      time: now - 20 * 60 * 60 * 1000,
      content:
        "Vừa cho bé Golden nhà mình đi spa ở PawnCare về, cực kỳ hài lòng luôn! Lông mượt hẳn ra 😍",
      likes: 12,
      liked: false,
    },
  ];
  setData(STORAGE_KEYS.FORUM_POSTS, seeded);
  return seeded;
}

function initForumPage() {
  const listEl = document.getElementById("postList");
  if (!listEl) return;

  const user = getCurrentUser();
  const composerBox = document.getElementById("composerBox");
  const lockedBox = document.getElementById("composerLocked");

  if (user) {
    if (composerBox) composerBox.hidden = false;
    if (lockedBox) lockedBox.hidden = true;
  } else {
    if (composerBox) composerBox.hidden = true;
    if (lockedBox) lockedBox.hidden = false;
  }

  function draw() {
    const posts = seedForumIfEmpty().sort((a, b) => b.time - a.time);
    listEl.innerHTML = posts
      .map(
        (p) => `
        <article class="post-card" data-id="${p.id}">
          <div class="post-head">
            <span class="avatar">${escapeHTML(p.author.charAt(0))}</span>
            <div>
              <p class="post-author">${escapeHTML(p.author)}</p>
              <p class="post-time">${formatTimeAgo(p.time)}</p>
            </div>
          </div>
          <p class="post-body">${escapeHTML(p.content)}</p>
          <div class="post-actions">
            <button class="post-action ${p.liked ? "liked" : ""}" data-action="like">
              👍 <span>${p.liked ? "Đã thích" : "Thích"} (${p.likes})</span>
            </button>
            <span class="post-action" style="cursor:default">💬 Bình luận</span>
          </div>
        </article>`
      )
      .join("");

    listEl.querySelectorAll('[data-action="like"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".post-card");
        const id = Number(card.dataset.id);
        const posts = getData(STORAGE_KEYS.FORUM_POSTS, []);
        const post = posts.find((p) => p.id === id);
        if (!post) return;
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        setData(STORAGE_KEYS.FORUM_POSTS, posts);
        draw();
      });
    });
  }

  const submitBtn = document.getElementById("submitPost");
  const textarea = document.getElementById("postContent");
  if (submitBtn && textarea) {
    submitBtn.addEventListener("click", () => {
      const content = textarea.value.trim();
      if (!content) {
        textarea.focus();
        return;
      }
      const posts = getData(STORAGE_KEYS.FORUM_POSTS, []);
      posts.unshift({
        id: Date.now(),
        author: user ? user.name : "Ẩn danh",
        time: Date.now(),
        content,
        likes: 0,
        liked: false,
      });
      setData(STORAGE_KEYS.FORUM_POSTS, posts);
      textarea.value = "";
      draw();
    });
  }

  draw();
}

/* ============================================================
   7. REGISTER CAMPAIGNS — đăng ký tham gia chiến dịch
   ============================================================ */
const CAMPAIGNS = [
  {
    id: "vaccine-day",
    icon: "💉",
    date: "05/10/2026",
    title: "Ngày hội tiêm phòng miễn phí",
    desc: "Tiêm phòng dại & các bệnh truyền nhiễm miễn phí cho thú cưng trong khu vực.",
  },
  {
    id: "adoption-day",
    icon: "🐾",
    date: "18/10/2026",
    title: "Ngày hội nhận nuôi thú cưng",
    desc: "Kết nối các bé chó mèo mồ côi với những gia đình mới đầy yêu thương.",
  },
  {
    id: "donate-food",
    icon: "🍖",
    date: "30/10/2026",
    title: "Quyên góp thức ăn cho trạm cứu hộ",
    desc: "Chung tay đóng góp thức ăn, vật dụng cho các trạm cứu hộ động vật.",
  },
];

function getCampaignRegs() {
  return getData(STORAGE_KEYS.CAMPAIGN_REGS, []);
}

function isRegistered(campaignId) {
  const user = getCurrentUser();
  if (!user) return false;
  return getCampaignRegs().some(
    (r) => r.campaignId === campaignId && r.email === user.email
  );
}

function initCampaignsPage() {
  const grid = document.getElementById("campaignGrid");
  if (!grid) return;

  function draw() {
    grid.innerHTML = CAMPAIGNS.map(
      (c) => `
      <article class="campaign-card">
        <div class="campaign-banner" style="background:var(--card)">${c.icon}</div>
        <div class="campaign-body">
          <span class="campaign-date">${c.date}</span>
          <h3>${escapeHTML(c.title)}</h3>
          <p>${escapeHTML(c.desc)}</p>
          <button class="btn-register ${isRegistered(c.id) ? "registered" : ""}" data-id="${c.id}">
            ${isRegistered(c.id) ? "✓ Đã đăng ký" : "Đăng ký tham gia"}
          </button>
        </div>
      </article>`
    ).join("");

    grid.querySelectorAll(".btn-register").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("registered")) return;
        openCampaignModal(btn.dataset.id);
      });
    });
  }

  /* ---- modal đăng ký ---- */
  const overlay = document.getElementById("campaignModal");
  const closeBtn = document.getElementById("campaignModalClose");
  const form = document.getElementById("campaignForm");
  const titleEl = document.getElementById("campaignModalTitle");
  const msgEl = document.getElementById("campaignFormMessage");
  let activeCampaignId = null;

  function openCampaignModal(campaignId) {
    const campaign = CAMPAIGNS.find((c) => c.id === campaignId);
    activeCampaignId = campaignId;
    titleEl.textContent = `Đăng ký: ${campaign.title}`;
    msgEl.classList.remove("show", "success", "error");
    form.reset();

    const user = getCurrentUser();
    if (user) {
      form.elements.regName.value = user.name;
      form.elements.regEmail.value = user.email;
    }
    overlay.hidden = false;
  }

  function closeCampaignModal() {
    overlay.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", closeCampaignModal);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeCampaignModal();
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.elements.regName.value.trim();
      const phone = form.elements.regPhone.value.trim();
      const email = form.elements.regEmail.value.trim();

      if (!name || !phone || !email) {
        msgEl.textContent = "Vui lòng điền đầy đủ thông tin.";
        msgEl.classList.remove("success");
        msgEl.classList.add("show", "error");
        return;
      }

      const regs = getCampaignRegs();
      regs.push({ campaignId: activeCampaignId, name, phone, email, at: Date.now() });
      setData(STORAGE_KEYS.CAMPAIGN_REGS, regs);

      msgEl.textContent = "Đăng ký thành công! Cảm ơn bạn đã đồng hành cùng PawnCare 💛";
      msgEl.classList.remove("error");
      msgEl.classList.add("show", "success");

      setTimeout(() => {
        closeCampaignModal();
        draw();
      }, 1200);
    });
  }

  draw();
}

/* ============================================================
   FORM VALIDATION HELPERS (login / register)
   ============================================================ */
function showFieldError(fieldWrap, message) {
  fieldWrap.classList.add("invalid");
  const errEl = fieldWrap.querySelector(".field-error");
  if (errEl) errEl.textContent = message;
}

function clearFieldError(fieldWrap) {
  fieldWrap.classList.remove("invalid");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^(0|\+84)\d{9,10}$/.test(value.replace(/\s/g, ""));
}

function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const msgEl = document.getElementById("loginMessage");

  form.addEventListener("submit",async (e) => {
    e.preventDefault();
    let valid = true;

    const emailWrap = form.querySelector('[data-field="email"]');
    const passWrap = form.querySelector('[data-field="password"]');
    clearFieldError(emailWrap);
    clearFieldError(passWrap);

    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    if (!isValidEmail(email)) {
      showFieldError(emailWrap, "Email không hợp lệ.");
      valid = false;
    }
    if (!password) {
      showFieldError(passWrap, "Vui lòng nhập mật khẩu.");
      valid = false;
    }
    if (!valid) return;

    try {
    await loginUser({ email, password });
    window.location.href = "./index.html";
} catch (err) {
    msgEl.textContent = err.message;
}
  });

  // hiển thị thông báo nếu vừa đăng ký thành công (?registered=1)
  const params = new URLSearchParams(window.location.search);
  if (params.get("registered") === "1") {
    msgEl.textContent = "Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.";
    msgEl.classList.remove("error");
    msgEl.classList.add("show", "success");
  }
}

function initRegisterPage() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const msgEl = document.getElementById("registerMessage");

  form.addEventListener("submit", async(e) => {
    e.preventDefault();
    let valid = true;

    const fields = ["name", "email", "phone", "password", "confirmPassword"];
    fields.forEach((f) => clearFieldError(form.querySelector(`[data-field="${f}"]`)));

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const phone = form.elements.phone.value.trim();
    const password = form.elements.password.value;
    const confirmPassword = form.elements.confirmPassword.value;
    const agree = form.elements.agree.checked;

    if (name.length < 2) {
      showFieldError(form.querySelector('[data-field="name"]'), "Vui lòng nhập họ tên hợp lệ.");
      valid = false;
    }
    if (!isValidEmail(email)) {
      showFieldError(form.querySelector('[data-field="email"]'), "Email không hợp lệ.");
      valid = false;
    }
    if (!isValidPhone(phone)) {
      showFieldError(form.querySelector('[data-field="phone"]'), "Số điện thoại không hợp lệ.");
      valid = false;
    }
    if (password.length < 6) {
      showFieldError(form.querySelector('[data-field="password"]'), "Mật khẩu tối thiểu 6 ký tự.");
      valid = false;
    }
    if (confirmPassword !== password) {
      showFieldError(form.querySelector('[data-field="confirmPassword"]'), "Mật khẩu nhập lại không khớp.");
      valid = false;
    }
    if (!valid) return;

    if (!agree) {
      msgEl.textContent = "Vui lòng đồng ý với điều khoản sử dụng.";
      msgEl.classList.remove("success");
      msgEl.classList.add("show", "error");
      return;
    }

    try {
    await registerUser({ name, email, phone, password });
    window.location.href = "./login.html?registered=1";
} catch (err) {
    msgEl.textContent = err.message;
}
  });
}

/* ============================================================
   CONTACT FORM (trang chủ)
   ============================================================ */
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  const msgEl = document.getElementById("contactMessage");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msgEl.textContent = "Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.";
    msgEl.classList.remove("error");
    msgEl.classList.add("show", "success");
    form.reset();
  });
}

/* ============================================================
   KHỞI TẠO DÙNG CHUNG CHO MỌI TRANG
   ============================================================ */
function initCommon() {
  renderHeaderAuth();
  renderNotifBadge();

  // menu mobile
  const menuToggle = document.getElementById("menuToggle");
  const menu = document.getElementById("menu");
  if (menuToggle && menu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // dropdown avatar
  const avatarBtn = document.getElementById("avatarBtn");
  const dropdown = document.getElementById("userDropdown");
  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
    });
    document.addEventListener("click", () => {
      dropdown.hidden = true;
    });
  }

  // đăng xuất (task "Logout")
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
      window.location.href = "./index.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initCommon();
  initLoginPage();
  initRegisterPage();
  initForumPage();
  initNotificationsPage();
  initCampaignsPage();
  initContactForm();
});
