document.addEventListener('DOMContentLoaded', async () => {
  const inboxList = document.getElementById('inboxList');

  const inboxUserAvatar = document.getElementById('inboxUserAvatar');
  const inboxUsername = document.getElementById('inboxUsername');
  const inboxUserChip = document.getElementById('inboxUserChip');

  let currentUser = null;
  let currentProfile = null;

  async function getCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  async function getProfile(userId) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Gagal mengambil profile:', error);
      return null;
    }

    return data;
  }

  async function getProfiles(userIds) {
    if (userIds.length === 0) return [];

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (error) {
      console.error('Gagal mengambil profiles:', error);
      return [];
    }

    return data || [];
  }

  async function getAllMyMessages() {
    const { data, error } = await supabaseClient
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Gagal mengambil messages:', error);
      return [];
    }

    return data || [];
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    const isToday =
      date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
  }

  function escapeHTML(text) {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderCurrentUser() {
    if (!currentProfile) return;

    if (inboxUserAvatar) {
      inboxUserAvatar.src = currentProfile.avatar_url || 'images/pp-01.png';
    }

    if (inboxUsername) {
      inboxUsername.textContent = currentProfile.username || 'User';
    }

    if (inboxUserChip) {
      inboxUserChip.href = 'profile.html';
    }
  }

  async function renderInbox() {
    if (!inboxList) return;

    inboxList.innerHTML = `<p class="inbox-loading">Memuat riwayat chat...</p>`;

    const messages = await getAllMyMessages();

    if (messages.length === 0) {
      inboxList.innerHTML = `
        <p class="inbox-empty">
          Belum ada riwayat chat.
        </p>
      `;
      return;
    }

    const latestByPartner = new Map();

    messages.forEach((message) => {
      const partnerId =
        message.sender_id === currentUser.id
          ? message.receiver_id
          : message.sender_id;

      if (!latestByPartner.has(partnerId)) {
        latestByPartner.set(partnerId, message);
      }
    });

    const partnerIds = Array.from(latestByPartner.keys());
    const profiles = await getProfiles(partnerIds);

    const profileMap = new Map();

    profiles.forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    inboxList.innerHTML = '';

    partnerIds.forEach((partnerId) => {
      const profile = profileMap.get(partnerId);
      const lastMessage = latestByPartner.get(partnerId);

      if (!profile || !lastMessage) return;

      const card = document.createElement('a');
      card.className = 'inbox-card';
      card.href = `chat.html?userId=${profile.id}`;

      const lastChatText =
  lastMessage.sender_id === currentUser.id
    ? `Anda: ${lastMessage.message}`
    : lastMessage.message;

      card.innerHTML = `
  <img
    src="${profile.avatar_url || 'images/pp-01.png'}"
    alt="Profile ${escapeHTML(profile.username || 'User')}"
  >

  <div class="inbox-card-info">
    <h2>${escapeHTML(profile.username || 'User')}</h2>

    <p class="last-chat">
      ${escapeHTML(lastChatText)}
    </p>
  </div>

  <span class="inbox-time">
    ${formatTime(lastMessage.created_at)}
  </span>
`;

      inboxList.appendChild(card);
    });
  }

  currentUser = await getCurrentUser();

  if (!currentUser) {
    alert('Kamu harus login dulu untuk melihat pesan.');
    window.location.href = 'login.html';
    return;
  }

  currentProfile = await getProfile(currentUser.id);

  renderCurrentUser();
  await renderInbox();
});