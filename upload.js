/* ============================================
   UPLOAD PAGE INTERACTION
============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const customSelect = document.querySelector('.custom-select');
  const selectTrigger = document.querySelector('.select-trigger');
  const selectedText = document.querySelector('.select-trigger span:first-child');
  const optionButtons = document.querySelectorAll('.select-options button');

  const postTypeButtons = document.querySelectorAll('.post-type-btn');
  const aspectButtons = document.querySelectorAll('.aspect-btn');

  const fileInput = document.getElementById('artworkFile');
  const uploadEmpty = document.querySelector('.upload-empty');
  const uploadPreview = document.querySelector('.upload-preview');
  const uploadPreviewImg = document.querySelector('.upload-preview img');

  const postPreviewImage = document.getElementById('postPreviewImage');
  const previewCategory = document.getElementById('previewCategory');
  const previewPostType = document.getElementById('previewPostType');
  const previewPostImg = document.getElementById('previewPostImg');
  const previewPlaceholderText = document.getElementById('previewPlaceholderText');

  const descriptionInput = document.getElementById('description');
  const previewDescription = document.getElementById('previewDescription');
  const previewStatus = document.getElementById('previewStatus');
  const submitBtn = document.getElementById('submitReviewBtn');

  const previewName = document.getElementById('previewName');
  const previewAvatar = document.getElementById('previewAvatar');

  function updateAspectPreview() {
    if (!postPreviewImage) return;

    postPreviewImage.classList.remove('aspect-square', 'aspect-original');

    if (selectedAspect === 'square') {
      postPreviewImage.classList.add('aspect-square');
    }

    if (selectedAspect === 'original') {
      postPreviewImage.classList.add('aspect-original');
    }
  }


  const CURRENT_USER_KEY = 'xdkv3_currentUser';

  function getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
  }

  const currentUser = getCurrentUser();

  if (!currentUser) {
    alert('Kamu harus login dulu sebelum upload.');
    window.location.href = 'login.html';
    return;
  }

  if (previewName) {
  previewName.textContent = currentUser.username || 'Nama akun';
}

  if (previewAvatar && currentUser.avatar) {
    previewAvatar.src = currentUser.avatar;
  }

  let selectedCategory = selectedText ? selectedText.textContent.trim() : 'Digital art';
  let selectedPostType = '';
  let selectedFile = null;
  let selectedAspect = 'square';

  /* IMAGE RATIO SELECT */
aspectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    aspectButtons.forEach((btn) => {
      btn.classList.remove('active');
    });

    button.classList.add('active');
    selectedAspect = button.dataset.aspect;

    updateAspectPreview();
  });
});

  /* CATEGORY SELECT */
  if (customSelect && selectTrigger && selectedText) {
    selectTrigger.addEventListener('click', (event) => {
      event.stopPropagation();
      customSelect.classList.toggle('open');
    });

    optionButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();

        selectedCategory = button.textContent.trim();
        selectedText.textContent = selectedCategory;

        if (previewCategory) {
          previewCategory.textContent = selectedCategory;
        }

        customSelect.classList.remove('open');
      });
    });

    document.addEventListener('click', (event) => {
      if (!customSelect.contains(event.target)) {
        customSelect.classList.remove('open');
      }
    });
  }


  /* POST TYPE SELECT */
  postTypeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      postTypeButtons.forEach((btn) => {
        btn.classList.remove('active');
      });

      button.classList.add('active');
      selectedPostType = button.textContent.trim();

      if (previewPostType) {
        previewPostType.textContent = selectedPostType;
      }

      updatePreviewStatus();
    });
  });


  /* FILE PREVIEW */
  if (fileInput && uploadPreview && uploadPreviewImg) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];

      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar.');
        fileInput.value = '';
        return;
      }

      selectedFile = file;

      const imageUrl = URL.createObjectURL(file);

      uploadPreviewImg.src = imageUrl;
      uploadPreview.hidden = false;

      if (uploadEmpty) {
        uploadEmpty.hidden = true;
      }

      if (previewPostImg) {
  previewPostImg.src = imageUrl;
  previewPostImg.hidden = false;
}

if (previewPlaceholderText) {
  previewPlaceholderText.hidden = true;
}

if (postPreviewImage) {
  postPreviewImage.classList.add('has-image');
  updateAspectPreview();
}
      updatePreviewStatus();
    });
  }


  /* DESCRIPTION LIVE PREVIEW */
  if (descriptionInput && previewDescription) {
    descriptionInput.addEventListener('input', () => {
      const value = descriptionInput.value.trim();

      previewDescription.textContent =
        value || 'Deskripsi karya akan tampil di sini.';
    });
  }


  function updatePreviewStatus() {
    if (!previewStatus) return;

    if (!selectedFile) {
      previewStatus.textContent = 'Waiting image';
      return;
    }

    if (!selectedPostType) {
      previewStatus.textContent = 'Choose post type';
      return;
    }

    previewStatus.textContent = 'Pending review';
  }


  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

async function getSupabaseUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function compressImageToJpeg(file, maxWidth = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal kompres gambar.'));
              return;
            }

            resolve(blob);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Gagal membaca gambar.'));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

function makeSafeFileName(fileName) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '');
}


  /* SUBMIT FOR REVIEW */
  if (submitBtn) {
  submitBtn.addEventListener('click', async () => {
    console.log('UPLOAD SUBMIT JALAN');

    const supabaseUser = await getSupabaseUser();

    if (!supabaseUser) {
      alert('Kamu harus login dulu sebelum upload karya.');
      window.location.href = 'login.html';
      return;
    }

    const description = descriptionInput ? descriptionInput.value.trim() : '';

    if (!selectedFile) {
      alert('Pilih gambar dulu sebelum submit.');
      return;
    }

    if (!selectedCategory) {
      alert('Pilih kategori karya dulu.');
      return;
    }

    if (!selectedPostType) {
      alert('Pilih post type dulu.');
      return;
    }

    if (!description) {
      alert('Isi deskripsi dulu.');
      return;
    }

    const { count, error: countError } = await supabaseClient
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', supabaseUser.id)
      .eq('status', 'approved');

    if (countError) {
      console.error(countError);
      alert('Gagal mengecek jumlah postingan.');
      return;
    }

    if (count >= 10) {
      alert(
        'Postingan kamu sudah mencapai batas 10 karya. Hapus salah satu karya lama di halaman Profile pada bagian My work sebelum upload karya baru.'
      );
      window.location.href = 'profile.html';
      return;
    }

    let fileToUpload = selectedFile;
    let fileExt = selectedFile.name.split('.').pop();
    let fileName = makeSafeFileName(selectedFile.name);

    if (selectedFile.size > MAX_FILE_SIZE) {
      const wantCompress = confirm(
        'Gambar terlalu besar. Ukuran maksimal 2MB. Kompres otomatis agar bisa diupload?'
      );

      if (!wantCompress) {
        return;
      }

      try {
        const compressedBlob = await compressImageToJpeg(selectedFile);

        if (compressedBlob.size > MAX_FILE_SIZE) {
          alert('Gambar masih lebih dari 2MB setelah dikompres. Coba pakai gambar yang lebih kecil, atau convert menjadi .webp');
          return;
        }

        fileToUpload = compressedBlob;
        fileExt = 'jpg';
        fileName = fileName.replace(/\.[^/.]+$/, '') + '.jpg';
      } catch (error) {
        console.error(error);
        alert('Gagal mengompres gambar.');
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const filePath = `${supabaseUser.id}/${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('artworks')
      .upload(filePath, fileToUpload, {
        contentType: fileExt === 'jpg' || fileExt === 'jpeg'
          ? 'image/jpeg'
          : selectedFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error(uploadError);
      alert('Gagal upload gambar ke storage.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
      return;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('artworks')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabaseClient
      .from('posts')
      .insert({
        user_id: supabaseUser.id,
        image_url: imageUrl,
        image_path: filePath,
        category: selectedCategory,
        post_type: selectedPostType,
        aspect_mode: selectedAspect || 'square',
        description: description,
        status: 'pending',
        is_featured: false
      });

    if (insertError) {
      console.error(insertError);

      await supabaseClient.storage
        .from('artworks')
        .remove([filePath]);

      alert('Gagal mengirim data postingan.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
      return;
    }

    alert('Postingan berhasil dikirim ke admin review.');
    window.location.href = 'profile.html';
  });
}
});
