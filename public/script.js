async function addRecord() {
    const artist = document.getElementById('artist').value;
    const album = document.getElementById('album').value;
    const res = await fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist, album })
    });
    alert(await res.text());
    loadRecords();
  }
  
  async function loadRecords() {
    const res = await fetch('/list');
    const records = await res.json();
    const list = document.getElementById('recordList');
    list.innerHTML = '';
    records.forEach(r => {
      const li = document.createElement('li');
      li.textContent = `${r.artist} - ${r.album}`;
      const del = document.createElement('button');
      del.textContent = '削除';
      del.onclick = () => deleteRecord(r.id);
      li.appendChild(del);
      list.appendChild(li);
    });
  }
  
  async function deleteRecord(id) {
    await fetch(`/delete/${id}`, { method: 'DELETE' });
    loadRecords();
  }
  
  loadRecords();
  