const serverUrl = 'https://YOUR_RENDER_URL'; // ここを実際のRender URLに変更

document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  try {
    const res = await fetch(`${serverUrl}/register`, {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (res.ok) {
      document.getElementById('register-result').innerText = '登録成功！';
      form.reset();
    } else {
      document.getElementById('register-result').innerText = result.error || '登録に失敗しました。';
    }
  } catch (err) {
    console.error(err);
    document.getElementById('register-result').innerText = 'エラーが発生しました。';
  }
});

async function search() {
  const query = document.getElementById('search-query').value;
  const res = await fetch(`${serverUrl}/search?q=${encodeURIComponent(query)}`);
  const results = await res.json();

  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '';

  if (results.length === 0) {
    resultsDiv.innerHTML = '<p>検索結果がありません。</p>';
    return;
  }

  results.forEach(entry => {
    const div = document.createElement('div');
    div.style.border = '1px solid #ccc';
    div.style.marginBottom = '10px';
    div.style.padding = '10px';

    div.innerHTML = `
      <strong>${entry.artist}</strong> - ${entry.album}<br>
      ${entry.image ? `<img src="${entry.image}" width="150">` : '<i>画像なし</i>'}
    `;
    resultsDiv.appendChild(div);
  });
}
