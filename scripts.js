/* ============================================
   SLIDESHOW HERO
============================================ */

document.addEventListener('DOMContentLoaded', async function () {
  const track = document.getElementById('slidesTrack');
  const btnPrev = document.getElementById('slidePrev');
  const btnNext = document.getElementById('slideNext');

  if (!track || !btnPrev || !btnNext) {
    console.warn('Slideshow: elemen track/tombol tidak ditemukan', {
      track,
      btnPrev,
      btnNext
    });
    return;
  }

  async function renderFeaturedSlides() {
    const { data: featuredPosts, error } = await supabaseClient
      .from('posts')
      .select(`
        *,
        profiles (
          username
        )
      `)
      .eq('status', 'approved')
      .eq('is_featured', true)
      .order('approved_at', { ascending: false });

    if (error) {
      console.error('Gagal mengambil featured posts:', error);
      return;
    }

    if (!featuredPosts || featuredPosts.length === 0) {
      return;
    }

    const hiddenClones = track.querySelectorAll('.slide[aria-hidden="true"]');
    const firstHiddenClone = hiddenClones[0] || null;

    featuredPosts.forEach((post) => {
      const alreadyExists = track.querySelector(
        `.featured-slide[data-featured-id="${post.id}"]`
      );

      if (alreadyExists) return;

      const slide = document.createElement('div');
      slide.className = 'slide featured-slide';
      slide.dataset.featuredId = post.id;

      const username = post.profiles?.username || 'User';

      slide.innerHTML = `
        <img src="${post.image_url}" alt="Featured karya ${username}">

        <div class="featured-slide-info">
          <span>${post.category}</span>
          <h2>${username}</h2>
          <p>${post.description || ''}</p>
        </div>
      `;

      if (firstHiddenClone) {
        track.insertBefore(slide, firstHiddenClone);
      } else {
        track.appendChild(slide);
      }
    });
  }

  await renderFeaturedSlides();

  const allSlides = Array.from(track.querySelectorAll('.slide'));

  const slides = allSlides.filter((slide) => {
    return slide.getAttribute('aria-hidden') !== 'true';
  });

  if (slides.length === 0) {
    console.warn('Slideshow: tidak ada slide asli di dalam #slidesTrack');
    return;
  }

  let current = 0;
  let autoTimer = null;

  const INTERVAL = 3000;
  const RESET_WAIT = 5000;

  function updateActiveSlide() {
    allSlides.forEach((slide) => {
      slide.classList.remove('active');
    });

    slides[current].classList.add('active');
  }

  function goTo(index, animate = true) {
    if (index < 0) {
      current = slides.length - 1;
    } else if (index >= slides.length) {
      current = 0;
    } else {
      current = index;
    }

    const viewport = track.parentElement;
    const targetSlide = slides[current];

    const offset =
      targetSlide.offsetLeft -
      (viewport.clientWidth - targetSlide.offsetWidth) / 2;

    track.style.transition = animate
      ? 'transform .65s cubic-bezier(.4,0,.2,1)'
      : 'none';

    track.style.transform = `translate3d(-${offset}px, 0, 0)`;

    updateActiveSlide();
  }

  function next() {
    goTo(current + 1);
  }

  function prev() {
    goTo(current - 1);
  }

  function startAuto() {
    stopAuto();

    if (slides.length <= 1) return;

    autoTimer = setInterval(next, INTERVAL);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  goTo(0, false);
  startAuto();

  btnNext.addEventListener('click', () => {
    stopAuto();
    next();
    setTimeout(startAuto, RESET_WAIT);
  });

  btnPrev.addEventListener('click', () => {
    stopAuto();
    prev();
    setTimeout(startAuto, RESET_WAIT);
  });

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopAuto() : startAuto();
  });

  window.addEventListener('resize', () => {
    goTo(current, false);
  });
});


/* ============================================
   GALERI — drag-to-scroll (desktop)
   ============================================ */
(function () {
  const swipe = document.querySelector('.galeri-swipe');
  if (!swipe) return;
 
  let isDown    = false;
  let startX    = 0;
  let scrollLeft = 0;
 
  swipe.addEventListener('mousedown', (e) => {
    isDown = true;
    swipe.classList.add('dragging');
    startX     = e.pageX - swipe.offsetLeft;
    scrollLeft = swipe.scrollLeft;
  });
 
  swipe.addEventListener('mouseleave', () => { isDown = false; swipe.classList.remove('dragging'); });
  swipe.addEventListener('mouseup',    () => { isDown = false; swipe.classList.remove('dragging'); });
 
  swipe.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x    = e.pageX - swipe.offsetLeft;
    const walk = (x - startX) * 1.2;
    swipe.scrollLeft = scrollLeft - walk;
  });
})();
 

/* ============================================
   NAV AUTH STATUS
============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const navAuth = document.getElementById('navAuth');

  if (!navAuth) return;

  const currentUser = JSON.parse(localStorage.getItem('xdkv3_currentUser'));

  async function hasUnreadMessages(userId) {
    const { count, error } = await supabaseClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Gagal cek unread messages:', error);
      return false;
    }

    return count > 0;
  }

  async function hasNewLikeActivities(userId) {
    const lastSeen =
      localStorage.getItem(`xdkv3_lastInboxSeen_${userId}`) ||
      '1970-01-01T00:00:00.000Z';

    const { count, error } = await supabaseClient
      .from('post_likes')
      .select(`
        id,
        posts!inner (
          user_id
        )
      `, { count: 'exact', head: true })
      .eq('posts.user_id', userId)
      .neq('user_id', userId)
      .gt('created_at', lastSeen);

    if (error) {
      console.error('Gagal cek aktivitas like baru:', error);
      return false;
    }

    return count > 0;
  }

  async function renderAdminShortcut() {
    const adminShortcutWrap = document.getElementById('adminShortcutWrap');

    if (!adminShortcutWrap) return;

    const { data: authData, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !authData.user) {
      adminShortcutWrap.classList.remove('is-visible');
      return;
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      adminShortcutWrap.classList.remove('is-visible');
      return;
    }

    if (profile.role === 'admin') {
      adminShortcutWrap.classList.add('is-visible');
    } else {
      adminShortcutWrap.classList.remove('is-visible');
    }
  }

  if (!currentUser) {
    navAuth.innerHTML = `
      <a href="login.html" class="login-chip">
        <span>Login untuk upload</span>
      </a>
    `;

    await renderAdminShortcut();
    return;
  }

  const unreadMessages = await hasUnreadMessages(currentUser.id);
  const newLikeActivities = await hasNewLikeActivities(currentUser.id);

  const unread = unreadMessages || newLikeActivities;

  navAuth.innerHTML = `
    <a
      href="inbox.html"
      class="nav-chat-btn ${unread ? 'has-unread' : ''}"
      title="Pesan"
      aria-label="Pesan"
    >
      💬
    </a>

    <a href="profile.html" class="profile-chip">
      <img src="${currentUser.avatar || 'images/pp-01.png'}" alt="Profile">
      <span>${currentUser.username}</span>
    </a>
  `;

  await renderAdminShortcut();
});

/* ============================================
   LOGIN TOAST REMINDER
============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const toast = document.getElementById('loginToast');
  const closeBtn = document.getElementById('closeLoginToast');

  if (!toast) return;

  const currentUser = JSON.parse(localStorage.getItem('xdkv3_currentUser'));
  const toastClosed = sessionStorage.getItem('xdkv3_loginToastClosed');

  if (currentUser) return;

  if (toastClosed === 'true') return;

  setTimeout(() => {
    toast.classList.add('show');
  }, 1200);

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('show');
      sessionStorage.setItem('xdkv3_loginToastClosed', 'true');
    });
  }
});










/*supabase */

/* ============================================
   RENDER APPROVED POSTS FROM SUPABASE
============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  async function setupLikeButtons() {
  const likeButtons = document.querySelectorAll('.post-like-btn');

  if (!likeButtons.length) return;

  const { data: authData } = await supabaseClient.auth.getUser();
  const currentUser = authData?.user || null;

  const postIds = Array.from(likeButtons).map((button) => {
    return button.dataset.postId;
  });

  const { data: likes, error } = await supabaseClient
    .from('post_likes')
    .select('post_id, user_id')
    .in('post_id', postIds);

  if (error) {
    console.error('Gagal mengambil likes:', error);
    return;
  }

  const likeCountMap = new Map();
  const likedByMeSet = new Set();

  likes.forEach((like) => {
    likeCountMap.set(
      like.post_id,
      (likeCountMap.get(like.post_id) || 0) + 1
    );

    if (currentUser && like.user_id === currentUser.id) {
      likedByMeSet.add(like.post_id);
    }
  });

  likeButtons.forEach((button) => {
    const postId = button.dataset.postId;
    const countSpan = button.querySelector('.like-count');

    const count = likeCountMap.get(postId) || 0;

    if (countSpan) {
      countSpan.textContent = count;
    }

    if (likedByMeSet.has(postId)) {
      button.classList.add('is-liked');
      button.firstChild.textContent = '♥ ';
    }

    button.addEventListener('click', async () => {
      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      button.disabled = true;

      const isLiked = button.classList.contains('is-liked');

      if (isLiked) {
        const { error: unlikeError } = await supabaseClient
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (!unlikeError) {
          button.classList.remove('is-liked');
          button.firstChild.textContent = '♡ ';

          const currentCount = Number(countSpan.textContent || 0);
          countSpan.textContent = Math.max(0, currentCount - 1);
        }
      } else {
        const { error: likeError } = await supabaseClient
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id
          });

        if (!likeError) {
          button.classList.add('is-liked');
          button.firstChild.textContent = '♥ ';

          const currentCount = Number(countSpan.textContent || 0);
          countSpan.textContent = currentCount + 1;
        }
      }

      button.disabled = false;
    });
  });
}
  const karyaScroll =
    document.getElementById('karyaScroll') ||
    document.querySelector('.karya-scroll');

  if (!karyaScroll) {
    console.warn('Elemen karyaScroll / .karya-scroll tidak ditemukan.');
    return;
  }

  function formatDate(dateString) {
    if (!dateString) return '';

    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  async function getApprovedPosts() {
    const { data, error } = await supabaseClient
      .from('posts')
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });

    if (error) {
      console.error('Gagal mengambil approved posts:', error);
      return [];
    }

    return data || [];
  }

  async function renderApprovedPosts() {
    const posts = await getApprovedPosts();

    karyaScroll.innerHTML = '';

    if (posts.length === 0) {
      karyaScroll.innerHTML = `
        <div class="empty-karya">
          <h3>Belum ada karya yang tampil.</h3>
          <p>Karya akan muncul setelah admin approve postingan.</p>
        </div>
      `;
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement('article');
      card.className = 'karya-card';

      const username = post.profiles?.username || 'User';
      const avatar = post.profiles?.avatar_url || 'images/pp-01.png';

      const imageClass =
        post.aspect_mode === 'original'
          ? 'aspect-original'
          : 'aspect-square';

      card.innerHTML = `
  <span class="kategori">
    ${post.category}
  </span>

  <div class="karya-image ${imageClass}">
    <img src="${post.image_url}" alt="Karya dari ${username}">
  </div>

  <div class="creator">

    <a href="profile.html?userId=${post.user_id}" class="creator-avatar-link">
      <img class="creator-pp"
        src="${avatar}"
        alt="Profile">
    </a>

    <div class="creator-info">

      <a href="profile.html?userId=${post.user_id}" class="creator-name-link">
        <h4>${username}</h4>
      </a>

      <span class="post-type-label">
        ${post.post_type}
      </span>

      <p>
        ${post.description || ''}
      </p>

      <div class="post-bottom-row">
  <span class="tanggal">
    ${formatDate(post.approved_at || post.created_at)}
  </span>

  <div class="post-actions">
    <button
      type="button"
      class="post-like-btn"
      data-post-id="${post.id}"
      aria-label="Like"
    >
      ♡ <span class="like-count" data-like-count="${post.id}">0</span>
    </button>

    <a
      href="chat.html?userId=${post.user_id}&postId=${post.id}"
      class="post-chat-btn"
      title="Chat"
      aria-label="Chat"
    >
      💬
    </a>
  </div>
</div>
`;

      karyaScroll.appendChild(card);
    });
  }

    await renderApprovedPosts();
  await setupLikeButtons();
});
