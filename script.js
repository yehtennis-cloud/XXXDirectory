let allVideos = [];

fetch("videos.json")
  .then(response => response.json())
  .then(data => {
    allVideos = data;
    renderTags();
    renderVideos(allVideos);
  });

function renderTags() {
  const tagContainer = document.getElementById("tag-container");
  const tags = new Set();

  allVideos.forEach(video => {
    video.tags.forEach(tag => tags.add(tag));
  });

  tags.forEach(tag => {
    const span = document.createElement("span");
    span.className = "tag";
    span.innerText = tag;
    span.onclick = () => filterByTag(tag);
    tagContainer.appendChild(span);
  });
}

function renderVideos(videos) {
  const container = document.getElementById("video-container");
  container.innerHTML = "";

  videos.forEach(video => {
    const div = document.createElement("div");
    div.className = "video";
    div.innerHTML = `
      <strong>${video.title}</strong><br>
      <a href="${video.url}" target="_blank">Watch video</a><br>
      Tags: ${video.tags.join(", ")}
    `;
    container.appendChild(div);
  });
}

function filterByTag(tag) {
  const filtered = allVideos.filter(video =>
    video.tags.includes(tag)
  );
  renderVideos(filtered);
}
