// Gobbo landing page: intentionally dependency-free.
document.addEventListener('DOMContentLoaded', () => {
  // In a repository fork, replace the generic GitHub link with your repository URL.
  const sourceLinks = document.querySelectorAll('a[href="https://github.com/"]');
  sourceLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      // Prevent accidentally presenting the GitHub homepage as this project's source.
      event.preventDefault();
      alert('After you create your repository, update this link to your project URL. See README.md.');
    });
  });
});
