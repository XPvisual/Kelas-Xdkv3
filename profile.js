document.addEventListener('DOMContentLoaded', async () => {
  const profileAvatar = document.getElementById('profileAvatar');
  const profileUsername = document.getElementById('profileUsername');
  const profileBio = document.getElementById('profileBio');
  const profileInstagram = document.getElementById('profileInstagram');
  const myWorkList = document.getElementById('myWorkList');
  const worksTitle = document.getElementById('worksTitle');
  
  const logoutBtn = document.getElementById('logoutBtn');
  const editProfileBtn =
    document.getElementById('editProfileBtn') ||
    document.querySelector('.edit-profile-btn') ||
    document.querySelector('.profile-edit-btn');

  const editProfileForm =
    document.getElementById('editProfileForm') ||
    document.getElementById('profileEditForm');

  function getInput(...ids) {
    for (const id of ids) {
      const input = document.getElementById(id);
      if (input) return input;
    }

    return null;
  }

  function formatDate(dateString) {
    if (!dateString) return '';

    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function cleanInstagram(rawInstagram) {
    return rawInstagram
      .trim()
      .replace('https://www.instagram.com/', '')
      .replace('https://instagram.com/', '')
      .replace('www.instagram.com/', '')
      .replace('instagram.com/', '')
      .replace('@', '')
      .replaceAll('/', '');
  }

  async function getAuthUser() {
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
      console.error('Gagal ambil profile:', error);
      return null;
    }

    return data;
  }

  function saveCurrentUserToLocalStorage(profile, authUser) {
    const currentUser = {
      id: authUser.id,
      email: authUser.email,
      username: profile.username || 'User',
      avatar: profile.avatar_url || 'images/pp-01.png',
      bio: profile.bio || '',
      instagram: profile.instagram || '',
      role: profile.role || 'user'
    };

    localStorage.setItem('xdkv3_currentUser', JSON.stringify(currentUser));
  }

  const params = new URLSearchParams(window.location.search);
const viewedUserId = params.get('userId');

const authUser = await getAuthUser();

if (!viewedUserId && !authUser) {
  alert('Kamu harus login dulu.');
  window.location.href = 'login.html';
  return;
}

const profileIdToView = viewedUserId || authUser.id;

const profileUser = await getProfile(profileIdToView);
const currentProfile = authUser ? await getProfile(authUser.id) : null;

if (!profileUser) {
  alert('Profile tidak ditemukan.');
  window.location.href = 'index.html';
  return;
}

if (currentProfile && authUser) {
  saveCurrentUserToLocalStorage(currentProfile, authUser);
}

const isOwnProfile =
  authUser && String(authUser.id) === String(profileUser.id);

const profileChatBtn = document.getElementById('profileChatBtn');

if (profileChatBtn) {
  if (isOwnProfile) {
    profileChatBtn.style.display = 'none';
  } else {
    profileChatBtn.href = `chat.html?userId=${profileUser.id}`;
  }
}

  if (worksTitle) {
  worksTitle.textContent = isOwnProfile
    ? 'My Works'
    : `${profileUser.username || 'User'}'s Works`;
}
  if (!isOwnProfile) {
    if (editProfileBtn) editProfileBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();

      localStorage.removeItem('xdkv3_currentUser');

      window.location.href = 'index.html';
    });
  }

  function renderProfileData() {
    if (profileAvatar) {
      profileAvatar.src = profileUser.avatar_url || 'images/pp-01.png';
    }

    if (profileUsername) {
      profileUsername.textContent = profileUser.username || 'User';
    }

    if (profileBio) {
      profileBio.textContent = profileUser.bio || 'Belum ada bio.';
    }

    if (profileInstagram) {
      const instagram = profileUser.instagram || '';

      if (instagram.trim()) {
        const clean = cleanInstagram(instagram);

        profileInstagram.textContent = `@${clean}`;
        profileInstagram.href = `https://www.instagram.com/${clean}`;
        profileInstagram.target = '_blank';
        profileInstagram.rel = 'noopener noreferrer';
      } else {
        profileInstagram.textContent = 'Belum ada Instagram.';
        profileInstagram.href = '#';
      }
    }
  }

  async function renderMyWorks() {
    if (!myWorkList) return;

    const { data: posts, error } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('user_id', profileUser.id)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });

    if (error) {
      console.error('Gagal ambil karya profile:', error);
      myWorkList.innerHTML = `<p>Gagal mengambil karya.</p>`;
      return;
    }

    myWorkList.innerHTML = '';

    if (!posts || posts.length === 0) {
      myWorkList.innerHTML = `
        <div class="empty-work">
          <h3>Belum ada karya.</h3>
          <p>Karya yang sudah di-approve akan tampil di sini.</p>
        </div>
      `;
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement('article');
      card.className = 'work-card';

      const imageClass =
        post.aspect_mode === 'original'
          ? 'aspect-original'
          : 'aspect-square';

      card.innerHTML = `
        <div class="work-info">
          <div class="work-meta">
            <p>Type : ${post.post_type}</p>
            <p>Category : ${post.category}</p>
          </div>

          <p class="work-description">
            ${post.description || ''}
          </p>

          <span class="work-date">
            ${formatDate(post.approved_at || post.created_at)}
          </span>
        </div>

        <div class="work-image ${imageClass}">
          <img src="${post.image_url}" alt="Karya ${profileUser.username}">

          ${isOwnProfile ? `
            <button
              type="button"
              class="delete-work-btn"
              data-id="${post.id}"
              data-path="${post.image_path || ''}"
              title="Hapus postingan"
              aria-label="Hapus postingan"
            >
              🗑
            </button>
          ` : ''}
        </div>
      `;

      myWorkList.appendChild(card);
    });
  }

  async function deleteMyPost(postId, imagePath) {
    if (!authUser) {
  alert('Kamu harus login dulu.');
  return;
}

    const confirmDelete = confirm(
      'Hapus karya ini? Postingan yang dihapus tidak akan tampil lagi di profile dan halaman utama.'
    );
    

    if (!confirmDelete) return;

    const { error: deletePostError } = await supabaseClient
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', authUser.id);

    if (deletePostError) {
      console.error(deletePostError);
      alert('Gagal menghapus postingan.');
      return;
    }

    if (imagePath) {
      await supabaseClient.storage
        .from('artworks')
        .remove([imagePath]);
    }

    alert('Postingan berhasil dihapus.');
    await renderMyWorks();
  }

  if (myWorkList && isOwnProfile) {
    myWorkList.addEventListener('click', async (event) => {
      const deleteBtn = event.target.closest('.delete-work-btn');

      if (!deleteBtn) return;

      const postId = deleteBtn.dataset.id;
      const imagePath = deleteBtn.dataset.path;

      await deleteMyPost(postId, imagePath);
    });
  }

  renderProfileData();
  await renderMyWorks();

  if (editProfileForm) {
    const usernameInput = getInput(
      'editUsername',
      'profileUsernameInput',
      'usernameInput',
      'username'
    );

    const bioInput = getInput(
      'editBio',
      'profileBioInput',
      'bioInput',
      'bio'
    );

    const instagramInput = getInput(
      'editInstagram',
      'profileInstagramInput',
      'instagramInput',
      'instagram'
    );

    const avatarInput = getInput(
      'editAvatar',
      'profileAvatarInput',
      'avatarInput',
      'avatar'
    );

    const editAvatarPreview =
  document.getElementById('editAvatarPreview') ||
  document.getElementById('profileAvatar');

if (editAvatarPreview && currentProfile?.avatar_url) {
  editAvatarPreview.src = currentProfile.avatar_url;
}

if (avatarInput && editAvatarPreview) {
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];

    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    editAvatarPreview.src = previewUrl;
  });
}

    if (usernameInput) usernameInput.value = currentProfile?.username || '';
    if (bioInput) bioInput.value = currentProfile?.bio || '';
    if (instagramInput) instagramInput.value = currentProfile?.instagram || '';

    const editPreviewUsername = document.getElementById('editPreviewUsername');
const editPreviewBio = document.getElementById('editPreviewBio');
const editPreviewInstagram = document.getElementById('editPreviewInstagram');

function updateEditPreview() {
  if (editPreviewUsername && usernameInput) {
    editPreviewUsername.textContent =
      usernameInput.value.trim() || 'User';
  }

  if (editPreviewBio && bioInput) {
    editPreviewBio.textContent =
      bioInput.value.trim() || 'Belum ada bio.';
  }

  if (editPreviewInstagram && instagramInput) {
    const instagram = instagramInput.value
      .trim()
      .replace('@', '')
      .replace('https://www.instagram.com/', '')
      .replace('https://instagram.com/', '')
      .replace('www.instagram.com/', '')
      .replace('instagram.com/', '')
      .replaceAll('/', '');

    editPreviewInstagram.textContent =
      instagram ? `IG : @${instagram}` : 'IG : -';
  }
}

updateEditPreview();

if (usernameInput) {
  usernameInput.addEventListener('input', updateEditPreview);
}

if (bioInput) {
  bioInput.addEventListener('input', updateEditPreview);
}

if (instagramInput) {
  instagramInput.addEventListener('input', updateEditPreview);
}

    editProfileForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const newUsername = usernameInput ? usernameInput.value.trim() : '';
      const newBio = bioInput ? bioInput.value.trim() : '';
      const newInstagram = instagramInput ? instagramInput.value.trim() : '';

      if (!newUsername) {
        alert('Username tidak boleh kosong.');
        return;
      }

      let avatarUrl = currentProfile?.avatar_url || 'images/pp-01.png';

      if (avatarInput && avatarInput.files && avatarInput.files[0]) {
  const avatarFile = avatarInput.files[0];

  const fileExt = avatarFile.name.split('.').pop();
  const filePath = `${authUser.id}/avatar-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from('avatars')
    .upload(filePath, avatarFile, {
      contentType: avatarFile.type,
      upsert: true
    });

  if (uploadError) {
    console.error(uploadError);
    alert('Gagal upload avatar.');
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from('avatars')
    .getPublicUrl(filePath);

  avatarUrl = publicUrlData.publicUrl;
}

      const { data: updatedProfile, error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          username: newUsername,
          bio: newBio,
          instagram: newInstagram,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id)
        .select()
        .single();

      if (updateError) {
        console.error(updateError);
        alert('Gagal menyimpan profile.');
        return;
      }

      saveCurrentUserToLocalStorage(updatedProfile, authUser);

      alert('Profile berhasil disimpan.');
      window.location.href = 'profile.html';
    });
  }
});
