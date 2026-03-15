const languageData = [
  { name: 'JavaScript', percent: 41.1, color: '#f1e05a' },
  { name: 'HTML', percent: 33.0, color: '#e34c26' },
  { name: 'CSS', percent: 25.9, color: '#563d7c' }
];

function renderLanguageStats(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const items = languageData.map(lang => `
    <div class="lang-item">
      <div class="lang-header">
        <span class="lang-dot" style="background:${lang.color};" aria-hidden="true"></span>
        <span class="lang-name">${lang.name}</span>
        <span class="lang-percent">${lang.percent}%</span>
      </div>
      <div class="lang-track" role="progressbar" aria-label="${lang.name}" aria-valuenow="${lang.percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="lang-fill" data-width="${lang.percent}" style="background:${lang.color};"></div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="lang-stats">
      <div class="lang-stats-list">${items}</div>
    </div>
  `;

  requestAnimationFrame(() => {
    container.querySelectorAll('.lang-fill').forEach(el => {
      el.style.width = el.dataset.width + '%';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderLanguageStats('language-stats');
});
