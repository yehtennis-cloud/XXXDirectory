let allVideos = [];
let selectedTags = new Set();

fetch("videos.json")
  .then(response => response.json())
  .then(data => {
    allVideos = data;
    renderTags();
    applyFilters();
  });

document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("sortSelect").addEventListener("change", applyFilters);
document.querySelectorAll("input[name='mode']").forEach(r =>
  r.addEventListener("change", applyFilters)
);

function renderTags() {
  const tagContainer = document.getElementById("tag-container");
  tagContainer.innerHTML = "";

  const tags = new Set();
  allVideos.forEach(v => v.tags.forEach(t => tags.add(t)));

  tags.forEach(tag => {
    const span = document.createElement("span");
    span.className = "tag";
    span.innerText = tag;
    span.onclick = () => toggleTag(tag, span);
    tagContainer.appendChild(span);
  });
}

function toggleTag(tag, element) {
  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
    element.style.backgroundColor = "#e0e0e0";
  } else {
    selectedTags.add(tag);
    element.style.backgroundColor = "#a0a0a0";
  }
  applyFilters();
}

function applyFilters() {
  let filtered = [...allVideos];

  // SEARCH
  const query = document.getElementById("searchInput").value.toLowerCase();
  if (query) {
    filtered = filtered.filter(v =>
      v.title.toLowerCase().includes(query) ||
      v.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  // TAG FILTERING
  const mode = document.querySelector("input[name='mode']:checked").value;
  if (selectedTags.size > 0) {
    filtered = filtered.filter(v => {
      if (mode === "AND") {
        return [...selectedTags].every(t => v.tags.includes(t));
      } else {
        return [...selectedTags].some(t => v.tags.includes(t));
      }
    });
  }

  // SORTING
  const sort = document.getElementById("sortSelect").value;
  if (sort === "alphabetical") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  renderVideos(filtered);
}

function renderVideos(videos) {
  const container = document.getElementById("video-container");
  container.innerHTML = "";

  videos.forEach(v => {
    const div = document.createElement("div");
    div.className = "video";
    div.innerHTML = `
      <img src="${v.thumbnail}" width="200"><br>
      <strong>${v.title}</strong><br>
      <a href="${v.url}" target="_blank">Watch video</a><br>
      <small>${v.date}</small><br>
      Tags: ${v.tags.join(", ")}
    `;
    container.appendChild(div);
  });
}
