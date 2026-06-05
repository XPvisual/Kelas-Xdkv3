document.addEventListener('DOMContentLoaded', async () => {
  const reviewList = document.getElementById('reviewList');
  const approvedAdminList = document.getElementById('approvedAdminList');

  if (!reviewList) {
    console.warn('Elemen reviewList tidak ditemukan.');
    return;
  }

  async function getCurrentUserProfile() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (profileError) {
      console.error(profileError);
      return null;
    }

    return profile;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';

    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  async function checkAdminAccess() {
    const profile = await getCurrentUserProfile();

    if (!profile) {
      alert('Kamu harus login dulu.');
      window.location.href = 'login.html';
      return false;
    }

    if (profile.role !== 'admin') {
      alert('Halaman ini khusus admin.');
      window.location.href = 'index.html';
      return false;
    }

    return true;
  }

  async function getPendingPosts() {
    const { data, error } = await supabaseClient
      .from('posts')
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      alert('Gagal mengambil pending posts.');
      return [];
    }

    return data || [];
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
      console.error(error);
      return [];
    }

    return data || [];
  }

  async function renderPendingPosts() {
    const posts = await getPendingPosts();

    reviewList.innerHTML = '';

    if (posts.length === 0) {
      reviewList.innerHTML = `
        <div class="empty-review">
          <h2>Tidak ada request</h2>
          <p>Semua postingan sudah direview.</p>
        </div>
      `;
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement('article');
      card.className = 'review-card';
      card.dataset.id = post.id;

      const username = post.profiles?.username || 'User';
      const imageClass = post.aspect_mode === 'original'
        ? 'aspect-original'
        : 'aspect-square';

      card.innerHTML = `
        <div class="review-content">

          <div>
            <div class="review-image ${imageClass}">
              <img src="${post.image_url}" alt="Karya dari ${username}">
            </div>

            <h2 class="request-user">
              ${username} meminta review
            </h2>
          </div>

          <div class="review-info">

            <div class="review-meta">
              <p>${post.category}</p>
              <p>${post.post_type}</p>
            </div>

            <p class="review-description">
              ${post.description || ''}
            </p>

            <span class="work-date">
              ${formatDate(post.created_at)}
            </span>

            <div class="review-actions">
              <button class="review-btn approve-btn" data-action="approve">
                Approve
              </button>

              <button class="review-btn decline-btn" data-action="decline">
                Decline
              </button>
            </div>

          </div>

        </div>
      `;

      reviewList.appendChild(card);
    });
  }

  async function renderApprovedWorks() {
    if (!approvedAdminList) return;

    const posts = await getApprovedPosts();

    approvedAdminList.innerHTML = '';

    if (posts.length === 0) {
      approvedAdminList.innerHTML = `
        <p class="empty-approved-text">
          Belum ada karya approved.
        </p>
      `;
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement('article');
      card.className = 'approved-admin-card';
      card.dataset.id = post.id;

      const username = post.profiles?.username || 'User';

      card.innerHTML = `
        <div class="approved-admin-image">
          <img src="${post.image_url}" alt="Karya ${username}">
        </div>

        <div class="approved-admin-info">
          <h3>${username}</h3>
          <p>${post.category}</p>
          <p>${post.description || ''}</p>

          <button
            type="button"
            class="feature-btn ${post.is_featured ? 'active' : ''}"
            data-id="${post.id}"
          >
            ${post.is_featured ? 'Remove Featured' : 'Set Featured'}
          </button>
        </div>
      `;

      approvedAdminList.appendChild(card);
    });
  }

  async function approvePost(postId) {
    const { error } = await supabaseClient
      .from('posts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        declined_at: null
      })
      .eq('id', postId);

    if (error) {
      console.error(error);
      alert('Gagal approve postingan.');
      return;
    }

    await renderPendingPosts();
    await renderApprovedWorks();
  }

  async function declinePost(postId) {
    const { error } = await supabaseClient
      .from('posts')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
        is_featured: false
      })
      .eq('id', postId);

    if (error) {
      console.error(error);
      alert('Gagal decline postingan.');
      return;
    }

    await renderPendingPosts();
  }

  async function toggleFeatured(postId) {
    const { data: post, error: getError } = await supabaseClient
      .from('posts')
      .select('is_featured')
      .eq('id', postId)
      .single();

    if (getError) {
      console.error(getError);
      alert('Gagal mengambil status featured.');
      return;
    }

    const { error: updateError } = await supabaseClient
      .from('posts')
      .update({
        is_featured: !post.is_featured
      })
      .eq('id', postId);

    if (updateError) {
      console.error(updateError);
      alert('Gagal mengubah featured.');
      return;
    }

    await renderApprovedWorks();
  }

  reviewList.addEventListener('click', async (event) => {
    const button = event.target.closest('.review-btn');

    if (!button) return;

    const card = button.closest('.review-card');
    if (!card) return;

    const postId = card.dataset.id;
    const action = button.dataset.action;

    if (action === 'approve') {
      await approvePost(postId);
    }

    if (action === 'decline') {
      await declinePost(postId);
    }
  });

  document.addEventListener('click', async (event) => {
    const featureBtn = event.target.closest('.feature-btn');

    if (!featureBtn) return;

    const postId = featureBtn.dataset.id;

    await toggleFeatured(postId);
  });

  const isAdmin = await checkAdminAccess();

  if (!isAdmin) return;

  await renderPendingPosts();
  await renderApprovedWorks();
});
