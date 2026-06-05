document.addEventListener('DOMContentLoaded', async () => {
  const chatUserAvatar = document.getElementById('chatUserAvatar');
  const chatUsername = document.getElementById('chatUsername');
  const chatUserDescription = document.getElementById('chatUserDescription');

  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');

  const params = new URLSearchParams(window.location.search);
  const targetUserId = params.get('userId');
  const postId = params.get('postId');

  let currentUser = null;
  let targetProfile = null;
  let realtimeChannel = null;

  if (!targetUserId) {
    alert('Tujuan chat tidak ditemukan.');
    window.location.href = 'index.html';
    return;
  }

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

  function formatTime(dateString) {
    const date = new Date(dateString);

    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function renderHeader() {
    if (!targetProfile) return;

    if (chatUserAvatar) {
      chatUserAvatar.src = targetProfile.avatar_url || 'images/pp-01.png';
    }

    if (chatUsername) {
      chatUsername.textContent = targetProfile.username || 'User';
    }

    if (chatUserDescription) {
      chatUserDescription.textContent =
        targetProfile.bio || 'Description';
    }
  }

  async function getMessages() {
    const { data, error } = await supabaseClient
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Gagal mengambil pesan:', error);
      return [];
    }

    return data || [];
  }

async function markMessagesAsRead() {
  const { error } = await supabaseClient
    .from('messages')
    .update({
      read_at: new Date().toISOString()
    })
    .eq('sender_id', targetUserId)
    .eq('receiver_id', currentUser.id)
    .is('read_at', null);

  if (error) {
    console.error('Gagal menandai pesan sebagai dibaca:', error);
  }
}
  
  function renderMessage(message) {
    const isMine = message.sender_id === currentUser.id;

    const row = document.createElement('div');
    row.className = `message-row ${isMine ? 'sent' : 'received'}`;
    row.dataset.id = message.id;

    row.innerHTML = `
      <div class="message-bubble">
        <p class="message-text">
          ${escapeHTML(message.message)}
        </p>

        <span class="message-time">
          ${formatTime(message.created_at)}
        </span>
      </div>
    `;

    chatMessages.appendChild(row);
  }

  async function renderMessages() {
    if (!chatMessages) return;

    const messages = await getMessages();

    chatMessages.innerHTML = '';

    if (messages.length === 0) {
      chatMessages.innerHTML = `
        <p class="chat-empty">
          Belum ada pesan. Mulai percakapan pertama.
        </p>
      `;
      return;
    }

    messages.forEach(renderMessage);

    scrollToBottom();
  }

  function scrollToBottom() {
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    });
  }

  function escapeHTML(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function sendMessage(text) {
    const payload = {
      sender_id: currentUser.id,
      receiver_id: targetUserId,
      post_id: postId || null,
      message: text
    };

    const { error } = await supabaseClient
      .from('messages')
      .insert(payload);

    if (error) {
      console.error('Gagal mengirim pesan:', error);
      alert('Gagal mengirim pesan.');
      return false;
    }

    return true;
  }

  function setupRealtime() {
    realtimeChannel = supabaseClient
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const message = payload.new;

          const isRelated =
            (
              message.sender_id === currentUser.id &&
              message.receiver_id === targetUserId
            ) ||
            (
              message.sender_id === targetUserId &&
              message.receiver_id === currentUser.id
            );

          if (!isRelated) return;

          const existingMessage = document.querySelector(
            `.message-row[data-id="${message.id}"]`
          );

          if (existingMessage) return;

          const emptyText = document.querySelector('.chat-empty');

          if (emptyText) {
            chatMessages.innerHTML = '';
          }

          renderMessage(message);
           if (
          message.sender_id === targetUserId &&
          message.receiver_id === currentUser.id
        ) {
          await markMessagesAsRead();
        }
          scrollToBottom();
        }
        
      )
      .subscribe();
  }


  if (chatForm) {
    chatForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const text = messageInput.value.trim();

      if (!text) return;

      const submitBtn = chatForm.querySelector('button[type="submit"]');

      if (submitBtn) {
        submitBtn.disabled = true;
      }

      const success = await sendMessage(text);

      if (success) {
        messageInput.value = '';
        await renderMessages();
      }

      if (submitBtn) {
        submitBtn.disabled = false;
      }

      messageInput.focus();
    });
  }

  currentUser = await getCurrentUser();

  if (!currentUser) {
    alert('Kamu harus login dulu untuk menggunakan chat.');
    window.location.href = 'login.html';
    return;
  }

  if (currentUser.id === targetUserId) {
    alert('Kamu tidak bisa chat diri sendiri.');
    window.location.href = 'profile.html';
    return;
  }

  targetProfile = await getProfile(targetUserId);

  if (!targetProfile) {
    alert('User tujuan tidak ditemukan.');
    window.location.href = 'index.html';
    return;
  }

  renderHeader();
await markMessagesAsRead();
await renderMessages();
setupRealtime();

  window.addEventListener('beforeunload', () => {
    if (realtimeChannel) {
      supabaseClient.removeChannel(realtimeChannel);
    }
  });
});