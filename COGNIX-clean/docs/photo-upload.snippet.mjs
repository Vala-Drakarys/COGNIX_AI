// Drop-in photo (JPG/JPEG) upload for ANY frontend. Not wired into frontend/ on purpose,
// so your teammates' UI can call it wherever their text boxes are.
//
//   import {attachPhotoUpload} from './photo-upload.snippet.mjs';   // copy it next to their code
//   attachPhotoUpload(document.querySelector('textarea[name="question"]'), 'question');
//   attachPhotoUpload(document.querySelector('textarea[name="attempt"]'),  'attempt');
//   attachPhotoUpload(document.querySelector('#answer-text'),              'answer');
//
// target: 'question' | 'attempt' | 'answer'  (sets the server-side length limit)
// It puts the transcribed text into the box and fires an `input` event, so any
// state the UI keeps for that box (drafts etc.) updates normally. The student
// reviews the text and submits through the usual /api/action flow.
// Call it again after your UI re-renders the box. Only show it when
// /api/profile returns service.configured === true and the profile is not "demo".

export function attachPhotoUpload(field, target, {profile = 'practice', label = '📷 Upload photo (JPG)', maxDimension = 1600} = {}) {
  if (!field || field.dataset.photoAttached) return null;
  field.dataset.photoAttached = '1';

  const wrap = document.createElement('span');
  const button = document.createElement('label');
  const input = document.createElement('input');
  const status = document.createElement('span');

  wrap.className = 'photo-tools';
  wrap.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 12px';
  button.className = 'btn small photo-btn';
  button.style.cursor = 'pointer';
  button.textContent = label;
  input.type = 'file';
  input.accept = 'image/jpeg,.jpg,.jpeg';
  input.hidden = true;
  status.className = 'tiny';
  button.append(input);
  wrap.append(button, status);
  field.insertAdjacentElement('afterend', wrap);

  const say = text => { status.textContent = text; };

  async function toJpegDataUrl(file) {
    let bitmap;
    try { bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'}); }
    catch { bitmap = await createImageBitmap(file); }
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (!(file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name))) return say('Please choose a JPG or JPEG photo.');
    if (file.size > 15 * 1024 * 1024) return say('That photo is too large (15 MB max).');

    say('Reading photo…');
    try {
      const image = await toJpegDataUrl(file);
      const res = await fetch('/api/transcribe?profile=' + profile, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({image, target})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read the photo.');
      field.value = data.text;
      field.dispatchEvent(new Event('input', {bubbles: true}));
      say(data.truncated ? 'Text was shortened to fit. Check it before submitting.'
                         : 'Check the text above, fix anything misread, then submit.');
    } catch (error) {
      say(error.message || 'Could not read the photo.');
    }
  });

  return wrap;
}
