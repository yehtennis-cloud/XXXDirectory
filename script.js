const supabase = supabaseJs.createClient(
  https://vrzpvslxmjzzqsfqqfqh.supabase.co,
  sb_publishable_VndS3-F7PgktYmmYjbgfSQ_xHhr4oMx
);


let allVideos = [];
let selectedTags = {};
let currentPage = 1;
const pageSize = 5;

async function loadVideos() {
  const { data, error } = await supabase
    .from("videos")
    .select("*");

  if (error) {
    alert("Error loading videos");
    return;
  }

  allVideos = data;
  renderTags();
  restoreFromURL();
  applyFilters();
}

loadVideos();


document.getElementById("searchInput").oninput = applyFilters;
document.getElementById("sortSelect").onchange = applyFilters;
document.getElementsByName("mode").forEach(r => r.onchange = applyFilters);
document.getElementById("clearBtn").onclick = clearFilters;
document.getElementById("addVideoBtn").onclick = addVideo;

function renderTags() {
  const container = document.getElementById("tag-container");
  container.innerHTML = "";

  const categories = {};

  allVideos.forEach(v => {
    for (const cat in v.tags) {
      categories[cat] ??= new Set();
      v.tags[cat].forEach(t => categories[cat].add(t));
    }
  });

  for (const cat in categories) {
    const h = document.createElement("h3");
    h.innerText = cat;
    container.appendChild(h);

    categories[cat].forEach(tag => {
      const span = document.createElement("span");
      span.className = "tag";
      span.innerText = tag;
      span.onclick = () => toggleTag(cat, tag, span);
      container.appendChild(span);
    });
  }
}

function toggleTag(category, tag, el) {
  selectedTags[category] ??= new Set();

  if (selectedTags[category].has(tag)) {
    selectedTags[category].delete(tag);
    el.style.backgroundColor = "#e0e0e0";
  } else {
    selectedTags[category].add(tag);
    el.style.backgroundColor = "#a0a0a0";
  }
  currentPage = 1;
  applyFilters();
}

function applyFilters() {
  let results = [...allVideos];

  const query = searchInput.value.toLowerCase();
  if (query) {
    results = results.filter(v =>
      v.title.toLowerCase().includes(query)
    );
  }

  const mode = document.querySelector("input[name='mode']:checked").value;
  for (const cat in selectedTags) {
    const tags = [...selectedTags[cat]];
    if (tags.length === 0) continue;

    results = results.filter(v => {
      const videoTags = v.tags[cat] || [];
      return mode === "AND"
        ? tags.every(t => videoTags.includes(t))
        : tags.some(t => videoTags.includes(t));
    });
  }

  const sort = sortSelect.value;
  results.sort(sort === "alphabetical"
    ? (a, b) => a.title.localeCompare(b.title)
    : (a, b) => new Date(b.date) - new Date(a.date)
  );

  updateURL();
  renderPaginated(results);
}

function renderPaginated(videos) {
  const start = (currentPage - 1) * pageSize;
  const pageVideos = videos.slice(start, start + pageSize);

  renderVideos(pageVideos);
  renderPagination(videos.length);
}

function renderVideos(videos) {
  video_container.innerHTML = "";
  videos.forEach(v => {
    const div = document.createElement("div");
    div.className = "video";
    div.innerHTML = `
      <img src="${v.thumbnail}" width="200"><br>
      <strong>${v.title}</strong><br>
      <a href="${v.url}" target="_blank">Watch</a><br>
      ${v.date}
    `;
    video_container.appendChild(div);
  });
}

function renderPagination(total) {
  pagination.innerHTML = "";
  const pages = Math.ceil(total / pageSize);
  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.onclick = () => {
      currentPage = i;
      applyFilters();
    };
    pagination.appendChild(btn);
  }
}

function clearFilters() {
  selectedTags = {};
  searchInput.value = "";
  currentPage = 1;
  applyFilters();
}

function updateURL() {
  const params = new URLSearchParams();
  params.set("q", searchInput.value);
  params.set("page", currentPage);

  for (const cat in selectedTags) {
    params.set(cat, [...selectedTags[cat]].join(","));
  }

  history.replaceState(null, "", "?" + params.toString());
}

function restoreFromURL() {
  const params = new URLSearchParams(window.location.search);
  searchInput.value = params.get("q") || "";
  currentPage = Number(params.get("page")) || 1;

  params.forEach((v, k) => {
    if (k !== "q" && k !== "page") {
      selectedTags[k] = new Set(v.split(","));
    }
  });
}

async function addVideo() {
  try {
    const submission = {
      title: newTitle.value,
      url: newUrl.value,
      thumbnail: newThumbnail.value,
      date: newDate.value,
      tags: JSON.parse(newTags.value)
    };

    const { error } = await supabase
      .from("submissions")
      .insert(submission);

    if (error) throw error;

    alert("Submission received and awaiting approval.");
    newTitle.value = "";
    newUrl.value = "";
    newThumbnail.value = "";
    newDate.value = "";
    newTags.value = "";

  } catch {
    alert("Invalid data or JSON");
  }
}
