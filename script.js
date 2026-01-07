/********************
 * Supabase Init
 ********************/
const supabaseClient = supabase.createClient(
  "https://vrzpvslxmjzzqsfqqfqh.supabase.co",
  "sb_publishable_VndS3-F7PgktYmmYjbgfSQ_xHhr4oMx"
);

/********************
 * DOM References
 ********************/
const videoContainer = document.getElementById("video-container");
const pagination = document.getElementById("pagination");
const tagContainer = document.getElementById("tag-container");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const newTitle = document.getElementById("newTitle");
const newUrl = document.getElementById("newUrl");
const newThumbnail = document.getElementById("newThumbnail");
const newDate = document.getElementById("newDate");
const newTags = document.getElementById("newTags");

const submissionList = document.getElementById("submission-list");
const adminLogin = document.getElementById("admin-login");
const adminPanel = document.getElementById("admin-panel");

/********************
 * State
 ********************/
let allVideos = [];
let selectedTags = {};
let currentPage = 1;
const pageSize = 5;

/********************
 * Load Videos
 ********************/
async function loadVideos() {
  const { data, error } = await supabaseClient
    .from("videos")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  allVideos = data || [];
  renderTags();
  applyFilters();
}

/********************
 * Filters
 ********************/
searchInput.oninput = applyFilters;
sortSelect.onchange = applyFilters;
document.getElementsByName("mode").forEach(r => r.onchange = applyFilters);
document.getElementById("clearBtn").onclick = () => {
  selectedTags = {};
  searchInput.value = "";
  currentPage = 1;
  applyFilters();
};

/********************
 * Tag Rendering
 ********************/
function renderTags() {
  tagContainer.innerHTML = "";
  const categories = {};

  allVideos.forEach(v => {
    for (const cat in v.tags || {}) {
      categories[cat] ??= new Set();
      v.tags[cat].forEach(t => categories[cat].add(t));
    }
  });

  for (const cat in categories) {
    const h = document.createElement("h3");
    h.textContent = cat;
    tagContainer.appendChild(h);

    categories[cat].forEach(tag => {
      const span = document.createElement("span");
      span.textContent = tag;
      span.className = "tag";
      span.onclick = () => {
        selectedTags[cat] ??= new Set();
        selectedTags[cat].has(tag)
          ? selectedTags[cat].delete(tag)
          : selectedTags[cat].add(tag);
        applyFilters();
      };
      tagContainer.appendChild(span);
    });
  }
}

/********************
 * Filtering Logic
 ********************/
function applyFilters() {
  let results = [...allVideos];
  const query = searchInput.value.toLowerCase();

  if (query) {
    results = results.filter(v => v.title.toLowerCase().includes(query));
  }

  const mode = document.querySelector("input[name='mode']:checked").value;

  for (const cat in selectedTags) {
    const tags = [...selectedTags[cat]];
    results = results.filter(v => {
      const vt = v.tags?.[cat] || [];
      return mode === "AND"
        ? tags.every(t => vt.includes(t))
        : tags.some(t => vt.includes(t));
    });
  }

  results.sort(
    sortSelect.value === "alphabetical"
      ? (a, b) => a.title.localeCompare(b.title)
      : (a, b) => new Date(b.date) - new Date(a.date)
  );

  renderPaginated(results);
}

/********************
 * Rendering
 ********************/
function renderPaginated(videos) {
  const start = (currentPage - 1) * pageSize;
  renderVideos(videos.slice(start, start + pageSize));
}

function renderVideos(videos) {
  videoContainer.innerHTML = "";
  videos.forEach(v => {
    const div = document.createElement("div");
    div.innerHTML = `
      <img src="${v.thumbnail || ""}" width="200" />
      <br />
      <strong>${v.title}</strong><br />
      <a href="${v.url}" target="_blank">Watch</a>
    `;
    videoContainer.appendChild(div);
  });
}

/********************
 * Public Submission
 ********************/
document.getElementById("addVideoBtn").onclick = async () => {
  let tags = {};
  try {
    if (newTags.value.trim()) {
      tags = JSON.parse(newTags.value);
    }
  } catch {
    return alert("Invalid JSON in tags field");
  }

  const { error } = await supabaseClient
    .from("submissions")
    .insert({
      title: newTitle.value,
      url: newUrl.value,
      thumbnail: newThumbnail.value,
      date: newDate.value,
      tags
    });

  if (error) {
    console.error(error);
    alert(error.message);
  } else {
    alert("Submission received!");
    newTitle.value = newUrl.value = newThumbnail.value = newDate.value = newTags.value = "";
  }
};

/********************
 * Admin
 ********************/
async function login() {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: adminEmail.value,
    password: adminPassword.value
  });

  if (!error) {
    adminLogin.style.display = "none";
    adminPanel.style.display = "block";
    loadSubmissions();
  }
}

async function loadSubmissions() {
  const { data } = await supabaseClient.from("submissions").select("*");
  submissionList.innerHTML = "";
  data?.forEach(s => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${s.title}</strong><br />
      <button onclick="approve('${s.id}')">Approve</button>
      <button onclick="reject('${s.id}')">Reject</button>
      <hr />
    `;
    submissionList.appendChild(div);
  });
}

async function approve(id) {
  const { data } = await supabaseClient
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  await supabaseClient.from("videos").insert(data);
  await supabaseClient.from("submissions").delete().eq("id", id);
  loadSubmissions();
  loadVideos();
}

async function reject(id) {
  await supabaseClient.from("submissions").delete().eq("id", id);
  loadSubmissions();
}

/********************
 * Init
 ********************/
loadVideos();
