// ---------------- Supabase Init ----------------
const supabase = Supabase.createClient(
  "https://vrzpvslxmjzzqsfqqfqh.supabase.co",
  "sb_publishable_VndS3-F7PgktYmmYjbgfSQ_xHhr4oMx"
);


// ---------------- Element References ----------------
const video_container = document.getElementById("video-container");
const pagination = document.getElementById("pagination");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const submission_list = document.getElementById("submission-list");

const newTitle = document.getElementById("newTitle");
const newUrl = document.getElementById("newUrl");
const newThumbnail = document.getElementById("newThumbnail");
const newDate = document.getElementById("newDate");
const newTags = document.getElementById("newTags");

const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminLogin = document.getElementById("admin-login");
const adminPanel = document.getElementById("admin-panel");

// ---------------- Global Variables ----------------
let allVideos = [];
let selectedTags = {};
let currentPage = 1;
const pageSize = 5;

// ---------------- Load approved videos ----------------
async function loadVideos() {
  const { data, error } = await supabase
    .from("videos")
    .select("*");

  if (error) return console.error("Error loading videos:", error);
  allVideos = data;
  renderTags();
  restoreFromURL();
  applyFilters();
}

// ---------------- Event Listeners ----------------
searchInput.oninput = applyFilters;
sortSelect.onchange = applyFilters;
document.getElementsByName("mode").forEach(r => r.onchange = applyFilters);
document.getElementById("clearBtn").onclick = clearFilters;
document.getElementById("addVideoBtn").onclick = addVideo;

// ---------------- Render Tags ----------------
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
      span.className = "tag" + (selectedTags[cat]?.has(tag) ? " selected" : "");
      span.innerText = tag;
      span.onclick = () => toggleTag(cat, tag, span);
      container.appendChild(span);
    });
  }
}

// ---------------- Tag selection ----------------
function toggleTag(category, tag, el) {
  selectedTags[category] ??= new Set();
  if (selectedTags[category].has(tag)) {
    selectedTags[category].delete(tag);
    el.classList.remove("selected");
  } else {
    selectedTags[category].add(tag);
    el.classList.add("selected");
  }
  currentPage = 1;
  applyFilters();
}

// ---------------- Filtering ----------------
function applyFilters() {
  let results = [...allVideos];
  const query = searchInput.value.toLowerCase();
  if (query) results = results.filter(v => v.title.toLowerCase().includes(query));

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

// ---------------- Pagination & Render ----------------
function renderPaginated(videos) {
  const start = (currentPage - 1) * pageSize;
  renderVideos(videos.slice(start, start + pageSize));
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

// ---------------- Clear filters ----------------
function clearFilters() {
  selectedTags = {};
  searchInput.value = "";
  currentPage = 1;
  applyFilters();
}

// ---------------- URL state ----------------
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
  params.forEach((v,k)=>{
    if(k!=="q"&&k!=="page") selectedTags[k]=new Set(v.split(","));
  });
}

// ---------------- Public video submission ----------------
// ---------------- Public video submission with detailed logging ----------------
async function addVideo() {
  try {
    // Basic required fields check
    if (!newTitle.value || !newUrl.value) {
      return alert("Title and URL are required.");
    }

    // Validate tags JSON
    let parsedTags = {};
    if (newTags.value.trim() !== "") {
      try {
        parsedTags = JSON.parse(newTags.value);
        if (typeof parsedTags !== "object" || Array.isArray(parsedTags)) {
          throw new Error("Tags must be a JSON object with arrays of strings as values.");
        }
      } catch (jsonErr) {
        console.error("JSON parse error:", jsonErr);
        return alert("Invalid Tags JSON. Make sure it's an object, e.g. {\"Category\":[\"tag1\",\"tag2\"]}");
      }
    }

    const submission = {
      title: newTitle.value,
      url: newUrl.value,
      thumbnail: newThumbnail.value || null,
      date: newDate.value || new Date().toISOString().slice(0, 10),
      tags: parsedTags
    };

    // Log what we're about to insert
    console.log("Attempting to insert submission:", submission);

    // Insert into Supabase
    const { data, error } = await supabase.from("submissions").insert(submission).select();

    if (error) {
      console.error("Supabase insert error:", error);
      return alert("Error submitting video: " + error.message);
    }

    console.log("Submission succeeded:", data);

    // Clear form after successful submission
    newTitle.value = "";
    newUrl.value = "";
    newThumbnail.value = "";
    newDate.value = "";
    newTags.value = "";

    alert("Submission received! Awaiting admin approval. Email alert will be sent automatically.");
  } catch (err) {
    console.error("Unexpected error in addVideo():", err);
    alert("Unexpected error: " + err.message);
  }
}


// ---------------- Admin login & panel ----------------
async function login() {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail.value,
      password: adminPassword.value
    });

    if (error) throw error;
    adminLogin.style.display = "none";
    adminPanel.style.display = "block";
    loadSubmissions();
  } catch (err) {
    console.error(err);
    alert("Login failed: " + err.message);
  }
}

// Keep admin logged in if session exists
supabase.auth.onAuthStateChange((event, session)=>{
  if(session){
    adminLogin.style.display="none";
    adminPanel.style.display="block";
    loadSubmissions();
  }
});

// Load pending submissions
async function loadSubmissions() {
  const { data, error } = await supabase.from("submissions").select("*").order("submitted_at",{ascending:false});
  if(error) return console.error("Cannot load submissions:", error);
  submission_list.innerHTML = "";
  data.forEach(s=>{
    const div=document.createElement("div");
    div.innerHTML=`
      <strong>${s.title}</strong><br>
      <a href="${s.url}" target="_blank">Preview</a><br>
      <button onclick="approveSubmission('${s.id}')">Approve</button>
      <button onclick="rejectSubmission('${s.id}')">Reject</button>
      <hr>
    `;
    submission_list.appendChild(div);
  });
}

// Approve submission → move to videos
async function approveSubmission(id){
  try {
    const { data, error } = await supabase.from("submissions").select("*").eq("id",id).single();
    if(error) throw error;

    await supabase.from("videos").insert({
      title: data.title,
      url: data.url,
      thumbnail: data.thumbnail,
      date: data.date,
      tags: data.tags
    });

    await supabase.from("submissions").delete().eq("id",id);
    loadSubmissions();
    loadVideos();
  } catch(err) {
    console.error(err);
    alert("Error approving submission");
  }
}

// Reject submission → delete
async function rejectSubmission(id){
  try {
    await supabase.from("submissions").delete().eq("id",id);
    loadSubmissions();
  } catch(err) {
    console.error(err);
    alert("Error rejecting submission");
  }
}

// ---------------- Load videos initially ----------------
loadVideos();
